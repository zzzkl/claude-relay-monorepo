<template>
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-orange-100">
    <div class="mb-6">
      <!-- 标题和控制栏 -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 class="text-xl font-bold text-gray-900">API Key 用量排行</h3>
        
        <div class="flex flex-wrap gap-3">
          <!-- 指标选择 -->
          <select 
            v-model="selectedMetric"
            @change="handleMetricChange"
            class="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="requests">请求次数</option>
            <option value="input_tokens">Input Tokens</option>
            <option value="output_tokens">Output Tokens</option>
            <option value="total_tokens">总 Tokens</option>
          </select>
          
          <!-- 时间范围选择 -->
          <select 
            v-model="selectedPeriod"
            class="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="today">今日</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="all">全部</option>
          </select>
          
          <!-- 刷新按钮 -->
          <button
            @click="loadRankingData"
            :disabled="loading"
            class="px-4 py-2 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors disabled:opacity-50"
          >
            <svg v-if="!loading" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <svg v-else class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 图表容器 -->
    <div v-if="!loading && chartData.length > 0" class="w-full h-96">
      <ClientOnly>
        <EChartsWrapper 
          :option="chartOption" 
          height="384px"
          :auto-resize="true"
          @click="handleChartClick"
        />
        <template #fallback>
          <div class="flex justify-center items-center h-96">
            <div class="text-center">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              <p class="mt-2 text-gray-600">加载图表中...</p>
            </div>
          </div>
        </template>
      </ClientOnly>
    </div>
    
    <!-- 加载状态 -->
    <div v-else-if="loading" class="flex justify-center items-center h-96">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        <p class="mt-2 text-gray-600">加载中...</p>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="flex flex-col items-center justify-center h-96 text-gray-500">
      <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p class="text-lg">暂无数据</p>
      <p class="text-sm mt-1">选择的时间范围内没有使用记录</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { ClientKeyRankingItem } from '../../../../shared/types/admin/client-keys'
import EChartsWrapper from './EChartsWrapper.client.vue'

// Props
interface Props {
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: false,
  refreshInterval: 30000 // 30秒
})

// Emits
const emit = defineEmits<{
  keyClick: [keyId: string]
}>()

// 状态
const loading = ref(false)
const chartData = ref<ClientKeyRankingItem[]>([])
const selectedMetric = ref<'requests' | 'input_tokens' | 'output_tokens' | 'total_tokens'>('requests')
const selectedPeriod = ref<'today' | 'week' | 'month' | 'all'>('all')

// 自动刷新定时器
let refreshTimer: NodeJS.Timeout | null = null

// 图表配置
const chartOption = computed(() => {
  const metricLabels = {
    requests: '请求次数',
    input_tokens: 'Input Tokens',
    output_tokens: 'Output Tokens',
    total_tokens: '总 Tokens'
  }
  
  const data = chartData.value.slice(0, 10) // 只显示前10个
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const item = data[params[0].dataIndex]
        if (!item) return ''
        return `
          <div class="p-2">
            ${item.description ? `<div class="font-bold">${item.description}</div>` : ''}
            <div class="text-sm ${item.description ? 'text-gray-600' : 'font-bold'}">${item.keyPreview}</div>
            <div class="mt-2">
              <div class="font-semibold">${metricLabels[selectedMetric.value]}: ${formatNumber(item.value)}</div>
              <div class="text-sm text-gray-600">请求次数: ${formatNumber(item.requests)}</div>
              <div class="text-sm text-gray-600">Input: ${formatNumber(item.inputTokens)} tokens</div>
              <div class="text-sm text-gray-600">Output: ${formatNumber(item.outputTokens)} tokens</div>
            </div>
          </div>
        `
      }
    },
    grid: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 150,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatNumber(value)
      }
    },
    yAxis: {
      type: 'category',
      data: data.map(item => item.description || item.keyPreview),
      inverse: true,
      axisLabel: {
        width: 120,
        overflow: 'truncate',
        interval: 0,
        formatter: (value: string) => {
          // 如果描述太长，截断并添加省略号
          if (value.length > 15) {
            return value.substring(0, 15) + '...'
          }
          return value
        }
      }
    },
    series: [
      {
        name: metricLabels[selectedMetric.value],
        type: 'bar',
        data: data.map(item => ({
          value: item.value,
          itemStyle: {
            color: getBarColor(selectedMetric.value)
          }
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => formatNumber(params.value)
        }
      }
    ]
  }
})

// 处理指标变化
const handleMetricChange = () => {
  loadRankingData()
}

// 加载排行数据
const loadRankingData = async () => {
  loading.value = true
  
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch('/api/admin/client-keys/usage-ranking', {
      params: {
        metric: selectedMetric.value,
        period: selectedPeriod.value,
        limit: 10
      }
    })
    
    if (response.success) {
      chartData.value = response.data
    }
  } catch (error) {
    console.error('Failed to load ranking data:', error)
  } finally {
    loading.value = false
  }
}

// 处理图表点击事件
const handleChartClick = (params: any) => {
  if (params.componentType === 'series') {
    const item = chartData.value[params.dataIndex]
    if (item) {
      emit('keyClick', item.keyId)
    }
  }
}

// 获取柱形图颜色
const getBarColor = (metric: string) => {
  const colors = {
    requests: '#f97316', // orange-500
    input_tokens: '#3b82f6', // blue-500
    output_tokens: '#10b981', // emerald-500
    total_tokens: '#8b5cf6' // violet-500
  }
  return colors[metric as keyof typeof colors] || colors.requests
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
      loadRankingData()
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

// 监听指标变化
watch(selectedMetric, () => {
  loadRankingData()
})

// 监听时间范围变化
watch(selectedPeriod, () => {
  loadRankingData()
})

// 生命周期
onMounted(() => {
  loadRankingData()
  setupAutoRefresh()
})

onUnmounted(() => {
  clearAutoRefresh()
})
</script>