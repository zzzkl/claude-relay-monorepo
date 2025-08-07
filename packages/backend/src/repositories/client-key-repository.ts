/**
 * 客户端 API Key 数据访问层
 */

import { 
  ClientApiKey, 
  ClientApiKeyUsageStats,
  ClientApiKeyStatus 
} from '../../../../shared/types/admin/client-keys'
import { 
  ADMIN_STORAGE_KEYS,
  getClientKeyStorageKey,
  getClientKeyStatsKey,
  getClientKeyMappingKey
} from '../../../../shared/constants/admin/storage'

export class ClientApiKeyRepository {
  constructor(private adminKv: KVNamespace) {}

  // 获取所有客户端 API Key ID 列表
  private async getKeyIndexList(): Promise<string[]> {
    const data = await this.adminKv.get(ADMIN_STORAGE_KEYS.CLIENT_KEYS_INDEX)
    return data ? JSON.parse(data) : []
  }

  // 保存客户端 API Key ID 列表
  private async saveKeyIndexList(keyIds: string[]): Promise<void> {
    await this.adminKv.put(ADMIN_STORAGE_KEYS.CLIENT_KEYS_INDEX, JSON.stringify(keyIds))
  }

  // 获取所有客户端 API Key
  async getAll(): Promise<ClientApiKey[]> {
    const keyIds = await this.getKeyIndexList()
    const keys: ClientApiKey[] = []
    
    for (const keyId of keyIds) {
      const key = await this.getById(keyId)
      if (key) {
        keys.push(key)
      }
    }
    
    return keys
  }

  // 根据 ID 获取客户端 API Key
  async getById(keyId: string): Promise<ClientApiKey | null> {
    const data = await this.adminKv.get(getClientKeyStorageKey(keyId))
    return data ? JSON.parse(data) : null
  }

  // 根据 Key 字符串获取客户端 API Key（用于认证）
  async getByKey(keyString: string): Promise<ClientApiKey | null> {
    // 使用 Key 的哈希作为映射键来快速查找
    const keyHash = await this.hashKey(keyString)
    const mappingData = await this.adminKv.get(getClientKeyMappingKey(keyHash))
    
    if (!mappingData) {
      return null
    }
    
    const { keyId } = JSON.parse(mappingData)
    return this.getById(keyId)
  }

  // 添加新的客户端 API Key
  async add(key: ClientApiKey): Promise<void> {
    // 保存 Key 详情
    await this.adminKv.put(getClientKeyStorageKey(key.id), JSON.stringify(key))
    
    // 添加到索引列表
    const keyIds = await this.getKeyIndexList()
    keyIds.push(key.id)
    await this.saveKeyIndexList(keyIds)
    
    // 创建 Key 映射
    const keyHash = await this.hashKey(key.key)
    await this.adminKv.put(getClientKeyMappingKey(keyHash), JSON.stringify({ keyId: key.id }))
    
    // 初始化使用统计
    const initialStats: ClientApiKeyUsageStats = {
      keyId: key.id,
      dailyUsage: {},
      hourlyUsage: {},
      totalRequests: 0,
      lastUpdated: Date.now()
    }
    await this.saveUsageStats(initialStats)
  }

  // 更新客户端 API Key
  async update(keyId: string, updates: Partial<ClientApiKey>): Promise<boolean> {
    const existingKey = await this.getById(keyId)
    if (!existingKey) {
      return false
    }

    const updatedKey: ClientApiKey = {
      ...existingKey,
      ...updates,
      id: keyId, // 确保 ID 不被修改
      key: existingKey.key, // 确保 Key 不被修改
      createdAt: existingKey.createdAt, // 确保创建时间不被修改
      createdBy: existingKey.createdBy // 确保创建者不被修改
    }

    await this.adminKv.put(getClientKeyStorageKey(keyId), JSON.stringify(updatedKey))
    return true
  }

  // 删除客户端 API Key
  async delete(keyId: string): Promise<boolean> {
    const existingKey = await this.getById(keyId)
    if (!existingKey) {
      return false
    }

    // 删除 Key 详情
    await this.adminKv.delete(getClientKeyStorageKey(keyId))
    
    // 从索引列表中移除
    const keyIds = await this.getKeyIndexList()
    const updatedKeyIds = keyIds.filter(id => id !== keyId)
    await this.saveKeyIndexList(updatedKeyIds)
    
    // 删除 Key 映射
    const keyHash = await this.hashKey(existingKey.key)
    await this.adminKv.delete(getClientKeyMappingKey(keyHash))
    
    // 删除使用统计
    await this.adminKv.delete(getClientKeyStatsKey(keyId))
    
    return true
  }

  // 更新最后使用时间和使用次数
  async updateUsage(keyId: string): Promise<void> {
    const key = await this.getById(keyId)
    if (!key) {
      return
    }

    const now = Date.now()
    const updatedKey: ClientApiKey = {
      ...key,
      lastUsedAt: now,
      usageCount: key.usageCount + 1
    }

    await this.adminKv.put(getClientKeyStorageKey(keyId), JSON.stringify(updatedKey))
  }

  // 获取使用统计
  async getUsageStats(keyId: string): Promise<ClientApiKeyUsageStats | null> {
    const data = await this.adminKv.get(getClientKeyStatsKey(keyId))
    return data ? JSON.parse(data) : null
  }

  // 保存使用统计
  async saveUsageStats(stats: ClientApiKeyUsageStats): Promise<void> {
    await this.adminKv.put(getClientKeyStatsKey(stats.keyId), JSON.stringify(stats))
  }

  // 更新使用统计
  async updateUsageStats(keyId: string): Promise<void> {
    const stats = await this.getUsageStats(keyId)
    if (!stats) {
      return
    }

    const now = new Date()
    const dateKey = now.toISOString().split('T')[0] // YYYY-MM-DD
    const hourKey = now.getHours().toString().padStart(2, '0') // HH

    // 更新每日统计
    stats.dailyUsage[dateKey] = (stats.dailyUsage[dateKey] || 0) + 1
    
    // 更新每小时统计（保留最近24小时）
    stats.hourlyUsage[hourKey] = (stats.hourlyUsage[hourKey] || 0) + 1
    
    // 清理过期的每小时数据（保留最近24小时）
    const currentHour = now.getHours()
    Object.keys(stats.hourlyUsage).forEach(hour => {
      const hourNum = parseInt(hour)
      const hourDiff = currentHour >= hourNum ? currentHour - hourNum : 24 - hourNum + currentHour
      if (hourDiff > 24) {
        delete stats.hourlyUsage[hour]
      }
    })

    // 更新总计数和时间戳
    stats.totalRequests += 1
    stats.lastUpdated = Date.now()

    await this.saveUsageStats(stats)
  }

  // 检查 Key 是否存在
  async exists(keyString: string): Promise<boolean> {
    const key = await this.getByKey(keyString)
    return key !== null
  }

  // Key 哈希函数（用于映射存储）
  private async hashKey(keyString: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(keyString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}