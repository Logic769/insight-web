<script setup lang="ts">
/**
 * 403 无权限页（规范 2.2.1（四）6：无权限路由自动跳转 403 页面）。
 */
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const from = typeof route.query.from === 'string' ? route.query.from : ''
</script>

<template>
  <section class="forbidden">
    <el-result icon="warning" title="403 · 无访问权限">
      <template #sub-title>
        当前账号没有访问该页面的权限<template v-if="from">（{{ from }}）</template>。
      </template>
      <template #extra>
        <el-button @click="router.back()">返回上一页</el-button>
        <el-button type="primary" @click="router.push('/')">回到首页</el-button>
      </template>
    </el-result>
  </section>
</template>

<style scoped>
.forbidden {
  padding: var(--space-10) var(--space-4);
  text-align: center;
}
</style>
