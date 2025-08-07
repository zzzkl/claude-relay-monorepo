/**
 * 客户端 API Key 管理类型定义
 */

// 客户端 API Key 状态
export type ClientApiKeyStatus = 'active' | 'disabled'

// 客户端 API Key 实体
export interface ClientApiKey {
  id: string                        // 唯一标识符
  key: string                       // API Key (生成后不可修改)
  description?: string              // 用户自定义描述
  status: ClientApiKeyStatus        // 状态
  createdAt: number                // 创建时间戳
  lastUsedAt?: number              // 最后使用时间戳  
  usageCount: number               // 使用次数
  createdBy: string                // 创建者（管理员用户名）
}

// 客户端 API Key 使用统计
export interface ClientApiKeyUsageStats {
  keyId: string
  dailyUsage: Record<string, number>     // 按日期统计使用次数 (YYYY-MM-DD format)
  hourlyUsage: Record<string, number>    // 按小时统计（最近24小时，HH format）
  totalRequests: number                  // 总请求数
  lastUpdated: number                    // 最后更新时间
}

// API 请求类型
export interface CreateClientKeyRequest {
  description?: string
}

export interface UpdateClientKeyRequest {
  description?: string
  status?: ClientApiKeyStatus
}

// API 响应类型
export interface CreateClientKeyResponse {
  id: string
  key: string
  description?: string
  status: ClientApiKeyStatus
  createdAt: number
  usageCount: number
  createdBy: string
}

export interface ClientApiKeyListResponse {
  keys: ClientApiKeyListItem[]
  total: number
}

// 列表项类型（隐藏完整的 key）
export interface ClientApiKeyListItem {
  id: string
  keyPreview: string               // 显示前4位和后4位，中间用*号隐藏
  description?: string
  status: ClientApiKeyStatus
  createdAt: number
  lastUsedAt?: number
  usageCount: number
  createdBy: string
}

export interface ClientApiKeyDetailResponse extends ClientApiKey {
  stats: ClientApiKeyUsageStats
}