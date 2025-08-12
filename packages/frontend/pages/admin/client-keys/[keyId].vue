<template>
  <div class="container mx-auto px-4 py-8">
    <!-- 返回按钮 -->
    <div class="mb-6">
      <NuxtLink 
        to="/admin/client-keys"
        class="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        返回列表
      </NuxtLink>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
      <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-2 text-lg font-medium text-red-900 dark:text-red-200">加载失败</h3>
      <p class="mt-1 text-sm text-red-700 dark:text-red-300">{{ error }}</p>
    </div>

    <!-- Key 详情 -->
    <div v-else-if="keyData" class="space-y-6">
      <!-- 标题 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">API Key 详情</h1>
        
        <!-- 基本信息 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key
            </label>
            <div class="flex items-center">
              <code class="flex-1 px-3 py-2 font-mono text-sm bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white">
                {{ showFullKey ? keyData.key : maskKey(keyData.key) }}
              </code>
              <button
                @click="toggleKeyVisibility"
                class="ml-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                :title="showFullKey ? '隐藏' : '显示'"
              >
                <svg v-if="!showFullKey" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
              <button
                @click="copyKey"
                class="ml-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="复制"
              >
                <svg v-if="!copied" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              状态
            </label>
            <span 
              :class="[
                'px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full',
                keyData.status === 'active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              ]"
            >
              {{ keyData.status === 'active' ? '启用' : '禁用' }}
            </span>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              描述
            </label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ keyData.description || '无描述' }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              创建者
            </label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ keyData.createdBy }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              创建时间
            </label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ formatDate(keyData.createdAt) }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              最后使用时间
            </label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ keyData.lastUsedAt ? formatDate(keyData.lastUsedAt) : '从未使用' }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              使用次数
            </label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ keyData.usageCount }}
            </p>
          </div>
        </div>
      </div>

      <!-- 使用统计 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">使用统计</h2>
        
        <div v-if="keyData.stats" class="space-y-6">
          <!-- 统计概览 -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p class="text-sm text-gray-600 dark:text-gray-400">总请求数</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ keyData.stats.totalRequests }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p class="text-sm text-gray-600 dark:text-gray-400">今日请求</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ getTodayUsage() }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p class="text-sm text-gray-600 dark:text-gray-400">总 Input Tokens</p>
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ formatNumber(keyData.stats.totalInputTokens || 0) }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p class="text-sm text-gray-600 dark:text-gray-400">总 Output Tokens</p>
              <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ formatNumber(keyData.stats.totalOutputTokens || 0) }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p class="text-sm text-gray-600 dark:text-gray-400">平均 Tokens/请求</p>
              <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ getAverageTokensPerRequest() }}</p>
            </div>
          </div>

          <!-- Token 使用趋势 -->
          <div v-if="keyData.stats.dailyTokenUsage && Object.keys(keyData.stats.dailyTokenUsage).length > 0">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Token 使用趋势（最近7天）</h3>
            <div class="space-y-3">
              <div 
                v-for="item in getRecentTokenUsage()" 
                :key="item.date"
                class="border border-gray-200 dark:border-gray-600 rounded-lg p-3"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ item.date }}</span>
                  <span class="text-xs text-gray-500">{{ item.requests }} 请求</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-gray-600 dark:text-gray-400">Input</span>
                      <span class="text-xs font-medium text-blue-600">{{ formatNumber(item.inputTokens) }}</span>
                    </div>
                    <div class="bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                      <div 
                        class="bg-blue-600 h-2 rounded-full"
                        :style="`width: ${getTokenPercentage(item.inputTokens, 'input')}%`"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-gray-600 dark:text-gray-400">Output</span>
                      <span class="text-xs font-medium text-green-600">{{ formatNumber(item.outputTokens) }}</span>
                    </div>
                    <div class="bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                      <div 
                        class="bg-green-600 h-2 rounded-full"
                        :style="`width: ${getTokenPercentage(item.outputTokens, 'output')}%`"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 请求使用记录（简单展示） -->
          <div v-else-if="Object.keys(keyData.stats.dailyUsage).length > 0">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">最近使用记录</h3>
            <div class="space-y-2">
              <div 
                v-for="(count, date) in getRecentDailyUsage()" 
                :key="date"
                class="flex items-center"
              >
                <span class="text-sm text-gray-600 dark:text-gray-400 w-24">{{ date }}</span>
                <div class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-4 ml-2">
                  <div 
                    class="bg-blue-600 h-4 rounded-full"
                    :style="`width: ${getUsagePercentage(count)}%`"
                  ></div>
                </div>
                <span class="text-sm text-gray-900 dark:text-white ml-2 w-12 text-right">{{ count }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-center text-gray-500 dark:text-gray-400 py-4">
            暂无使用记录
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex justify-end gap-3">
        <button
          @click="toggleStatus"
          :class="[
            'px-4 py-2 rounded-lg font-medium transition-colors',
            keyData.status === 'active'
              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
          ]"
        >
          {{ keyData.status === 'active' ? '禁用 Key' : '启用 Key' }}
        </button>
        <button
          @click="deleteKey"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          删除 Key
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ClientApiKeyDetailResponse } from '../../../../../shared/types/admin/client-keys'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const keyData = ref<ClientApiKeyDetailResponse | null>(null)
const showFullKey = ref(false)
const copied = ref(false)

// 获取 Key 详情
const loadKeyDetails = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch(`/api/admin/client-keys/${route.params.keyId}`)
    
    if (response.success) {
      keyData.value = response.data
    } else {
      error.value = response.message || '加载失败'
    }
  } catch (err: any) {
    console.error('Failed to load key details:', err)
    error.value = err.message || '网络错误'
  } finally {
    loading.value = false
  }
}

// 遮蔽 Key
const maskKey = (key: string) => {
  if (key.length <= 16) return key
  return `${key.substring(0, 8)}****${key.substring(key.length - 8)}`
}

// 切换 Key 可见性
const toggleKeyVisibility = () => {
  showFullKey.value = !showFullKey.value
}

// 复制 Key
const copyKey = async () => {
  if (!keyData.value) return
  
  try {
    await navigator.clipboard.writeText(keyData.value.key)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy key:', err)
  }
}

// 格式化日期
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 获取今日使用量
const getTodayUsage = () => {
  if (!keyData.value?.stats) return 0
  const today = new Date().toISOString().split('T')[0]
  return keyData.value.stats.dailyUsage[today] || 0
}

// 获取最近的每日使用记录
const getRecentDailyUsage = () => {
  if (!keyData.value?.stats) return {}
  
  const usage = keyData.value.stats.dailyUsage
  const dates = Object.keys(usage).sort().reverse().slice(0, 7)
  
  const result: Record<string, number> = {}
  dates.forEach(date => {
    result[date] = usage[date]
  })
  
  return result
}

// 计算使用百分比
const getUsagePercentage = (count: number) => {
  if (!keyData.value?.stats) return 0
  
  const maxCount = Math.max(...Object.values(keyData.value.stats.dailyUsage))
  if (maxCount === 0) return 0
  
  return Math.round((count / maxCount) * 100)
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

// 获取平均 Tokens/请求
const getAverageTokensPerRequest = () => {
  if (!keyData.value?.stats) return '0'
  const { totalRequests, totalInputTokens = 0, totalOutputTokens = 0 } = keyData.value.stats
  if (totalRequests === 0) return '0'
  const avgTokens = (totalInputTokens + totalOutputTokens) / totalRequests
  return formatNumber(Math.round(avgTokens))
}

// 获取最近的 Token 使用记录
const getRecentTokenUsage = () => {
  if (!keyData.value?.stats?.dailyTokenUsage) return []
  
  const usage = keyData.value.stats.dailyTokenUsage
  const dates = Object.keys(usage).sort().reverse().slice(0, 7)
  
  return dates.map(date => ({
    date,
    ...usage[date]
  }))
}

// 计算 Token 百分比
const getTokenPercentage = (value: number, type: 'input' | 'output') => {
  if (!keyData.value?.stats?.dailyTokenUsage) return 0
  
  const allValues = Object.values(keyData.value.stats.dailyTokenUsage)
  const maxValue = Math.max(
    ...allValues.map(v => type === 'input' ? v.inputTokens : v.outputTokens)
  )
  
  if (maxValue === 0) return 0
  return Math.round((value / maxValue) * 100)
}

// 切换状态
const toggleStatus = async () => {
  if (!keyData.value) return
  
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch(`/api/admin/client-keys/${keyData.value.id}/toggle-status`, {
      method: 'POST'
    })
    
    if (response.success) {
      await loadKeyDetails()
    }
  } catch (err) {
    console.error('Failed to toggle status:', err)
  }
}

// 删除 Key
const deleteKey = async () => {
  if (!keyData.value) return
  
  if (!confirm('确定要删除这个 API Key 吗？此操作不可恢复。')) {
    return
  }
  
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch(`/api/admin/client-keys/${keyData.value.id}`, {
      method: 'DELETE'
    })
    
    if (response.success) {
      router.push('/admin/client-keys')
    }
  } catch (err) {
    console.error('Failed to delete key:', err)
  }
}

onMounted(() => {
  loadKeyDetails()
})
</script>