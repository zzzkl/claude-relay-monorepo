<template>
  <div class="bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden rounded-2xl border border-orange-100">
    <div class="px-6 py-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="text-xl font-bold text-gray-900">路由配置管理</h3>
          <p class="text-sm text-gray-600 mt-1">配置智能路由规则，实现请求的动态分发到最合适的模型</p>
        </div>
        <button
          @click="navigateTo('/admin/add-route-config')" 
          class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span>添加路由配置</span>
        </button>
      </div>
      
      <div class="space-y-6">
        <div
          v-for="routeConfig in routeConfigs" :key="routeConfig.id" 
          class="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 hover:shadow-lg transition duration-300 group">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
              </div>
              <div>
                <h4 class="text-lg font-bold text-gray-900">{{ routeConfig.name }}</h4>
                <p class="text-sm text-gray-500">{{ routeConfig.description }}</p>
              </div>
            </div>
            <span class="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
              • 活跃
            </span>
          </div>
          
          <div class="space-y-4 mb-6">
            <div class="space-y-4">
              <h5 class="text-sm font-medium text-gray-700">
                路由配置详情
              </h5>
              
              <!-- 已配置的路由列表 -->
              <div class="space-y-2.5">
                <!-- 默认模型 -->
                <div class="flex items-center space-x-3 text-sm">
                  <div class="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span class="font-medium text-gray-700 min-w-[80px]">默认模型</span>
                  <span class="font-mono text-gray-800">{{ getProviderName(routeConfig.rules?.default?.providerId || 'anthropic') }} @ {{ routeConfig.rules?.default?.model || 'claude-3-5-sonnet-20241022' }}</span>
                </div>
                
                <!-- 后台任务模型 -->
                <div v-if="routeConfig.rules.background" class="flex items-center space-x-3 text-sm">
                  <div class="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span class="font-medium text-gray-700 min-w-[80px]">后台任务</span>
                  <span class="font-mono text-gray-800">{{ getProviderName(routeConfig.rules.background.providerId) }} @ {{ routeConfig.rules.background.model }}</span>
                </div>
                
                <!-- 深度思考模型 -->
                <div v-if="routeConfig.rules.think" class="flex items-center space-x-3 text-sm">
                  <div class="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <span class="font-medium text-gray-700 min-w-[80px]">深度思考</span>
                  <span class="font-mono text-gray-800">{{ getProviderName(routeConfig.rules.think.providerId) }} @ {{ routeConfig.rules.think.model }}</span>
                </div>
                
                <!-- 长上下文模型 -->
                <div v-if="routeConfig.rules.longContext" class="flex items-center space-x-3 text-sm">
                  <div class="w-3 h-3 bg-yellow-500 rounded-full flex-shrink-0"></div>
                  <span class="font-medium text-gray-700 min-w-[80px]">长上下文</span>
                  <span class="font-mono text-gray-800">{{ getProviderName(routeConfig.rules.longContext.providerId) }} @ {{ routeConfig.rules.longContext.model }}</span>
                  <span class="text-xs text-gray-500 ml-2">({{ routeConfig.config?.longContextThreshold || 60000 }}字符+)</span>
                </div>
                
                <!-- 网络搜索模型 -->
                <div v-if="routeConfig.rules.webSearch" class="flex items-center space-x-3 text-sm">
                  <div class="w-3 h-3 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <span class="font-medium text-gray-700 min-w-[80px]">网络搜索</span>
                  <span class="font-mono text-gray-800">{{ getProviderName(routeConfig.rules.webSearch.providerId) }} @ {{ routeConfig.rules.webSearch.model }}</span>
                </div>
              </div>
              
              <!-- 分隔线 -->
              <div v-if="getUnconfiguredModelsCount(routeConfig.rules) > 0" class="border-t border-dashed border-gray-200"></div>
              
              <!-- 未配置的路由提示 -->
              <div v-if="getUnconfiguredModelsCount(routeConfig.rules) > 0" class="space-y-2">
                <div class="text-xs font-medium text-gray-500">未配置路由</div>
                <div class="flex flex-wrap gap-2">
                  <span v-if="!routeConfig.rules.background" class="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-gray-50 text-gray-500 rounded-md text-xs">
                    <div class="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span>后台任务</span>
                  </span>
                  <span v-if="!routeConfig.rules.think" class="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-gray-50 text-gray-500 rounded-md text-xs">
                    <div class="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span>深度思考</span>
                  </span>
                  <span v-if="!routeConfig.rules.longContext" class="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-gray-50 text-gray-500 rounded-md text-xs">
                    <div class="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span>长上下文</span>
                  </span>
                  <span v-if="!routeConfig.rules.webSearch" class="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-gray-50 text-gray-500 rounded-md text-xs">
                    <div class="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span>网络搜索</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex space-x-2">
            <button
              @click="editRouteConfig(routeConfig)" 
              class="px-4 py-2 text-blue-600 hover:text-blue-700 rounded-xl border border-blue-200 hover:border-blue-300 transition duration-200 text-sm">
              编辑
            </button>
            <button
              @click="deleteRouteConfig(routeConfig.id)" 
              class="px-4 py-2 text-red-600 hover:text-red-700 rounded-xl border border-red-200 hover:border-red-300 transition duration-200 text-sm">
              删除
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="routeConfigs.length === 0" class="text-center py-8">
        <div class="flex flex-col items-center space-y-4">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
          </div>
          <div>
            <p class="text-gray-500 text-lg font-medium">暂无路由配置</p>
            <p class="text-gray-400 text-sm mt-1">创建路由配置以启用智能模型选择功能</p>
          </div>
          <button
            @click="showAddRouteModal = true" 
            class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition duration-200 shadow-lg">
            创建第一个路由配置
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 添加路由配置模态框 -->
  <div v-if="showAddRouteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
      <div class="px-6 py-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-900">添加路由配置</h3>
          <button @click="showAddRouteModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <RouteConfigForm 
          :available-providers="availableProviders"
          @submit="addRouteConfig" 
          @cancel="showAddRouteModal = false" />
      </div>
    </div>
  </div>

  <!-- 编辑路由配置模态框 -->
  <div v-if="showEditRouteModal && editingRoute" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
      <div class="px-6 py-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-900">编辑路由配置</h3>
          <button @click="showEditRouteModal = false; editingRoute = null" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <RouteConfigForm 
          :route-config="editingRoute"
          :available-providers="availableProviders"
          @submit="updateRouteConfig" 
          @cancel="showEditRouteModal = false; editingRoute = null" />
      </div>
    </div>
  </div>

  <!-- 确认删除对话框 -->
  <ConfirmDialog
    :visible="showConfirmDialog"
    :title="confirmDialogConfig?.title"
    :message="confirmDialogConfig?.message"
    :description="confirmDialogConfig?.description"
    :type="confirmDialogConfig?.type || 'danger'"
    :loading="confirmLoading"
    confirm-text="删除"
    cancel-text="取消"
    @confirm="handleConfirmDialogConfirm"
    @cancel="handleConfirmDialogCancel"
  />
</template>

<script setup lang="ts">
import type { ModelProvider } from '../../../../shared/types/admin/providers'
import { useRouteConfigs } from '../../composables/useRouteConfigs'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import RouteConfigForm from '../RouteConfigForm.vue'

interface Props {
  availableProviders?: ModelProvider[]
}

const props = withDefaults(defineProps<Props>(), {
  availableProviders: () => []
})

// 使用 composable 来管理路由配置相关逻辑
const {
  routeConfigs,
  showAddRouteModal,
  showEditRouteModal,
  editingRoute,
  showConfirmDialog,
  confirmDialogConfig,
  confirmLoading,
  addRouteConfig,
  editRouteConfig,
  updateRouteConfig,
  deleteRouteConfig,
  formatDate,
  handleConfirmDialogCancel,
  handleConfirmDialogConfirm
} = useRouteConfigs()

// 工具方法
const getProviderName = (providerId: string) => {
  const provider = props.availableProviders.find(p => p.id === providerId)
  return provider?.name || providerId
}

const getConfiguredModelsCount = (rules: any) => {
  if (!rules) return 1 // 默认模型总是存在
  let count = 1 // 默认模型总是存在
  if (rules.background) count++
  if (rules.think) count++
  if (rules.longContext) count++
  if (rules.webSearch) count++
  return count
}

const getUnconfiguredModelsCount = (rules: any) => {
  if (!rules) return 4 // 除了默认模型外的可选模型数量
  let count = 0
  if (!rules.background) count++
  if (!rules.think) count++
  if (!rules.longContext) count++
  if (!rules.webSearch) count++
  return count
}
</script>