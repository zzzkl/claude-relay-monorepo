/**
 * Key Pool 管理器
 * 统一管理所有供应商的 Key Pool
 */

import { BaseKeyPool } from './base-key-pool'
import { GeminiKeyPool } from './gemini-key-pool'
import { OpenAIKeyPool } from './openai-key-pool'
import { ModelProvider } from '../../../../../shared/types/admin/providers'

export class KeyPoolManager {
  private pools: Map<string, BaseKeyPool> = new Map()
  private kv: KVNamespace

  constructor(kv: KVNamespace) {
    this.kv = kv
  }

  /**
   * 获取或创建 Key Pool
   */
  async getOrCreatePool(providerId: string, providerType: 'openai' | 'gemini'): Promise<BaseKeyPool> {
    // 检查缓存
    if (this.pools.has(providerId)) {
      return this.pools.get(providerId)!
    }

    // 创建新的 Pool
    const pool = this.createPool(providerId, providerType)
    this.pools.set(providerId, pool)
    
    console.log(`📦 Created ${providerType} key pool for provider ${providerId}`)
    return pool
  }

  /**
   * 获取已存在的 Key Pool
   */
  getPool(providerId: string): BaseKeyPool | null {
    return this.pools.get(providerId) || null
  }

  /**
   * 创建特定类型的 Key Pool
   */
  private createPool(providerId: string, providerType: 'openai' | 'gemini'): BaseKeyPool {
    switch (providerType) {
    case 'gemini':
      return new GeminiKeyPool(providerId, this.kv)
    case 'openai':
    default:
      return new OpenAIKeyPool(providerId, this.kv)
    }
  }

  /**
   * 从供应商配置初始化 Key Pool
   */
  async initializeFromProvider(provider: ModelProvider): Promise<BaseKeyPool> {
    const pool = await this.getOrCreatePool(provider.id, provider.type)
    // 不再自动添加密钥，所有密钥通过 Key Pool API 管理
    return pool
  }

  /**
   * 移除 Key Pool
   */
  async removePool(providerId: string): Promise<void> {
    this.pools.delete(providerId)
    
    // 删除 KV 中的数据
    const storageKey = `key_pool_${providerId}`
    await this.kv.delete(storageKey)
    
    console.log(`🗑️ Removed key pool for provider ${providerId}`)
  }

  /**
   * 获取所有 Pool 的统计信息
   */
  async getAllPoolStats(): Promise<Map<string, any>> {
    const stats = new Map()
    
    for (const [providerId, pool] of this.pools) {
      stats.set(providerId, await pool.getStats())
    }
    
    return stats
  }

  /**
   * 定期维护任务
   */
  async performMaintenance(): Promise<void> {
    console.log('🔧 Performing key pool maintenance...')
    
    for (const [providerId, pool] of this.pools) {
      try {
        // 重置过期的 Keys
        await pool.resetExhaustedKeys()
        
        // 清理错误的 Keys（如果实现了）
        if ('cleanupErrorKeys' in pool && typeof pool.cleanupErrorKeys === 'function') {
          await pool.cleanupErrorKeys()
        }
      } catch (error) {
        console.error(`Error during maintenance for pool ${providerId}:`, error)
      }
    }
    
    console.log('✅ Key pool maintenance completed')
  }

  /**
   * 处理请求错误（带 Key Pool 支持）
   */
  async handleRequestError(providerId: string, keyId: string, error: any): Promise<void> {
    const pool = this.pools.get(providerId)
    
    if (pool && 'handleRequestError' in pool) {
      await (pool as GeminiKeyPool | OpenAIKeyPool).handleRequestError(keyId, error)
    } else {
      console.warn(`No error handler for pool ${providerId}`)
    }
  }

  /**
   * 批量导入 Keys
   */
  async batchImportKeys(providerId: string, keys: string[]): Promise<string[]> {
    const pool = this.pools.get(providerId)
    
    if (!pool) {
      throw new Error(`Pool ${providerId} not found`)
    }
    
    return await pool.addKeys(keys)
  }

  /**
   * 获取健康的 Key 数量
   */
  async getHealthyKeyCount(providerId: string): Promise<number> {
    const pool = this.pools.get(providerId)
    
    if (!pool) {
      return 0
    }
    
    const keys = await pool.getKeys()
    return keys.filter(k => k.status === 'active').length
  }

  /**
   * 记录成功的请求统计
   */
  async recordSuccess(providerId: string, providerType: 'openai' | 'gemini', keyId: string): Promise<void> {
    const pool = await this.getOrCreatePool(providerId, providerType)
    await pool.updateKeyStats(keyId, true)
  }

  /**
   * 记录失败的请求统计（调用 handleRequestError）
   */
  async recordFailure(providerId: string, keyId: string, error: Error): Promise<void> {
    await this.handleRequestError(providerId, keyId, error)
  }
}