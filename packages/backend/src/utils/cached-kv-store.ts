/**
 * 带缓存的 KV 存储封装
 * 使用 LRU 缓存策略减少 KV 读取延迟
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
  key: string
}

interface CacheOptions {
  maxSize?: number  // 最大缓存条目数
  defaultTTL?: number  // 默认 TTL（毫秒）
}

export class CachedKVStore {
  private cache: Map<string, CacheEntry<any>>
  private accessOrder: string[]  // LRU 访问顺序
  private maxSize: number
  private defaultTTL: number
  
  constructor(
    private kv: KVNamespace,
    options: CacheOptions = {}
  ) {
    this.cache = new Map()
    this.accessOrder = []
    this.maxSize = options.maxSize || 100
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000  // 默认 5 分钟
  }
  
  /**
   * 获取值（带缓存）
   */
  async get<T = any>(key: string, ttl?: number): Promise<T | null> {
    // 1. 检查缓存
    const cached = this.getFromCache<T>(key)
    if (cached !== null) {
      return cached
    }
    
    // 2. 从 KV 读取
    const value = await this.kv.get(key)
    if (value === null) {
      return null
    }
    
    // 3. 解析并缓存
    try {
      const parsed = JSON.parse(value) as T
      this.setCache(key, parsed, ttl || this.defaultTTL)
      return parsed
    } catch {
      // 如果不是 JSON，直接返回字符串
      this.setCache(key, value as any, ttl || this.defaultTTL)
      return value as any
    }
  }
  
  /**
   * 获取原始值（不解析 JSON）
   */
  async getRaw(key: string, ttl?: number): Promise<string | null> {
    // 1. 检查缓存
    const cached = this.getFromCache<string>(key)
    if (cached !== null) {
      return cached
    }
    
    // 2. 从 KV 读取
    const value = await this.kv.get(key)
    if (value === null) {
      return null
    }
    
    // 3. 缓存
    this.setCache(key, value, ttl || this.defaultTTL)
    return value
  }
  
  /**
   * 设置值（同时更新缓存）
   */
  async put<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    
    // 1. 写入 KV
    await this.kv.put(key, stringValue)
    
    // 2. 更新缓存
    this.setCache(key, value, ttl || this.defaultTTL)
  }
  
  /**
   * 删除值（同时清除缓存）
   */
  async delete(key: string): Promise<void> {
    // 1. 从 KV 删除
    await this.kv.delete(key)
    
    // 2. 清除缓存
    this.removeFromCache(key)
  }
  
  /**
   * 批量获取（优化批量读取）
   */
  async getMany<T = any>(keys: string[], ttl?: number): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>()
    const missingKeys: string[] = []
    
    // 1. 先从缓存获取
    for (const key of keys) {
      const cached = this.getFromCache<T>(key)
      if (cached !== null) {
        results.set(key, cached)
      } else {
        missingKeys.push(key)
      }
    }
    
    // 2. 批量获取缺失的键（并行）
    if (missingKeys.length > 0) {
      const promises = missingKeys.map(key => this.get<T>(key, ttl))
      const values = await Promise.all(promises)
      
      missingKeys.forEach((key, index) => {
        results.set(key, values[index])
      })
    }
    
    return results
  }
  
  /**
   * 从缓存获取
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.removeFromCache(key)
      return null
    }
    
    // 更新 LRU 访问顺序
    this.updateAccessOrder(key)
    
    return entry.value
  }
  
  /**
   * 设置缓存
   */
  private setCache<T>(key: string, value: T, ttl: number): void {
    // LRU：如果缓存满了，删除最久未访问的
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.accessOrder[0]
      if (lruKey) {
        this.removeFromCache(lruKey)
      }
    }
    
    // 设置缓存
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      key
    })
    
    // 更新访问顺序
    this.updateAccessOrder(key)
  }
  
  /**
   * 从缓存移除
   */
  private removeFromCache(key: string): void {
    this.cache.delete(key)
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }
  
  /**
   * 更新 LRU 访问顺序
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)
  }
  
  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear()
    this.accessOrder = []
  }
  
  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    size: number
    maxSize: number
    hitRate: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0  // 可以添加命中率统计
    }
  }
  
  /**
   * 预热缓存（批量加载常用数据）
   */
  async warmup(keys: string[], ttl?: number): Promise<void> {
    await this.getMany(keys, ttl)
  }
}

/**
 * 创建针对特定数据类型的缓存存储
 */
export class TypedCachedKVStore<T> {
  constructor(
    private store: CachedKVStore,
    private prefix: string
  ) {}
  
  async get(id: string, ttl?: number): Promise<T | null> {
    return this.store.get<T>(`${this.prefix}:${id}`, ttl)
  }
  
  async put(id: string, value: T, ttl?: number): Promise<void> {
    return this.store.put(`${this.prefix}:${id}`, value, ttl)
  }
  
  async delete(id: string): Promise<void> {
    return this.store.delete(`${this.prefix}:${id}`)
  }
}