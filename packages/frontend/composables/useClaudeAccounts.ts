import { ref } from 'vue'
import type { ClaudeAccount, AddClaudeAccountRequest } from '../../../shared/types/admin/claude-accounts'
import { API_ENDPOINTS } from '../../../shared/constants/endpoints'

export const useClaudeAccounts = () => {
  const config = useRuntimeConfig()
  
  // 响应式数据
  const claudeAccounts = ref<ClaudeAccount[]>([])
  const showAddAccountModal = ref(false)
  const showOAuthModal = ref(false)
  const oauthStep = ref(1) // 1: 打开授权链接, 2: 输入授权码
  const newAccount = ref<AddClaudeAccountRequest>({ name: '', description: '' })
  const currentOAuthAccount = ref<ClaudeAccount | null>(null)
  const authCode = ref('')
  const oauthData = ref<any>(null)

  // 通知函数（需要从父组件传入或使用全局通知系统）
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // 简单的通知实现
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-xl text-white font-medium shadow-lg transform translate-x-full transition-transform duration-300 ${
      type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-orange-500'
    }`
    notification.textContent = message
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.classList.remove('translate-x-full')
    }, 100)
    
    setTimeout(() => {
      notification.classList.add('translate-x-full')
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 3000)
  }

  // Claude 账号管理方法
  const loadClaudeAccounts = async () => {
    try {
      const response = await $fetch<{ success: boolean; data: ClaudeAccount[] }>(
        API_ENDPOINTS.ADMIN_CLAUDE_ACCOUNTS,
        { baseURL: config.public.apiBaseUrl }
      )
      if (response.success) {
        claudeAccounts.value = response.data
      }
    } catch (error) {
      console.error('Failed to load Claude accounts:', error)
    }
  }

  const addAccount = async () => {
    if (!newAccount.value.name.trim()) {
      showNotification('请输入账号名称', 'error')
      return
    }

    try {
      const response = await $fetch<{ success: boolean; data: ClaudeAccount }>(
        API_ENDPOINTS.ADMIN_CLAUDE_ACCOUNTS,
        {
          method: 'POST',
          baseURL: config.public.apiBaseUrl,
          body: newAccount.value
        }
      )
      
      if (response.success) {
        await loadClaudeAccounts()
        showAddAccountModal.value = false
        newAccount.value = { name: '', description: '' }
        showNotification('账号添加成功', 'success')
      }
    } catch (error) {
      console.error('Failed to add Claude account:', error)
      showNotification('添加账号失败', 'error')
    }
  }

  const deleteAccount = async (id: string) => {
    if (!confirm('确定要删除这个 Claude Code 账号吗？')) return
    
    try {
      const response = await $fetch<{ success: boolean }>(
        `${API_ENDPOINTS.ADMIN_CLAUDE_ACCOUNTS}/${id}`,
        {
          method: 'DELETE',
          baseURL: config.public.apiBaseUrl
        }
      )
      
      if (response.success) {
        await loadClaudeAccounts()
        showNotification('账号删除成功', 'success')
      }
    } catch (error) {
      console.error('Failed to delete Claude account:', error)
      showNotification('删除账号失败', 'error')
    }
  }

  const startOAuthFlow = async (account: ClaudeAccount) => {
    try {
      const response = await $fetch<{ success: boolean; data: any }>(
        API_ENDPOINTS.ADMIN_CLAUDE_GENERATE_AUTH,
        {
          method: 'POST',
          baseURL: config.public.apiBaseUrl,
          body: { accountId: account.id }
        }
      )
      
      if (response.success) {
        currentOAuthAccount.value = account
        oauthData.value = response.data
        oauthStep.value = 1
        showOAuthModal.value = true
      }
    } catch (error) {
      console.error('Failed to generate auth URL:', error)
      showNotification('生成授权链接失败', 'error')
    }
  }

  const openAuthUrl = () => {
    if (oauthData.value?.authUrl) {
      window.open(oauthData.value.authUrl, '_blank')
      oauthStep.value = 2
    }
  }

  const exchangeToken = async () => {
    if (!authCode.value.trim() || !currentOAuthAccount.value || !oauthData.value) {
      showNotification('请输入授权码', 'error')
      return
    }

    try {
      const response = await $fetch<{ success: boolean }>(
        API_ENDPOINTS.ADMIN_CLAUDE_EXCHANGE_TOKEN,
        {
          method: 'POST',
          baseURL: config.public.apiBaseUrl,
          body: {
            accountId: currentOAuthAccount.value.id,
            code: authCode.value,
            pkce: oauthData.value.pkce
          }
        }
      )
      
      if (response.success) {
        await loadClaudeAccounts()
        showOAuthModal.value = false
        authCode.value = ''
        oauthStep.value = 1
        currentOAuthAccount.value = null
        oauthData.value = null
        showNotification('授权成功', 'success')
      }
    } catch (error) {
      console.error('Failed to exchange token:', error)
      showNotification('授权失败，请检查授权码是否正确', 'error')
    }
  }

  const refreshAccountToken = async (accountId: string) => {
    try {
      const response = await $fetch<{ success: boolean }>(
        `${API_ENDPOINTS.ADMIN_CLAUDE_ACCOUNTS}/${accountId}/refresh`,
        {
          method: 'POST',
          baseURL: config.public.apiBaseUrl
        }
      )
      
      if (response.success) {
        await loadClaudeAccounts()
        showNotification('Token 刷新成功', 'success')
      }
    } catch (error) {
      console.error('Failed to refresh token:', error)
      showNotification('Token 刷新失败', 'error')
    }
  }

  // 工具方法
  const getAccountStatusClass = (status: string) => {
    switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700'
    case 'expired':
      return 'bg-yellow-100 text-yellow-700'
    case 'inactive':
    default:
      return 'bg-red-100 text-red-700'
    }
  }

  const getAccountStatusText = (status: string) => {
    switch (status) {
    case 'active':
      return '• 活跃'
    case 'expired':
      return '• 已过期'
    case 'inactive':
    default:
      return '• 未授权'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 初始化时加载数据
  loadClaudeAccounts()

  return {
    // 响应式数据
    claudeAccounts,
    showAddAccountModal,
    showOAuthModal,
    oauthStep,
    newAccount,
    currentOAuthAccount,
    authCode,
    oauthData,
    
    // 方法
    loadClaudeAccounts,
    addAccount,
    deleteAccount,
    startOAuthFlow,
    openAuthUrl,
    exchangeToken,
    refreshAccountToken,
    getAccountStatusClass,
    getAccountStatusText,
    formatDate
  }
}