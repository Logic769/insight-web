import { afterEach, describe, expect, it, vi } from 'vitest'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('axios', () => {
  const instance = {
    request: requestMock,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  const isAxiosError = (error: unknown): boolean =>
    typeof error === 'object' &&
    error !== null &&
    (error as { isAxiosError?: boolean }).isAxiosError === true
  return {
    default: { create: vi.fn(() => instance), isAxiosError },
    isAxiosError,
  }
})

import { http, HttpError, pendingRequests, request } from '@/api/http'

function okEnvelope(data: unknown, meta?: Record<string, unknown>) {
  return {
    status: 200,
    statusText: 'OK',
    headers: {},
    data: { code: 0, msg: 'ok', data, ...(meta ? { meta } : {}) },
  }
}

function failedResponse(status: number, msg: string) {
  return {
    isAxiosError: true,
    response: { status, statusText: 'ERROR', headers: {}, data: { code: 50001, msg } },
  }
}

describe('http 重试策略', () => {
  afterEach(() => {
    requestMock.mockReset()
  })

  it('GET 遇到 503 会重试两次，共请求三次', async () => {
    requestMock.mockRejectedValue(failedResponse(503, '服务忙'))

    await expect(http.get('/v1/tags', { retries: 2 })).rejects.toBeInstanceOf(HttpError)
    expect(requestMock).toHaveBeenCalledTimes(3)
  })

  it('POST 默认不重试：非幂等写接口重发会多跑一次分析', async () => {
    requestMock.mockRejectedValue(failedResponse(503, '服务忙'))

    await expect(http.post('/v1/analyze', { limit: 1 })).rejects.toBeInstanceOf(HttpError)
    expect(requestMock).toHaveBeenCalledTimes(1)
  })

  it('POST 传了 retries 也不重试', async () => {
    requestMock.mockRejectedValue(failedResponse(502, '服务忙'))

    await expect(http.post('/v1/jobs', {}, { retries: 5 })).rejects.toBeInstanceOf(HttpError)
    expect(requestMock).toHaveBeenCalledTimes(1)
  })

  it('401 不重试，并提示登录状态已失效', async () => {
    requestMock.mockRejectedValue(failedResponse(401, ''))

    await expect(http.get('/v1/articles')).rejects.toMatchObject({ status: 401 })
    expect(requestMock).toHaveBeenCalledTimes(1)
    await expect(http.get('/v1/articles')).rejects.toThrow(/登录状态已失效/)
  })

  it('GET 成功时解包信封，并在结束后把 loading 计数归零', async () => {
    requestMock.mockResolvedValue(okEnvelope([{ id: 'a' }]))

    const result = await request<{ data: { id: string }[] }>('/v1/categories')
    expect(result.data[0].id).toBe('a')
    expect(pendingRequests()).toBe(0)
  })

  it('HTTP 200 但业务码非 0 时抛 HttpError', async () => {
    requestMock.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { code: 42201, msg: '参数校验失败', data: null },
    })

    await expect(http.get('/v1/articles')).rejects.toMatchObject({
      status: 200,
      message: '参数校验失败',
    })
  })

  it('外部取消抛 HttpError(0) 且不再重试', async () => {
    const controller = new AbortController()
    controller.abort()
    requestMock.mockRejectedValue({ isAxiosError: true, code: 'ERR_CANCELED' })

    await expect(http.get('/v1/tags', { signal: controller.signal })).rejects.toMatchObject({
      status: 0,
      message: '请求已取消',
    })
    expect(requestMock).toHaveBeenCalledTimes(1)
  })
})
