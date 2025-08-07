<template>
  <div class="bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden rounded-2xl border border-orange-100">
    <div class="px-6 py-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="text-xl font-bold text-gray-900">Claude Code 账号管理</h3>
          <p class="text-sm text-gray-600 mt-1">管理多个 Claude Code 账号，支持 OAuth 认证和自动 token 刷新</p>
        </div>
        <button
          @click="showAddAccountModal = true" 
          class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span>添加账号</span>
        </button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="account in claudeAccounts" :key="account.id" 
          class="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-orange-200 rounded-2xl p-6 hover:shadow-lg transition duration-300 group">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div>
                <h4 class="text-lg font-bold text-gray-900">{{ account.name }}</h4>
                <p class="text-sm text-gray-500">{{ account.description || 'Claude Code 账号' }}</p>
              </div>
            </div>
            <span :class="getAccountStatusClass(account.status)" class="px-3 py-1 text-xs font-medium rounded-full">
              {{ getAccountStatusText(account.status) }}
            </span>
          </div>
          
          <div class="space-y-3 mb-6">
            <div v-if="account.tokenInfo?.hasToken" class="space-y-2">
              <div class="flex items-center space-x-2 text-sm">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                <span class="text-gray-600">Token 状态: {{ account.tokenInfo.isExpired ? '已过期' : '有效' }}</span>
              </div>
              <div v-if="account.tokenInfo.expiresAt" class="flex items-center space-x-2 text-sm">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-gray-600">过期时间: {{ formatDate(account.tokenInfo.expiresAt) }}</span>
              </div>
            </div>
            <div v-else class="flex items-center space-x-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <span class="text-gray-600">需要授权认证</span>
            </div>
          </div>
          
          <div class="flex space-x-2">
            <button
              v-if="!account.tokenInfo?.hasToken" 
              @click="startOAuthFlow(account)" 
              class="px-4 py-2 text-orange-600 hover:text-orange-700 rounded-xl border border-orange-200 hover:border-orange-300 transition duration-200 text-sm">
              授权登录
            </button>
            <button
              v-if="account.tokenInfo?.hasToken && account.tokenInfo.isExpired" 
              @click="refreshAccountToken(account.id)" 
              class="px-4 py-2 text-blue-600 hover:text-blue-700 rounded-xl border border-blue-200 hover:border-blue-300 transition duration-200 text-sm">
              刷新 Token
            </button>
            <button
              @click="deleteAccount(account.id)" 
              class="px-4 py-2 text-red-600 hover:text-red-700 rounded-xl border border-red-200 hover:border-red-300 transition duration-200 text-sm">
              删除
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="claudeAccounts.length === 0" class="text-center py-8">
        <p class="text-gray-500">暂无 Claude Code 账号</p>
      </div>
    </div>
  </div>

  <!-- 添加账号模态框 -->
  <div v-if="showAddAccountModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
      <h3 class="text-lg font-bold text-gray-900 mb-4">添加 Claude Code 账号</h3>
      <form @submit.prevent="addAccount">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">账号名称</label>
            <input
              v-model="newAccount.name" type="text" required 
              class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" 
              placeholder="输入账号名称">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
            <input
              v-model="newAccount.description" type="text" 
              class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" 
              placeholder="输入账号描述">
          </div>
        </div>
        <div class="flex space-x-3 mt-6">
          <button
            type="button" @click="showAddAccountModal = false" 
            class="flex-1 py-2 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition duration-200">
            取消
          </button>
          <button
            type="submit" 
            class="flex-1 py-2 px-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition duration-200">
            添加
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- OAuth 授权模态框 -->
  <div v-if="showOAuthModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
      <h3 class="text-lg font-bold text-gray-900 mb-4">OAuth 授权</h3>
      
      <div v-if="oauthStep === 1" class="space-y-4">
        <p class="text-sm text-gray-600">请点击下方按钮前往 Claude Code 完成授权</p>
        <div class="bg-orange-50 p-4 rounded-xl">
          <p class="text-sm text-orange-700 font-medium">重要提示：</p>
          <p class="text-sm text-orange-600 mt-1">授权完成后，请从浏览器地址栏复制 code 参数的值</p>
        </div>
        <div class="flex space-x-3">
          <button
            @click="showOAuthModal = false" 
            class="flex-1 py-2 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition duration-200">
            取消
          </button>
          <button
            @click="openAuthUrl" 
            class="flex-1 py-2 px-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition duration-200">
            前往授权
          </button>
        </div>
      </div>
      
      <div v-if="oauthStep === 2" class="space-y-4">
        <p class="text-sm text-gray-600">请粘贴从地址栏复制的授权码</p>
        <input
          v-model="authCode" type="text" 
          class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" 
          placeholder="粘贴授权码...">
        <div class="flex space-x-3">
          <button
            @click="showOAuthModal = false" 
            class="flex-1 py-2 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition duration-200">
            取消
          </button>
          <button
            @click="exchangeToken" :disabled="!authCode"
            class="flex-1 py-2 px-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
            完成授权
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useClaudeAccounts } from '../../composables/useClaudeAccounts'

// 使用 composable 来管理 Claude 账号相关逻辑
const {
  claudeAccounts,
  showAddAccountModal,
  showOAuthModal,
  oauthStep,
  newAccount,
  currentOAuthAccount,
  authCode,
  oauthData,
  addAccount,
  deleteAccount,
  startOAuthFlow,
  openAuthUrl,
  exchangeToken,
  refreshAccountToken,
  getAccountStatusClass,
  getAccountStatusText,
  formatDate
} = useClaudeAccounts()
</script>