import { http } from './http'
import type { ArticleListItem } from './articles'

/** GET /v1/recommendations 的 data 项：文章列表字段 + 个性化综合分 */
export interface RecommendationItem extends ArticleListItem {
  /** 个性化综合分（0-1），与文章级语义分 relevance_score 不是同一个分数 */
  relevance: number
  /** 画像排序理由；文章级语义理由见 ArticleListItem.relevance_reason */
  profile_reason: string
}

export interface RecommendationPage {
  items: RecommendationItem[]
  personalized: boolean
}

export async function listRecommendations(limit = 10): Promise<RecommendationPage> {
  const payload = await http.get<{
    data: RecommendationItem[]
    meta: { total: number; limit: number; personalized: boolean }
  }>('/v1/recommendations', { params: { limit } })
  return { items: payload.data, personalized: payload.meta.personalized }
}

/** 首页待办：项目申报公告中尚未到期的截止日期 */
export interface TodoItem {
  article_id: string
  title: string
  source: string
  url: string
  published_at: string | null
  category: string | null
  category_confidence: number | null
  deadline: string
  deadline_raw: string | null
  days_left: number
}

export interface TodoPage {
  items: TodoItem[]
  total: number
}

export async function listTodos(limit = 5): Promise<TodoPage> {
  const payload = await http.get<{ data: TodoItem[]; meta?: { total?: number } }>('/v1/todos', {
    params: { limit },
  })
  return { items: payload.data, total: payload.meta?.total ?? payload.data.length }
}
