<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
      <!-- 标题 -->
      <div class="mb-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">编辑 API Key</h3>
      </div>

      <!-- 表单 -->
      <div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Key
          </label>
          <code class="block px-3 py-2 text-sm font-mono bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white">
            {{ clientKey.keyPreview }}
          </code>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            描述
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

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            状态
          </label>
          <select
            v-model="status"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
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
            @click="updateKey"
            :disabled="updating"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ updating ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ClientApiKeyListItem, ClientApiKeyStatus } from '../../../../shared/types/admin/client-keys'

const props = defineProps<{
  clientKey: ClientApiKeyListItem
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const description = ref(props.clientKey.description || '')
const status = ref<ClientApiKeyStatus>(props.clientKey.status)
const updating = ref(false)

// 更新 API Key
const updateKey = async () => {
  updating.value = true
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch(`/api/admin/client-keys/${props.clientKey.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        description: description.value || undefined,
        status: status.value
      })
    })
    
    if (response.success) {
      emit('updated')
    }
  } catch (error) {
    console.error('Failed to update API key:', error)
    // TODO: 显示错误提示
  } finally {
    updating.value = false
  }
}
</script>