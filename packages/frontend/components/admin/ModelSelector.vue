<template>
  <div class="bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden rounded-2xl border border-orange-100">
    <div class="px-6 py-6">
      <div class="mb-6">
        <h3 class="text-xl font-bold text-gray-900">模型选择器</h3>
        <p class="text-sm text-gray-600 mt-1">选择用于处理请求的模型配置</p>
      </div>
      
      <div class="space-y-4">
        <!-- Claude 官方模型选项 -->
        <div
          @click="selectOption('claude', null)"
          :class="isSelected('claude', null) ? 'border-orange-400 bg-orange-50/50' : 'border-orange-200'"
          class="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border-2 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition duration-300 group">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h4 class="text-lg font-bold text-gray-900">Claude 官方模型</h4>
                <p class="text-sm text-gray-600">直接使用 Anthropic 官方 Claude API</p>
                <p class="text-xs text-gray-500 mt-1">稳定可靠，推荐用于常规使用</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <span class="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                • 可用
              </span>
              <div
                v-if="isSelected('claude', null)" 
                class="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div v-else class="w-6 h-6 border-2 border-gray-300 rounded-full group-hover:border-orange-400 transition duration-200"></div>
            </div>
          </div>
        </div>

        <!-- 路由配置选项（平铺展开） -->
        <div
          v-for="config in availableRouteConfigs" 
          :key="config.id"
          @click="selectOption('route', config.id)"
          :class="isSelected('route', config.id) ? 'border-blue-400 bg-blue-50/50' : 'border-blue-200'"
          class="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border-2 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition duration-300 group">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
              </div>
              <div>
                <h4 class="text-lg font-bold text-gray-900">{{ config.name }}</h4>
                <p class="text-sm text-gray-600">{{ config.description || '智能路由配置' }}</p>
                
                <!-- 路由规则预览 -->
                <div class="flex flex-wrap gap-2 mt-2">
                  <span class="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs">
                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>默认: {{ config.rules.default.model }}</span>
                  </span>
                  <span v-if="config.rules.longContext" class="inline-flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs">
                    <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>长上下文: {{ config.rules.longContext.model }}</span>
                  </span>
                  <span v-if="config.rules.think" class="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs">
                    <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>深度思考: {{ config.rules.think.model }}</span>
                  </span>
                  <span v-if="config.rules.background" class="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">
                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>后台任务: {{ config.rules.background.model }}</span>
                  </span>
                  <span v-if="config.rules.webSearch" class="inline-flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs">
                    <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>网络搜索: {{ config.rules.webSearch.model }}</span>
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <span class="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                • 可用
              </span>
              <div
                v-if="isSelected('route', config.id)" 
                class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div v-else class="w-6 h-6 border-2 border-gray-300 rounded-full group-hover:border-blue-400 transition duration-200"></div>
            </div>
          </div>
        </div>
        
        <!-- 暂无路由配置提示 -->
        <div v-if="availableRouteConfigs.length === 0" class="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
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
              @click="$emit('navigate-to-routes')" 
              class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition duration-200 shadow-lg">
              创建路由配置
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { useModelSelection } from '../../composables/useModelSelection'

interface Emits {
  (e: 'navigate-to-routes'): void
}

defineEmits<Emits>()

// 注入父组件提供的刷新方法
const refreshDashboard = inject<(() => Promise<void>) | undefined>('refreshDashboard')

// 使用 composable 来管理模型选择相关逻辑
const {
  currentModelMode,
  selectedRouteConfigId,
  availableRouteConfigs,
  selectModelMode,
  updateRouteSelection
} = useModelSelection()

// 检查是否选中某个选项
const isSelected = (mode: 'claude' | 'route', configId: string | null) => {
  if (mode === 'claude') {
    return currentModelMode.value === 'claude'
  } else {
    return currentModelMode.value === 'route' && selectedRouteConfigId.value === configId
  }
}

// 选择某个选项
const selectOption = async (mode: 'claude' | 'route', configId: string | null) => {
  if (mode === 'claude') {
    await selectModelMode('claude', refreshDashboard)
  } else if (configId) {
    selectedRouteConfigId.value = configId
    await selectModelMode('route', refreshDashboard)
    await updateRouteSelection(refreshDashboard)
  }
}
</script>