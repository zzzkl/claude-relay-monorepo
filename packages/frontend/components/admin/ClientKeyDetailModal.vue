<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
      <!-- 标题 -->
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">API Key 详情</h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 内容 -->
      <div v-if="loading" class="py-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="keyData" class="space-y-6">
        <!-- 基本信息 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key
            </label>
            <div class="flex items-center">
              <code class="flex-1 px-3 py-2 font-mono text-sm bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white">
                {{ showFullKey ? keyData.key : maskKey(keyData.key) }}
              </code>
              <button
                @click="toggleKeyVisibility"
                class="ml-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ keyData.description || '无描述' }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              创建者
            </label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ keyData.createdBy }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              创建时间
            </label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ formatDate(keyData.createdAt) }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              最后使用时间
            </label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ keyData.lastUsedAt ? formatDate(keyData.lastUsedAt) : '从未使用' }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              使用次数
            </label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ keyData.usageCount }}
            </p>
          </div>
        </div>

        <!-- 使用统计 -->
        <div v-if="keyData.stats" class="border-t pt-4">
          <h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">使用统计</h4>
          
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p class="text-xs text-gray-600 dark:text-gray-400">总请求数</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white">{{ keyData.stats.totalRequests }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p class="text-xs text-gray-600 dark:text-gray-400">今日请求</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white">{{ getTodayUsage() }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p class="text-xs text-gray-600 dark:text-gray-400">最后更新</p>
              <p class="text-xs text-gray-900 dark:text-white">{{ formatDate(keyData.stats.lastUpdated) }}</p>
            </div>
          </div>

          <!-- 最近使用记录 -->
          <div v-if="Object.keys(keyData.stats.dailyUsage).length > 0">
            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">最近7天使用情况</h5>
            <div class="space-y-1">
              <div 
                v-for="(count, date) in getRecentDailyUsage()" 
                :key="date"
                class="flex items-center"
              >
                <span class="text-xs text-gray-600 dark:text-gray-400 w-20">{{ date }}</span>
                <div class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3 ml-2">
                  <div 
                    class="bg-blue-600 h-3 rounded-full"
                    :style="`width: ${getUsagePercentage(count)}%`"
                  ></div>
                </div>
                <span class="text-xs text-gray-900 dark:text-white ml-2 w-8 text-right">{{ count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-3 pt-4 border-t">
          <button
            @click="toggleStatus"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-colors',
              keyData.status === 'active'
                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
            ]"
          >
            {{ keyData.status === 'active' ? '禁用' : '启用' }}
          </button>
          <button
            @click="$emit('close')"
            class="px-4 py-2 bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ClientApiKeyDetailResponse } from '../../../../shared/types/admin/client-keys'

const props = defineProps<{
  keyId: string
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const loading = ref(false)
const keyData = ref<ClientApiKeyDetailResponse | null>(null)
const showFullKey = ref(false)
const copied = ref(false)

// 加载 Key 详情
const loadKeyDetails = async () => {
  loading.value = true
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch(`/api/admin/client-keys/${props.keyId}`)
    
    if (response.success) {
      keyData.value = response.data
    }
  } catch (error) {
    console.error('Failed to load key details:', error)
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
  } catch (error) {
    console.error('Failed to copy key:', error)
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
      emit('updated')
    }
  } catch (error) {
    console.error('Failed to toggle status:', error)
  }
}

onMounted(() => {
  loadKeyDetails()
})
</script>