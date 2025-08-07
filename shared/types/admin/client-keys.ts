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
  // Token 统计字段
  totalInputTokens: number               // 该 Key 的总输入 tokens
  totalOutputTokens: number              // 该 Key 的总输出 tokens
  dailyTokenUsage: Record<string, {      // 按日期统计该 Key 的 token 使用
    requests: number
    inputTokens: number
    outputTokens: number
  }>
  monthlyTokenUsage: Record<string, {    // 按月统计（YYYY-MM 格式）
    requests: number
    inputTokens: number
    outputTokens: number
  }>
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

// 用量排行项
export interface ClientKeyRankingItem {
  keyId: string
  keyPreview: string
  description?: string
  value: number                    // 根据 metric 的值（请求数或 token 数）
  requests: number
  inputTokens: number
  outputTokens: number
  lastUsedAt?: number
  status: ClientApiKeyStatus
}

// 总体统计响应
export interface ClientKeysOverallStats {
  totalKeys: number
  activeKeys: number               // 今日有使用的 Keys
  todayRequests: number
  todayInputTokens: number
  todayOutputTokens: number
  weeklyTrend: {
    date: string
    requests: number
    inputTokens: number
    outputTokens: number
  }[]
}

// Token 历史记录
export interface TokenHistoryItem {
  date: string
  requests: number
  inputTokens: number
  outputTokens: number
}

// 用量排行请求参数
export interface UsageRankingParams {
  metric: 'requests' | 'input_tokens' | 'output_tokens' | 'total_tokens'
  period: 'today' | 'week' | 'month' | 'all'
  limit?: number
}