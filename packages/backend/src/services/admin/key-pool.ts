/**
 * Key Pool 管理服务
 * 处理 API Key 池的所有管理操作
 */

import { KeyPoolManager } from '../key-pool/key-pool-manager'
import { ModelProvider } from '../../../../../shared/types/admin/providers'
import { ApiKeyStatus, KeyPoolStats } from '../../../../../shared/types/key-pool'
import { ADMIN_STORAGE_KEYS } from '../../../../../shared/constants/admin/storage'
import { ValidationError } from '../../utils/errors'

export class KeyPoolService {
  private keyPoolManager: KeyPoolManager

  constructor(private kv: KVNamespace) {
    this.keyPoolManager = new KeyPoolManager(kv)
  }

  /**
   * 获取指定供应商的 Key Pool 状态
   */
  async getKeyPoolStatus(providerId: string) {
    console.log(`[KeyPoolService] Getting key pool status for provider: ${providerId}`)
    
    // 获取供应商信息
    const provider = await this.getProvider(providerId)
    console.log('[KeyPoolService] Provider found:', provider ? provider.name : 'NOT FOUND')
    
    if (!provider) {
      console.error(`[KeyPoolService] Provider ${providerId} not found`)
      throw new ValidationError('供应商不存在')
    }

    // 获取或创建 Key Pool
    console.log(`[KeyPoolService] Getting or creating key pool for ${providerId} (type: ${provider.type})`)
    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)
    
    // 获取所有密钥和统计信息
    console.log('[KeyPoolService] Loading keys and stats...')
    const keys = await pool.getKeys()
    const stats = await pool.getStats()
    
    console.log(`[KeyPoolService] Keys count: ${keys.length}, Stats:`, stats)

    return {
      providerId,
      providerName: provider.name,
      keys,
      stats,
      hasKeys: keys.length > 0
    }
  }

  /**
   * 添加新的 API Key
   */
  async addKey(providerId: string, key: string, status?: ApiKeyStatus) {
    const provider = await this.getProvider(providerId)
    if (!provider) {
      throw new ValidationError('供应商不存在')
    }

    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)
    return await pool.addKey(key, status)
  }

  /**
   * 更新 Key 状态
   */
  async updateKeyStatus(providerId: string, keyId: string, status?: ApiKeyStatus, errorMessage?: string) {
    const provider = await this.getProvider(providerId)
    if (!provider) {
      throw new ValidationError('供应商不存在')
    }

    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)
    
    if (status) {
      await pool.updateKeyStatus(keyId, status, errorMessage)
    }
  }

  /**
   * 删除 API Key
   */
  async removeKey(providerId: string, keyId: string) {
    const provider = await this.getProvider(providerId)
    if (!provider) {
      throw new ValidationError('供应商不存在')
    }

    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)
    await pool.removeKey(keyId)
  }

  /**
   * 批量添加 API Keys
   */
  async batchAddKeys(providerId: string, keys: string[]) {
    const provider = await this.getProvider(providerId)
    if (!provider) {
      throw new ValidationError('供应商不存在')
    }

    if (!keys || keys.length === 0) {
      throw new ValidationError('请提供至少一个 API Key')
    }

    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)
    return await pool.addKeys(keys)
  }

  /**
   * 批量操作
   */
  async batchOperation(providerId: string, keyIds: string[], operation: 'enable' | 'disable' | 'delete') {
    const provider = await this.getProvider(providerId)
    if (!provider) {
      throw new ValidationError('供应商不存在')
    }

    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)

    for (const keyId of keyIds) {
      switch (operation) {
      case 'enable':
        await pool.updateKeyStatus(keyId, 'active')
        break
      case 'disable':
        await pool.updateKeyStatus(keyId, 'disabled')
        break
      case 'delete':
        await pool.removeKey(keyId)
        break
      }
    }
  }

  /**
   * 获取统计信息
   */
  async getKeyPoolStats(providerId: string): Promise<KeyPoolStats> {
    const provider = await this.getProvider(providerId)
    if (!provider) {
      throw new ValidationError('供应商不存在')
    }

    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)
    return await pool.getStats()
  }

  /**
   * 执行维护任务
   */
  async performMaintenance(providerId: string) {
    const provider = await this.getProvider(providerId)
    if (!provider) {
      throw new ValidationError('供应商不存在')
    }

    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)
    
    // 重置过期的密钥
    await pool.resetExhaustedKeys()
    
    // 清理错误的密钥（如果实现了）
    if ('cleanupErrorKeys' in pool && typeof pool.cleanupErrorKeys === 'function') {
      await pool.cleanupErrorKeys()
    }
  }

  /**
   * 获取供应商信息
   */
  private async getProvider(providerId: string): Promise<ModelProvider | null> {
    console.log(`[KeyPoolService.getProvider] Looking for provider: ${providerId}`)
    
    const providersData = await this.kv.get(ADMIN_STORAGE_KEYS.MODEL_PROVIDERS)
    
    if (!providersData) {
      console.log('[KeyPoolService.getProvider] No providers found in KV')
      return null
    }
    
    // 解析数据
    let providers: ModelProvider[] = []
    try {
      const parsed = typeof providersData === 'string' ? JSON.parse(providersData) : providersData
      providers = Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('[KeyPoolService.getProvider] Failed to parse providers data:', error)
      return null
    }
    
    console.log(`[KeyPoolService.getProvider] Found ${providers.length} providers in KV`)
    
    if (providers.length > 0) {
      console.log('[KeyPoolService.getProvider] Available provider IDs:', providers.map(p => p.id))
    }
    
    const provider = providers.find(p => p.id === providerId)
    console.log(`[KeyPoolService.getProvider] Provider ${providerId} found:`, provider ? 'YES' : 'NO')
    
    return provider || null
  }
}