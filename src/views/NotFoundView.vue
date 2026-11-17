<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <section class="nf">
    <el-result icon="info" title="404" sub-title="找不到页面">
      <template #extra>
        <p class="nf__path">
          <code>{{ route.fullPath }}</code>
        </p>
        <el-button type="primary" @click="router.push('/')">回首页</el-button>
      </template>
    </el-result>
  </section>
</template>

<style scoped>
.nf {
  padding: var(--space-10) var(--space-4);
  text-align: center;
}

.nf__path {
  margin: 0 0 var(--space-3);
  color: var(--color-text-muted);
}
</style>
