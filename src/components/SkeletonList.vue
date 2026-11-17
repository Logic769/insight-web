<!--
  列表骨架屏（Element Plus 版）。
  规范 2.2.1（二）模块三（7）：数据加载过程中显示骨架屏占位，避免白屏闪烁。
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 占位条数 */
    rows?: number
    /** 保留原参数：兼容旧调用点 */
    withBadge?: boolean
  }>(),
  { rows: 5, withBadge: true },
)
</script>

<template>
  <ul class="skeleton" aria-hidden="true">
    <li v-for="n in rows" :key="n" class="skeleton__item">
      <el-skeleton :rows="2" animated />
    </li>
  </ul>
</template>

<style scoped>
.skeleton {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-3);
}

.skeleton__item {
  padding: var(--space-4);
  border: 1px solid var(--color-split);
  border-radius: var(--radius-card);
  background: var(--color-bg);
}
</style>
