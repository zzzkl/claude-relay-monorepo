/**
 * 客户端 API Key 管理服务
 */

import { 
  ClientApiKey, 
  ClientApiKeyUsageStats,
  ClientApiKeyStatus,
  ClientApiKeyListItem,
  CreateClientKeyRequest,
  UpdateClientKeyRequest 
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
  async recordUsage(keyId: string): Promise<void> {
    await Promise.all([
      this.repository.updateUsage(keyId),
      this.repository.updateUsageStats(keyId)
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
}