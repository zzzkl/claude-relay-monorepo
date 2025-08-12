<template>
  <div class="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
    <!-- 总 API Keys -->
    <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-4 border border-orange-100">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-600">总 API Keys</p>
          <p class="text-xl font-bold text-gray-900">
            {{ loading ? '-' : stats.totalKeys }}
          </p>
        </div>
        <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- 活跃 Keys -->
    <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-4 border border-orange-100">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-600">今日活跃</p>
          <p class="text-xl font-bold text-emerald-600">
            {{ loading ? '-' : stats.activeKeys }}
          </p>
        </div>
        <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- 今日请求 -->
    <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-4 border border-orange-100">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-600">今日请求</p>
          <p class="text-xl font-bold text-orange-600">
            {{ loading ? '-' : formatNumber(stats.todayRequests) }}
          </p>
        </div>
        <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Input Tokens -->
    <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-4 border border-orange-100">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-600">今日 Input</p>
          <p class="text-xl font-bold text-purple-600">
            {{ loading ? '-' : formatNumber(stats.todayInputTokens) }}
          </p>
          <p class="text-xs text-gray-500">tokens</p>
        </div>
        <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Output Tokens -->
    <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-4 border border-orange-100">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-600">今日 Output</p>
          <p class="text-xl font-bold text-teal-600">
            {{ loading ? '-' : formatNumber(stats.todayOutputTokens) }}
          </p>
          <p class="text-xs text-gray-500">tokens</p>
        </div>
        <div class="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ClientKeysOverallStats } from '../../../../shared/types/admin/client-keys'

// Props
interface Props {
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: false,
  refreshInterval: 30000 // 30秒
})

// 状态
const loading = ref(false)
const stats = ref<ClientKeysOverallStats>({
  totalKeys: 0,
  activeKeys: 0,
  todayRequests: 0,
  todayInputTokens: 0,
  todayOutputTokens: 0,
  weeklyTrend: []
})

// 自动刷新定时器
let refreshTimer: NodeJS.Timeout | null = null

// 加载统计数据
const loadStats = async () => {
  loading.value = true
  
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch('/api/admin/client-keys/stats')
    
    if (response.success) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  } finally {
    loading.value = false
  }
}

// 格式化数字
const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

// 设置自动刷新
const setupAutoRefresh = () => {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer = setInterval(() => {
      loadStats()
    }, props.refreshInterval)
  }
}

// 清理定时器
const clearAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 生命周期
onMounted(() => {
  loadStats()
  setupAutoRefresh()
})

onUnmounted(() => {
  clearAutoRefresh()
})

// 暴露方法供父组件调用
defineExpose({
  refresh: loadStats
})
</script>