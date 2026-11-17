/**
 * HTTP 客户端封装（Axios）。
 *
 * 规范 2.2.1（四）3 要求请求拦截（自动添加 Token）、响应拦截（统一错误处理与跳转）、
 * 请求取消、失败自动重试 2 次、接口请求 loading 自动显示。这里逐条落实。
 *
 * 后端 /v1/* 统一返回 {code, msg, data, meta}。本文件是唯一解包点：
 * api/*.ts 仍然拿到 {data, meta} 形状，调用点不用感知信封。
 */

import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'

export interface ApiError {
  status: number
  message: string
}

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

/** 规范 2.2.1（五）：所有接口需处理超时（默认 10 秒） */
const DEFAULT_TIMEOUT = 10_000
/** 规范：失败自动重试 2 次 */
const DEFAULT_RETRIES = 2
/** 只重试这些状态码：4xx 是请求本身有问题，重试没有意义 */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

/** 由 stores/auth.ts 在登录/登出时写入，避免 http 层依赖 store 造成循环引用 */
let authToken = ''

export function setAuthToken(token: string): void {
  authToken = token
}

/**
 * 全局 loading 计数。
 * 规范要求"接口请求 loading 自动显示"：并发的多个请求只应该让页面转一次，
 * 所以用计数而不是布尔值，归零才算加载结束。
 */
let pendingCount = 0
type PendingListener = (pending: number) => void
const pendingListeners = new Set<PendingListener>()

function notifyPending(): void {
  for (const listener of pendingListeners) listener(pendingCount)
}

export function onPendingChange(listener: PendingListener): () => void {
  pendingListeners.add(listener)
  listener(pendingCount)
  return () => pendingListeners.delete(listener)
}

export function pendingRequests(): number {
  return pendingCount
}

export interface RequestOptions extends Omit<AxiosRequestConfig, 'url' | 'data'> {
  /** 查询参数，会自动拼到 URL 上 */
  params?: Record<string, string | number | boolean | undefined>
  /** 请求体，对象会自动 JSON 序列化 */
  body?: unknown
  /** 超时毫秒数，默认 10 秒（规范 2.2.1（五）） */
  timeout?: number
  /** 失败重试次数，默认 2 次（规范 2.2.1（四）3） */
  retries?: number
  /** 外部取消信号：页面卸载或用户主动取消时传入 */
  signal?: AbortSignal
  /** 是否计入全局 loading（默认计入） */
  trackLoading?: boolean
}

/** 后端统一信封 */
interface Envelope<T> {
  code: number
  msg: string
  data: T
  meta?: Record<string, unknown>
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const client = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT,
})

// 请求拦截：自动注入 Token（未登录时为空，登录页本身不受影响）。
client.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`
  return config
})

function describeStatus(status: number, statusText: string, detail: string): string {
  const hint =
    status === 401
      ? '登录状态已失效，请重新登录'
      : status === 403
        ? '当前账号没有访问该资源的权限'
        : status === 404
          ? '接口或数据不存在'
          : status === 502 || status === 503
            ? '后端服务不可用，请确认 news-insight 已启动（默认 http://127.0.0.1:8020）'
            : `请求失败：${status} ${statusText}`
  return detail ? `${detail}（${hint}）` : hint
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toHttpError(error: unknown, timeout: number): HttpError {
  if (error instanceof HttpError) return error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ msg?: string }>
    if (axiosError.code === 'ERR_CANCELED') return new HttpError(0, '请求已取消')
    if (axiosError.response) {
      const status = axiosError.response.status
      const detail = axiosError.response.data?.msg ?? ''
      return new HttpError(status, describeStatus(status, axiosError.response.statusText, detail))
    }
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return new HttpError(0, `请求超时（${timeout}ms），后端可能未响应`)
    }
    return new HttpError(0, '无法连接后端服务，请确认后端已启动且地址配置正确')
  }
  return new HttpError(0, error instanceof Error ? error.message : '未知网络错误')
}

function isRetryable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const axiosError = error as AxiosError
  if (axiosError.code === 'ERR_CANCELED') return false
  if (axiosError.response) return RETRYABLE_STATUS.has(axiosError.response.status)
  // 网络错误与超时（没有 response）可以重试
  return true
}

function unwrap<T>(response: AxiosResponse<Envelope<T>>): T {
  if (response.status === 204 || response.data === undefined || response.data === null) {
    return undefined as T
  }
  const payload = response.data
  if (typeof payload !== 'object' || typeof payload.code !== 'number') {
    // 非信封响应（仅 /health 等非业务端点会走到这里），原样返回
    return payload as unknown as T
  }
  if (payload.code !== 0) {
    throw new HttpError(response.status, payload.msg || '请求失败')
  }
  return { data: payload.data, meta: payload.meta } as T
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    params,
    body,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    trackLoading = true,
    signal: externalSignal,
    headers,
    ...rest
  } = options

  // POST 不重试：后端的 /v1/analyze、/v1/jobs 都不是幂等的，超时后重发可能多跑一次分析、
  // 多花一次模型调用。读接口重试是安全的，写接口交给用户手动重试。
  const method = (rest.method ?? 'GET').toUpperCase()
  const retryBudget = method === 'GET' || method === 'HEAD' ? retries : 0

  if (trackLoading) {
    pendingCount += 1
    notifyPending()
  }

  try {
    let lastError: HttpError | undefined

    for (let attempt = 0; attempt <= retryBudget; attempt += 1) {
      try {
        const response = await client.request<Envelope<T>>({
          ...rest,
          url: path,
          method,
          params,
          ...(body !== undefined ? { data: body } : {}),
          timeout,
          signal: externalSignal,
          // 只有真的带请求体时才声明 Content-Type：GET 带它会触发不必要的预检
          headers: {
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(headers as Record<string, string> | undefined),
          },
        })
        return unwrap<T>(response)
      } catch (error) {
        if (externalSignal?.aborted) {
          throw new HttpError(0, '请求已取消')
        }
        const httpError = toHttpError(error, timeout)
        if (isRetryable(error) && attempt < retryBudget) {
          lastError = httpError
          await sleep(300 * (attempt + 1))
          continue
        }
        // 401 交给上层（路由守卫 / 登录页）处理跳转，这里不直接跳，
        // 否则一个后台轮询接口失败就会把用户正在看的页面踹回登录页。
        // 但要把"登录已失效"广播出去，让 App 统一清会话并回登录页。
        if (httpError.status === 401 && !path.endsWith('/auth/login')) {
          window.dispatchEvent(new CustomEvent('insight:unauthorized'))
        }
        throw httpError
      }
    }

    throw lastError ?? new HttpError(0, '请求失败')
  } finally {
    if (trackLoading) {
      pendingCount -= 1
      notifyPending()
    }
  }
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
