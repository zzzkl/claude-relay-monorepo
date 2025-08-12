<template>
  <div class="container mx-auto px-4 py-8">
    <!-- 页面标题和操作 -->
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">客户端 API Key 管理</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">管理客户端访问系统时使用的 API Key</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        生成新 Key
      </button>
    </div>

    <!-- API Key 列表 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
      <!-- 加载状态 -->
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!clientKeys.length" class="p-8 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">还没有 API Key</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">点击上方按钮生成第一个客户端 API Key</p>
      </div>

      <!-- Key 列表表格 -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                API Key
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                描述
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                状态
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                使用次数
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                创建时间
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                最后使用
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="key in clientKeys" :key="key.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <code class="text-sm font-mono text-gray-900 dark:text-white">{{ key.keyPreview }}</code>
                  <button
                    @click="viewKeyDetails(key.id)"
                    class="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="查看详情"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ key.description || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                    key.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  ]"
                >
                  {{ key.status === 'active' ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ key.usageCount }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(key.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ key.lastUsedAt ? formatDate(key.lastUsedAt) : '从未使用' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end gap-2">
                  <button
                    @click="toggleKeyStatus(key)"
                    :class="[
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      key.status === 'active'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
                    ]"
                  >
                    {{ key.status === 'active' ? '禁用' : '启用' }}
                  </button>
                  <button
                    @click="editKey(key)"
                    class="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 rounded text-xs font-medium transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    @click="deleteKey(key)"
                    class="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 rounded text-xs font-medium transition-colors"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 创建 Key 模态框 -->
    <CreateKeyModal 
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onKeyCreated"
    />

    <!-- 编辑 Key 模态框 -->
    <EditKeyModal
      v-if="editingKey"
      :client-key="editingKey"
      @close="editingKey = null"
      @updated="onKeyUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ClientApiKeyListItem } from '../../../../shared/types/admin/client-keys'
import CreateKeyModal from '~/components/admin/CreateKeyModal.vue'
import EditKeyModal from '~/components/admin/EditKeyModal.vue'

const router = useRouter()
const loading = ref(false)
const clientKeys = ref<ClientApiKeyListItem[]>([])
const showCreateModal = ref(false)
const editingKey = ref<ClientApiKeyListItem | null>(null)

// 加载 API Key 列表
const loadKeys = async () => {
  loading.value = true
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch('/api/admin/client-keys')
    if (response.success) {
      clientKeys.value = response.data.keys
    }
  } catch (error) {
    console.error('Failed to load client keys:', error)
    // TODO: 显示错误提示
  } finally {
    loading.value = false
  }
}

// 格式化日期
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 查看 Key 详情
const viewKeyDetails = (keyId: string) => {
  router.push(`/admin/client-keys/${keyId}`)
}

// 切换 Key 状态
const toggleKeyStatus = async (key: ClientApiKeyListItem) => {
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch(`/api/admin/client-keys/${key.id}/toggle-status`, {
      method: 'POST'
    })
    if (response.success) {
      // 刷新列表
      await loadKeys()
    }
  } catch (error) {
    console.error('Failed to toggle key status:', error)
    // TODO: 显示错误提示
  }
}

// 编辑 Key
const editKey = (key: ClientApiKeyListItem) => {
  editingKey.value = key
}

// 删除 Key
const deleteKey = async (key: ClientApiKeyListItem) => {
  if (!confirm(`确定要删除这个 API Key 吗？\n${key.keyPreview}\n此操作不可恢复。`)) {
    return
  }
  
  try {
    const { apiFetch } = useApi()
    const response = await apiFetch(`/api/admin/client-keys/${key.id}`, {
      method: 'DELETE'
    })
    if (response.success) {
      // 刷新列表
      await loadKeys()
    }
  } catch (error) {
    console.error('Failed to delete key:', error)
    // TODO: 显示错误提示
  }
}

// Key 创建成功
const onKeyCreated = () => {
  showCreateModal.value = false
  loadKeys()
}

// Key 更新成功
const onKeyUpdated = () => {
  editingKey.value = null
  loadKeys()
}

// 页面加载时获取数据
onMounted(() => {
  loadKeys()
})
</script>