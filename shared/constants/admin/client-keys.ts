/**
 * 客户端 API Key 相关常量
 */

// 客户端 API Key 错误类型
export const CLIENT_KEY_ERRORS = {
  KEY_NOT_FOUND: 'CLIENT_KEY_NOT_FOUND',
  KEY_DISABLED: 'CLIENT_KEY_DISABLED', 
  KEY_INVALID: 'CLIENT_KEY_INVALID',
  KEY_EXISTS: 'CLIENT_KEY_EXISTS',
  GENERATION_FAILED: 'CLIENT_KEY_GENERATION_FAILED',
  INVALID_STATUS: 'CLIENT_KEY_INVALID_STATUS',
  DESCRIPTION_TOO_LONG: 'CLIENT_KEY_DESCRIPTION_TOO_LONG'
} as const

// 客户端 API Key 配置常量
export const CLIENT_KEY_CONFIG = {
  KEY_LENGTH: 32,                    // API Key 长度
  KEY_PREFIX: 'ck_',                 // API Key 前缀
  MAX_DESCRIPTION_LENGTH: 200,       // 描述最大长度
  STATS_RETENTION_DAYS: 30,          // 统计数据保留天数
  DEFAULT_STATUS: 'active' as const  // 默认状态
} as const

export type ClientKeyErrorType = keyof typeof CLIENT_KEY_ERRORS