<!--
  分页控件（Element Plus 版）。
  规范 2.2.1（二）模块三（4）：后端分页，支持切换每页条数（10/20/50）。
  对外 props/events 与原实现一致，调用点不用改。
-->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    page: number
    totalPages: number
    /** 每页条数；不传则不显示切换器 */
    pageSize?: number
    /** 可选的每页条数档位 */
    pageSizeOptions?: readonly number[]
    /** 总条数，用于右侧“共 N 条” */
    total?: number
  }>(),
  {
    pageSize: undefined,
    pageSizeOptions: () => [10, 20, 50],
    total: undefined,
  },
)

const emit = defineEmits<{
  (e: 'update:page', value: number): void
  (e: 'update:pageSize', value: number): void
}>()

const fallbackTotal = computed(() => props.total ?? props.totalPages * (props.pageSize ?? 10))
const layout = computed(() =>
  props.pageSize ? 'total, sizes, prev, pager, next' : 'total, prev, pager, next',
)
const sizes = computed(() => [...props.pageSizeOptions])

function changePage(value: number): void {
  if (value >= 1 && value <= props.totalPages && value !== props.page) emit('update:page', value)
}

function changeSize(value: number): void {
  if (Number.isFinite(value) && value > 0) emit('update:pageSize', value)
}
</script>

<template>
  <nav v-if="totalPages > 1 || pageSize" class="pager" aria-label="分页">
    <span class="pager__summary">第 {{ page }} / {{ totalPages }} 页</span>
    <el-pagination
      background
      :current-page="page"
      :page-size="pageSize ?? 10"
      :page-sizes="sizes"
      :total="fallbackTotal"
      :layout="layout"
      :pager-count="5"
      @current-change="changePage"
      @size-change="changeSize"
    />
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-split);
}

.pager :deep(.el-pagination) {
  width: 100%;
  justify-content: flex-end;
  row-gap: var(--space-2);
}

.pager :deep(.el-pagination__total) {
  margin-right: auto;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}
</style>
