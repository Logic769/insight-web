<!--
  空状态（Element Plus 版）。
  规范 2.2.1（二）模块三（6）：筛选结果为空时展示友好的空状态与提示文案。
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** 保留原变体语义：error 时标题用错误色 */
    variant?: 'no-data' | 'no-result' | 'error'
  }>(),
  {
    title: '暂无数据',
    description: '试试调整筛选条件，或稍后再来看看。',
    variant: 'no-data',
  },
)
</script>

<template>
  <div class="empty" :class="`empty--${variant}`">
    <el-empty :image-size="120">
      <template #description>
        <p class="empty__title">{{ title }}</p>
        <p v-if="description" class="empty__desc">{{ description }}</p>
      </template>
      <slot name="action" />
    </el-empty>
  </div>
</template>

<style scoped>
.empty {
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.empty__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-h3);
  color: var(--color-text-secondary);
}

.empty__desc {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.empty--error .empty__title {
  color: var(--color-error);
}
</style>
