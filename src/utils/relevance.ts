/**
 * 文章级语义相关度（relevance_score）的展示规则。
 *
 * 规划书要求：相关度按 0-100 分展示，绿≥80 / 黄≥60 / 红<60；
 * 只有高相关公告才展示关键要素摘要。展示档位统一由 utils/format.ts 的
 * scoreLevel 定义（≥80 分为 high），这里不重复维护第二个阈值。
 */
import { scoreLevel, scoreToPercent } from './format'

/**
 * 后端 min_relevance 的过滤阈值。
 *
 * 展示分经过 Math.round(score * 100)：0.795 会显示成 80 分（绿色高相关）。
 * 如果直接把 0.8 下推给后端，0.795–0.799 的文章会在界面上被判为高相关、
 * 却被服务端过滤掉；这里用显示口径的真实下界，保证“看到的”和“筛到的”一致。
 */
export const HIGH_RELEVANCE_FILTER_SCORE = 0.795

export function isHighRelevance(score: number | null | undefined): boolean {
  const percent = scoreToPercent(score)
  return percent !== null && scoreLevel(percent) === 'high'
}

/**
 * 列表接口没有结构化 extractions，只有 relevance_reason（AI 摘要句）。
 * 高相关时把它作为「关键要素摘要」展示；低相关返回空串，避免误导用户。
 */
export function highRelevanceSummary(
  score: number | null | undefined,
  reason: string | null | undefined,
): string {
  const text = (reason ?? '').trim()
  return text && isHighRelevance(score) ? text : ''
}
