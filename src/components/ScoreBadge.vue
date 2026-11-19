<!--
  评分徽标（Element Plus 版）。
  规范 2.2.1（二）模块三（3）：0-100 分，颜色分级 绿≥80、黄≥60、红<60。
  分级规则集中在 utils/format.ts 的 scoreLevel，避免各处各写一遍阈值。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { scoreLevel, scoreToPercent } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    /** 后端给的 0-1 之间的分数 */
    score: number | null
    /** 是否显示前缀文字 */
    withLabel?: boolean
    /** 前缀文案 */
    label?: string
  }>(),
  { withLabel: true, label: '相关度' },
)

const percent = computed(() => scoreToPercent(props.score))
const level = computed(() => (percent.value === null ? null : scoreLevel(percent.value)))
const tagType = computed(() => {
  if (level.value === 'high') return 'success'
  if (level.value === 'medium') return 'warning'
  return 'danger'
})
const levelText = computed(() =>
  percent.value === null ? '' : percent.value >= 80 ? '高' : percent.value >= 60 ? '中' : '低',
)
</script>

<template>
  <el-tag
    v-if="percent !== null"
    class="score"
    :class="`score--${level}`"
    :type="tagType"
    effect="light"
    round
    size="small"
    :title="`${label} ${percent} 分（${levelText}）`"
  >
    <span v-if="withLabel" class="score__label">{{ label }}</span>
    <span class="score__value num">{{ percent }}</span>
  </el-tag>
</template>

<style scoped>
.score {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-1);
}

.score__value {
  font-weight: var(--font-weight-bold);
}
</style>
