/**
 * 客户端 API Key 认证服务
 */

import { ClientApiKey } from '../../../../../shared/types/admin/client-keys'
import { CLIENT_KEY_ERRORS } from '../../../../../shared/constants/admin/client-keys'
import { ClientApiKeyRepository } from '../../repositories/client-key-repository'

export interface ClientAuthResult {
  success: boolean
  clientKey?: ClientApiKey
  error?: string
}

export class ClientApiKeyAuthService {
  private repository: ClientApiKeyRepository

  constructor(adminKv: KVNamespace) {
    this.repository = new ClientApiKeyRepository(adminKv)
  }

  // 验证客户端 API Key
  async authenticate(keyString: string): Promise<ClientAuthResult> {
    if (!keyString || typeof keyString !== 'string') {
      return {
        success: false,
        error: CLIENT_KEY_ERRORS.KEY_INVALID
      }
    }

    try {
      // 从存储中获取 Key 信息
      const clientKey = await this.repository.getByKey(keyString)
      
      if (!clientKey) {
        return {
          success: false,
          error: CLIENT_KEY_ERRORS.KEY_NOT_FOUND
        }
      }

      // 检查 Key 是否被禁用
      if (clientKey.status === 'disabled') {
        return {
          success: false,
          error: CLIENT_KEY_ERRORS.KEY_DISABLED
        }
      }

      // 认证成功，更新使用统计
      await this.recordKeyUsage(clientKey.id)

      return {
        success: true,
        clientKey
      }
    } catch (error) {
      console.error('Client key authentication error:', error)
      return {
        success: false,
        error: CLIENT_KEY_ERRORS.KEY_INVALID
      }
    }
  }

  // 从请求头中提取 API Key
  extractApiKeyFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null
    }

    // 支持 Bearer token 格式: "Bearer ck_..."
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    if (bearerMatch) {
      return bearerMatch[1]
    }

    // 支持直接传递: "ck_..."
    if (authHeader.startsWith('ck_')) {
      return authHeader
    }

    return null
  }

  // 记录 Key 使用情况
  private async recordKeyUsage(keyId: string): Promise<void> {
    try {
      await Promise.all([
        this.repository.updateUsage(keyId),
        this.repository.updateUsageStats(keyId)
      ])
    } catch (error) {
      // 记录使用统计失败不应该影响认证结果，只记录错误
      console.error('Failed to record key usage:', error)
    }
  }

  // 验证 API Key 格式（基本格式检查）
  isValidKeyFormat(keyString: string): boolean {
    if (!keyString || typeof keyString !== 'string') {
      return false
    }
    
    // 检查是否以正确的前缀开始且长度合理
    return keyString.startsWith('ck_') && keyString.length >= 35 // ck_ + 32字符
  }
}