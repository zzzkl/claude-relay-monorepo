<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- 基本信息 -->
    <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            配置名称 <span class="text-red-500">*</span>
          </label>
          <input
            type="text" 
            v-model="form.name"
            required
            class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例如：高性能路由策略">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            描述
          </label>
          <input
            type="text"
            v-model="form.description"
            class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="简短描述">
        </div>
      </div>
    </div>

    <!-- 模型配置 -->
    <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
      <h3 class="text-base font-medium text-gray-900 mb-4">模型配置</h3>
      
      <!-- 模型卡片网格 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- 默认模型 -->
        <div class="border border-green-200 bg-green-50/30 rounded-lg p-3.5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <Icon name="material-symbols:home" class="text-green-600 text-sm" />
              <span class="text-sm font-medium text-gray-900">默认模型</span>
              <span class="px-1.5 py-0.5 text-xs bg-green-600 text-white rounded">必填</span>
            </div>
          </div>
          <p class="text-xs text-gray-600 mb-2">所有请求的基础路由</p>
          <div class="grid grid-cols-2 gap-2">
            <select
              v-model="form.rules.default.providerId"
              required
              @change="handleProviderChange('default')"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500">
              <option value="">选择供应商</option>
              <option v-for="provider in availableProviders" :key="provider.id" :value="provider.id">
                {{ provider.name }}
              </option>
            </select>
            <select
              v-model="form.rules.default.model"
              required
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500">
              <option value="">选择模型</option>
              <option
                v-for="model in getAvailableModels(form.rules.default.providerId)" 
                :key="model" :value="model">
                {{ model }}
              </option>
            </select>
          </div>
        </div>

        <!-- 长上下文模型 -->
        <div class="border border-yellow-200 bg-yellow-50/30 rounded-lg p-3.5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <Icon name="material-symbols:description" class="text-yellow-600 text-sm" />
              <span class="text-sm font-medium text-gray-900">长上下文</span>
              <span class="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">可选</span>
            </div>
          </div>
          <p class="text-xs text-gray-600 mb-2">处理长文档和对话</p>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <select
              v-model="form.rules.longContext.providerId"
              @change="handleProviderChange('longContext')"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500">
              <option value="">不使用</option>
              <option v-for="provider in availableProviders" :key="provider.id" :value="provider.id">
                {{ provider.name }}
              </option>
            </select>
            <select
              v-model="form.rules.longContext.model"
              :disabled="!form.rules.longContext.providerId"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 disabled:bg-gray-50">
              <option value="">选择模型</option>
              <option
                v-for="model in getAvailableModels(form.rules.longContext.providerId)" 
                :key="model" :value="model">
                {{ model }}
              </option>
            </select>
          </div>
          <div v-if="form.rules.longContext.providerId" class="flex items-center space-x-2">
            <input
              type="number" 
              v-model.number="form.config.longContextThreshold"
              min="1000"
              step="1000"
              class="w-20 px-2 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500">
            <span class="text-xs text-gray-500">字符阈值</span>
          </div>
        </div>

        <!-- 后台任务模型 -->
        <div class="border border-blue-200 bg-blue-50/30 rounded-lg p-3.5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <Icon name="material-symbols:settings" class="text-blue-600 text-sm" />
              <span class="text-sm font-medium text-gray-900">后台任务</span>
              <span class="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">可选</span>
            </div>
          </div>
          <p class="text-xs text-gray-600 mb-2">快速响应的轻量任务</p>
          <div class="grid grid-cols-2 gap-2">
            <select
              v-model="form.rules.background.providerId"
              @change="handleProviderChange('background')"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500">
              <option value="">不使用</option>
              <option v-for="provider in availableProviders" :key="provider.id" :value="provider.id">
                {{ provider.name }}
              </option>
            </select>
            <select
              v-model="form.rules.background.model"
              :disabled="!form.rules.background.providerId"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50">
              <option value="">选择模型</option>
              <option
                v-for="model in getAvailableModels(form.rules.background.providerId)" 
                :key="model" :value="model">
                {{ model }}
              </option>
            </select>
          </div>
        </div>

        <!-- 思考模型 -->
        <div class="border border-purple-200 bg-purple-50/30 rounded-lg p-3.5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <Icon name="material-symbols:psychology" class="text-purple-600 text-sm" />
              <span class="text-sm font-medium text-gray-900">深度思考</span>
              <span class="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">可选</span>
            </div>
          </div>
          <p class="text-xs text-gray-600 mb-2">复杂推理和数学问题</p>
          <div class="grid grid-cols-2 gap-2">
            <select
              v-model="form.rules.think.providerId"
              @change="handleProviderChange('think')"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500">
              <option value="">不使用</option>
              <option v-for="provider in availableProviders" :key="provider.id" :value="provider.id">
                {{ provider.name }}
              </option>
            </select>
            <select
              v-model="form.rules.think.model"
              :disabled="!form.rules.think.providerId"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50">
              <option value="">选择模型</option>
              <option
                v-for="model in getAvailableModels(form.rules.think.providerId)" 
                :key="model" :value="model">
                {{ model }}
              </option>
            </select>
          </div>
        </div>

        <!-- 网络搜索模型 -->
        <div class="border border-orange-200 bg-orange-50/30 rounded-lg p-3.5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <Icon name="material-symbols:search" class="text-orange-600 text-sm" />
              <span class="text-sm font-medium text-gray-900">网络搜索</span>
              <span class="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">可选</span>
            </div>
          </div>
          <p class="text-xs text-gray-600 mb-2">实时信息检索</p>
          <div class="grid grid-cols-2 gap-2">
            <select
              v-model="form.rules.webSearch.providerId"
              @change="handleProviderChange('webSearch')"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500">
              <option value="">不使用</option>
              <option v-for="provider in availableProviders" :key="provider.id" :value="provider.id">
                {{ provider.name }}
              </option>
            </select>
            <select
              v-model="form.rules.webSearch.model"
              :disabled="!form.rules.webSearch.providerId"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 disabled:bg-gray-50">
              <option value="">选择模型</option>
              <option
                v-for="model in getAvailableModels(form.rules.webSearch.providerId)" 
                :key="model" :value="model">
                {{ model }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-end space-x-3">
      <button
        type="button" 
        @click="handleCancel"
        class="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition">
        取消
      </button>
      <button
        type="submit" 
        :disabled="loading || !isFormValid"
        class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
        {{ loading ? (isEdit ? '保存中...' : '创建中...') : (isEdit ? '保存' : '创建配置') }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RouteConfig, AddRouteConfigRequest, EditRouteConfigRequest, RouteRules, ModelTarget } from '../../../shared/types/admin/routes'
import type { ModelProvider } from '../../../shared/types/admin/providers'

interface Props {
  routeConfig?: RouteConfig
  loading?: boolean
  availableProviders?: ModelProvider[]
}

interface Emits {
  (e: 'submit', data: AddRouteConfigRequest | EditRouteConfigRequest): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  availableProviders: () => []
})

const emit = defineEmits<Emits>()

const isEdit = computed(() => !!props.routeConfig)



// 表单数据
const form = ref({
  name: props.routeConfig?.name || '',
  description: props.routeConfig?.description || '',
  rules: {
    default: {
      providerId: props.routeConfig?.rules.default.providerId || '',
      model: props.routeConfig?.rules.default.model || ''
    },
    longContext: {
      providerId: props.routeConfig?.rules.longContext?.providerId || '',
      model: props.routeConfig?.rules.longContext?.model || ''
    },
    background: {
      providerId: props.routeConfig?.rules.background?.providerId || '',
      model: props.routeConfig?.rules.background?.model || ''
    },
    think: {
      providerId: props.routeConfig?.rules.think?.providerId || '',
      model: props.routeConfig?.rules.think?.model || ''
    },
    webSearch: {
      providerId: props.routeConfig?.rules.webSearch?.providerId || '',
      model: props.routeConfig?.rules.webSearch?.model || ''
    }
  },
  config: {
    longContextThreshold: props.routeConfig?.config?.longContextThreshold || 80000
  }
})

// 表单验证
const isFormValid = computed(() => {
  const hasBasicInfo = form.value.name.trim() !== ''
  const hasDefaultRule = form.value.rules.default.providerId && form.value.rules.default.model
  return hasBasicInfo && hasDefaultRule
})

// 获取供应商的可用模型
const getAvailableModels = (providerId: string) => {
  if (!providerId) return []
  
  const provider = props.availableProviders.find(p => p.id === providerId)
  return provider?.models || []
}

// 处理供应商变更
const handleProviderChange = (ruleType: keyof typeof form.value.rules) => {
  // 清空模型选择
  form.value.rules[ruleType].model = ''
}

// 监听长上下文供应商变化
watch(() => form.value.rules.longContext.providerId, (newVal) => {
  if (!newVal) {
    form.value.config.longContextThreshold = 80000
  }
})

const handleSubmit = () => {
  if (!isFormValid.value) {
    alert('请完善必填信息')
    return
  }
  
  // 构建规则数据，只包含配置了供应商和模型的规则
  const rules: RouteRules = {
    default: form.value.rules.default
  }
  
  // 可选规则
  const optionalRules = ['longContext', 'background', 'think', 'webSearch'] as const
  optionalRules.forEach(ruleType => {
    const rule = form.value.rules[ruleType]
    if (rule.providerId && rule.model) {
      (rules as any)[ruleType] = rule
    }
  })
  
  // 构建配置数据
  const config: any = {}
  if (rules.longContext) {
    config.longContextThreshold = form.value.config.longContextThreshold
  }
  
  const data = {
    name: form.value.name.trim(),
    description: form.value.description.trim() || undefined,
    rules,
    config: Object.keys(config).length > 0 ? config : undefined
  }
  
  emit('submit', data)
}

const handleCancel = () => {
  emit('cancel')
}
</script>