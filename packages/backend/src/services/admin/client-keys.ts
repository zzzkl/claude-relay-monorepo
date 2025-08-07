/**
 * 客户端 API Key 管理服务
 */

import { 
  ClientApiKey, 
  ClientApiKeyUsageStats,
  ClientApiKeyStatus,
  ClientApiKeyListItem,
  CreateClientKeyRequest,
  UpdateClientKeyRequest,
  ClientKeyRankingItem,
  ClientKeysOverallStats,
  UsageRankingParams,
  TokenHistoryItem
} from '../../../../../shared/types/admin/client-keys'
import { 
  CLIENT_KEY_ERRORS, 
  CLIENT_KEY_CONFIG 
} from '../../../../../shared/constants/admin/client-keys'
import { ClientApiKeyRepository } from '../../repositories/client-key-repository'

export class ClientApiKeyService {
  private repository: ClientApiKeyRepository

  constructor(adminKv: KVNamespace) {
    this.repository = new ClientApiKeyRepository(adminKv)
  }

  // 生成新的客户端 API Key
  async createKey(request: CreateClientKeyRequest, createdBy: string): Promise<ClientApiKey> {
    // 验证描述长度
    if (request.description && request.description.length > CLIENT_KEY_CONFIG.MAX_DESCRIPTION_LENGTH) {
      throw new Error(CLIENT_KEY_ERRORS.DESCRIPTION_TOO_LONG)
    }

    // 生成唯一的 Key 字符串
    const keyString = await this.generateSecureKey()
    const keyId = await this.generateKeyId()
    const now = Date.now()

    const newKey: ClientApiKey = {
      id: keyId,
      key: keyString,
      description: request.description,
      status: CLIENT_KEY_CONFIG.DEFAULT_STATUS,
      createdAt: now,
      usageCount: 0,
      createdBy
    }

    await this.repository.add(newKey)
    return newKey
  }

  // 获取所有 API Key 列表（用于管理界面显示）
  async getAllKeys(): Promise<ClientApiKeyListItem[]> {
    const keys = await this.repository.getAll()
    return keys.map(key => this.maskKeyForList(key))
  }

  // 根据 ID 获取 API Key 详情
  async getKeyById(keyId: string): Promise<ClientApiKey | null> {
    return this.repository.getById(keyId)
  }

  // 根据 ID 获取 API Key 详情（包含使用统计）
  async getKeyWithStats(keyId: string): Promise<{ key: ClientApiKey; stats: ClientApiKeyUsageStats } | null> {
    const key = await this.repository.getById(keyId)
    if (!key) {
      return null
    }

    const stats = await this.repository.getUsageStats(keyId)
    if (!stats) {
      throw new Error('Stats not found for key')
    }

    return { key, stats }
  }

  // 更新 API Key
  async updateKey(keyId: string, request: UpdateClientKeyRequest): Promise<ClientApiKey | null> {
    // 验证描述长度
    if (request.description && request.description.length > CLIENT_KEY_CONFIG.MAX_DESCRIPTION_LENGTH) {
      throw new Error(CLIENT_KEY_ERRORS.DESCRIPTION_TOO_LONG)
    }

    // 验证状态值
    if (request.status && !['active', 'disabled'].includes(request.status)) {
      throw new Error(CLIENT_KEY_ERRORS.INVALID_STATUS)
    }

    const success = await this.repository.update(keyId, request)
    if (!success) {
      throw new Error(CLIENT_KEY_ERRORS.KEY_NOT_FOUND)
    }

    return this.repository.getById(keyId)
  }

  // 删除 API Key
  async deleteKey(keyId: string): Promise<boolean> {
    const success = await this.repository.delete(keyId)
    if (!success) {
      throw new Error(CLIENT_KEY_ERRORS.KEY_NOT_FOUND)
    }
    return true
  }

  // 启用/禁用 API Key
  async toggleKeyStatus(keyId: string, status: ClientApiKeyStatus): Promise<ClientApiKey | null> {
    return this.updateKey(keyId, { status })
  }

  // 获取使用统计
  async getUsageStats(keyId: string): Promise<ClientApiKeyUsageStats | null> {
    const stats = await this.repository.getUsageStats(keyId)
    if (!stats) {
      throw new Error(CLIENT_KEY_ERRORS.KEY_NOT_FOUND)
    }
    return stats
  }

  // 记录 API Key 使用（由认证服务调用）
  async recordUsage(
    keyId: string,
    tokenUsage?: { inputTokens: number; outputTokens: number }
  ): Promise<void> {
    await Promise.all([
      this.repository.updateUsage(keyId),
      this.repository.updateUsageStats(keyId, tokenUsage)
    ])
  }

  // 生成安全的 API Key
  private async generateSecureKey(): Promise<string> {
    const array = new Uint8Array(CLIENT_KEY_CONFIG.KEY_LENGTH)
    crypto.getRandomValues(array)
    
    // 转换为 Base64URL 编码
    const base64 = btoa(String.fromCharCode(...array))
    const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    
    return `${CLIENT_KEY_CONFIG.KEY_PREFIX}${base64Url.substring(0, CLIENT_KEY_CONFIG.KEY_LENGTH)}`
  }

  // 生成唯一的 Key ID
  private async generateKeyId(): Promise<string> {
    const timestamp = Date.now().toString(36)
    const randomBytes = new Uint8Array(8)
    crypto.getRandomValues(randomBytes)
    const randomString = Array.from(randomBytes, b => b.toString(36)).join('')
    return `key_${timestamp}_${randomString}`
  }

  // 为列表显示遮蔽 API Key
  private maskKeyForList(key: ClientApiKey): ClientApiKeyListItem {
    const keyPreview = `${key.key.substring(0, 8)}****${key.key.substring(key.key.length - 8)}`
    
    return {
      id: key.id,
      keyPreview,
      description: key.description,
      status: key.status,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
      createdBy: key.createdBy
    }
  }

  // 验证 API Key 格式
  private isValidKeyFormat(keyString: string): boolean {
    return keyString.startsWith(CLIENT_KEY_CONFIG.KEY_PREFIX) && 
           keyString.length >= CLIENT_KEY_CONFIG.KEY_PREFIX.length + CLIENT_KEY_CONFIG.KEY_LENGTH
  }

  // 获取总体统计信息
  async getOverallStats(): Promise<ClientKeysOverallStats> {
    const keys = await this.repository.getAll()
    const today = new Date().toISOString().split('T')[0]
    
    const totalKeys = keys.length
    let activeKeys = 0
    let todayRequests = 0
    let todayInputTokens = 0
    let todayOutputTokens = 0
    
    // 计算最近7天的趋势
    const weeklyTrend: ClientKeysOverallStats['weeklyTrend'] = []
    const dates: string[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
      weeklyTrend.push({
        date: date.toISOString().split('T')[0],
        requests: 0,
        inputTokens: 0,
        outputTokens: 0
      })
    }
    
    // 遍历所有 Key 的统计信息
    for (const key of keys) {
      const stats = await this.repository.getUsageStats(key.id)
      if (!stats) continue
      
      // 检查今日是否有使用
      if (stats.dailyUsage && stats.dailyUsage[today]) {
        activeKeys++
        todayRequests += stats.dailyUsage[today]
      }
      
      // 统计今日 token 使用
      if (stats.dailyTokenUsage && stats.dailyTokenUsage[today]) {
        todayInputTokens += stats.dailyTokenUsage[today].inputTokens
        todayOutputTokens += stats.dailyTokenUsage[today].outputTokens
      }
      
      // 统计周趋势
      dates.forEach((date, index) => {
        if (stats.dailyTokenUsage && stats.dailyTokenUsage[date]) {
          weeklyTrend[index].requests += stats.dailyTokenUsage[date].requests
          weeklyTrend[index].inputTokens += stats.dailyTokenUsage[date].inputTokens
          weeklyTrend[index].outputTokens += stats.dailyTokenUsage[date].outputTokens
        }
      })
    }
    
    return {
      totalKeys,
      activeKeys,
      todayRequests,
      todayInputTokens,
      todayOutputTokens,
      weeklyTrend
    }
  }

  // 获取用量排行
  async getUsageRanking(params: UsageRankingParams): Promise<ClientKeyRankingItem[]> {
    const keys = await this.repository.getAll()
    const ranking: ClientKeyRankingItem[] = []
    const { metric, period, limit = 10 } = params
    
    // 计算时间范围
    const now = new Date()
    let startDate: string | null = null
    
    if (period === 'today') {
      startDate = now.toISOString().split('T')[0]
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      startDate = weekAgo.toISOString().split('T')[0]
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      startDate = monthAgo.toISOString().split('T')[0]
    }
    
    // 计算每个 Key 的指标值
    for (const key of keys) {
      const stats = await this.repository.getUsageStats(key.id)
      if (!stats) continue
      
      let value = 0
      let requests = 0
      let inputTokens = 0
      let outputTokens = 0
      
      if (period === 'all') {
        // 使用总计值
        requests = stats.totalRequests
        inputTokens = stats.totalInputTokens || 0
        outputTokens = stats.totalOutputTokens || 0
      } else {
        // 根据时间范围累计
        if (stats.dailyTokenUsage) {
          for (const [date, usage] of Object.entries(stats.dailyTokenUsage)) {
            if (startDate && date >= startDate) {
              requests += usage.requests
              inputTokens += usage.inputTokens
              outputTokens += usage.outputTokens
            }
          }
        }
      }
      
      // 根据指标计算排序值
      switch (metric) {
      case 'requests':
        value = requests
        break
      case 'input_tokens':
        value = inputTokens
        break
      case 'output_tokens':
        value = outputTokens
        break
      case 'total_tokens':
        value = inputTokens + outputTokens
        break
      }
      
      // 只添加有使用的 Key
      if (value > 0) {
        ranking.push({
          keyId: key.id,
          keyPreview: this.maskKeyForList(key).keyPreview,
          description: key.description,
          value,
          requests,
          inputTokens,
          outputTokens,
          lastUsedAt: key.lastUsedAt,
          status: key.status
        })
      }
    }
    
    // 排序并取前 N 个
    ranking.sort((a, b) => b.value - a.value)
    return ranking.slice(0, limit)
  }

  // 获取单个 Key 的 Token 使用历史
  async getTokenHistory(keyId: string, period: 'day' | 'week' | 'month'): Promise<TokenHistoryItem[]> {
    const stats = await this.repository.getUsageStats(keyId)
    if (!stats) {
      throw new Error(CLIENT_KEY_ERRORS.KEY_NOT_FOUND)
    }
    
    const history: TokenHistoryItem[] = []
    const now = new Date()
    
    let days = 1
    if (period === 'week') days = 7
    if (period === 'month') days = 30
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      if (stats.dailyTokenUsage && stats.dailyTokenUsage[dateStr]) {
        history.push({
          date: dateStr,
          requests: stats.dailyTokenUsage[dateStr].requests,
          inputTokens: stats.dailyTokenUsage[dateStr].inputTokens,
          outputTokens: stats.dailyTokenUsage[dateStr].outputTokens
        })
      } else {
        history.push({
          date: dateStr,
          requests: 0,
          inputTokens: 0,
          outputTokens: 0
        })
      }
    }
    
    return history
  }
}