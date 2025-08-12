<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
      <!-- 标题 -->
      <div class="mb-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">生成新的 API Key</h3>
      </div>

      <!-- 表单 -->
      <div v-if="!generatedKey">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            描述（可选）
          </label>
          <input
            v-model="description"
            type="text"
            maxlength="200"
            placeholder="例如：生产环境应用"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ description.length }}/200 字符
          </p>
        </div>

        <!-- 按钮 -->
        <div class="flex justify-end gap-3">
          <button
            @click="$emit('close')"
            class="px-4 py-2 bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          >
            取消
          </button>
          <button
            @click="createKey"
            :disabled="creating"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ creating ? '生成中...' : '生成 Key' }}
          </button>
        </div>
      </div>

      <!-- 显示生成的 Key -->
      <div v-else>
        <div class="mb-4 p-4 bg-green-50 dark:bg-green-900 rounded-lg">
          <div class="flex items-start">
            <svg class="flex-shrink-0 h-5 w-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <div class="ml-3 flex-1">
              <h3 class="text-sm font-medium text-green-800 dark:text-green-200">
                API Key 生成成功！
              </h3>
              <p class="mt-1 text-sm text-green-700 dark:text-green-300">
                请妥善保存此 Key，关闭对话框后将无法再次查看完整内容。
              </p>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Key
          </label>
          <div class="relative">
            <input
              :value="generatedKey.key"
              type="text"
              readonly
              class="w-full px-3 py-2 pr-10 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white"
            />
            <button
              @click="copyToClipboard"
              class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="复制"
            >
              <svg v-if="!copied" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <svg v-else class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="generatedKey.description" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            描述
          </label>
          <p class="text-sm text-gray-600 dark:text-gray-400">{{ generatedKey.description }}</p>
        </div>

        <!-- 关闭按钮 -->
        <div class="flex justify-end">
          <button
            @click="$emit('close')"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CreateClientKeyResponse } from '../../../../shared/types/admin/client-keys'

const emit = defineEmits<{
  close: []
  created: [key: CreateClientKeyResponse]
}>()

const description = ref('')
const creating = ref(false)
const generatedKey = ref<CreateClientKeyResponse | null>(null)
const copied = ref(false)

// 创建 API Key
const createKey = async () => {
  creating.value = true
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch('/api/admin/client-keys', {
      method: 'POST',
      body: JSON.stringify({
        description: description.value || undefined
      })
    })
    
    if (response.success) {
      generatedKey.value = response.data
      emit('created', response.data)
    }
  } catch (error) {
    console.error('Failed to create API key:', error)
    // TODO: 显示错误提示
  } finally {
    creating.value = false
  }
}

// 复制到剪贴板
const copyToClipboard = async () => {
  if (!generatedKey.value) return
  
  try {
    await navigator.clipboard.writeText(generatedKey.value.key)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}
</script>