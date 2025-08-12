/**
 * 存储键常量
 */

export const ADMIN_STORAGE_KEYS = {
  // 基础配置
  MODEL_PROVIDERS: 'admin_model_providers',
  SELECTED_MODEL: 'admin_selected_model',
  CLAUDE_ACCOUNTS: 'admin_claude_accounts',
  
  // Provider 相关存储键
  PROVIDER_PREFIX: 'admin_provider_',
  
  // Claude 账号相关存储键
  CLAUDE_ACCOUNT_TOKEN_PREFIX: 'claude_account_',
  CLAUDE_ACCOUNT_TOKEN_SUFFIX: '_token',
  
  // Key Pool 相关存储键
  KEY_POOL_PREFIX: 'key_pool_provider_',
  KEY_POOL_CONFIG_SUFFIX: '_config',
  KEY_POOL_KEYS_SUFFIX: '_keys',
  
  // 客户端 API Key 相关存储键
  CLIENT_KEYS_INDEX: 'admin_client_api_keys_index',
  CLIENT_KEY_PREFIX: 'admin_client_api_key_',
  CLIENT_KEY_STATS_PREFIX: 'admin_client_api_key_stats_',
  CLIENT_KEY_MAPPING_PREFIX: 'admin_client_api_key_map_'
} as const

// 辅助函数：生成存储键
export const getProviderStorageKey = (providerId: string) => 
  `${ADMIN_STORAGE_KEYS.PROVIDER_PREFIX}${providerId}`

export const getClaudeAccountTokenKey = (accountId: string) =>
  `${ADMIN_STORAGE_KEYS.CLAUDE_ACCOUNT_TOKEN_PREFIX}${accountId}${ADMIN_STORAGE_KEYS.CLAUDE_ACCOUNT_TOKEN_SUFFIX}`

export const getKeyPoolStorageKey = (providerId: string) =>
  `${ADMIN_STORAGE_KEYS.KEY_POOL_PREFIX}${providerId}`

export const getKeyPoolConfigKey = (providerId: string) =>
  `${ADMIN_STORAGE_KEYS.KEY_POOL_PREFIX}${providerId}${ADMIN_STORAGE_KEYS.KEY_POOL_CONFIG_SUFFIX}`

export const getKeyPoolKeysKey = (providerId: string) =>
  `${ADMIN_STORAGE_KEYS.KEY_POOL_PREFIX}${providerId}${ADMIN_STORAGE_KEYS.KEY_POOL_KEYS_SUFFIX}`

// 客户端 API Key 存储键辅助函数
export const getClientKeyStorageKey = (keyId: string) =>
  `${ADMIN_STORAGE_KEYS.CLIENT_KEY_PREFIX}${keyId}`

export const getClientKeyStatsKey = (keyId: string) =>
  `${ADMIN_STORAGE_KEYS.CLIENT_KEY_STATS_PREFIX}${keyId}`

export const getClientKeyMappingKey = (keyHash: string) =>
  `${ADMIN_STORAGE_KEYS.CLIENT_KEY_MAPPING_PREFIX}${keyHash}`