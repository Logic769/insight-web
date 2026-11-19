/**
 * 单测：文章级语义相关度的展示规则。
 *
 * 绿/黄/红阈值与 ScoreBadge 共用 scoreToPercent/scoreLevel，这里锁定
 * 「≥80 分才算高相关」与「只有高相关才给要素摘要」两条业务口径。
 */
import { describe, expect, it } from 'vitest'
import {
  HIGH_RELEVANCE_FILTER_SCORE,
  highRelevanceSummary,
  isHighRelevance,
} from '@/utils/relevance'

describe('isHighRelevance', () => {
  it('按 0-1 分数判定，换算成百分制后 80 分是绿色高相关下限', () => {
    expect(isHighRelevance(0.8)).toBe(true)
    expect(isHighRelevance(0.79)).toBe(false)
    expect(isHighRelevance(1)).toBe(true)
  })

  it('显示分四舍五入：0.795 起是 80 分高相关，0.794 不是', () => {
    expect(isHighRelevance(0.799)).toBe(true)
    expect(isHighRelevance(0.795)).toBe(true)
    expect(isHighRelevance(0.794)).toBe(false)
  })

  it('下推后端的过滤阈值与显示口径一致，覆盖 0.795–0.799', () => {
    expect(HIGH_RELEVANCE_FILTER_SCORE).toBe(0.795)
    expect(isHighRelevance(HIGH_RELEVANCE_FILTER_SCORE)).toBe(true)
  })

  it('空值不当作高相关', () => {
    expect(isHighRelevance(null)).toBe(false)
    expect(isHighRelevance(undefined)).toBe(false)
    expect(isHighRelevance(Number.NaN)).toBe(false)
  })
})

describe('highRelevanceSummary', () => {
  it('高相关返回去除首尾空白的摘要', () => {
    expect(highRelevanceSummary(0.9, '  截止 2026-11-30，补贴 50 万。  ')).toBe(
      '截止 2026-11-30，补贴 50 万。',
    )
  })

  it('低相关或没有摘要时返回空串', () => {
    expect(highRelevanceSummary(0.5, '一般性政策动态。')).toBe('')
    expect(highRelevanceSummary(0.9, null)).toBe('')
    expect(highRelevanceSummary(0.9, '   ')).toBe('')
  })
})
