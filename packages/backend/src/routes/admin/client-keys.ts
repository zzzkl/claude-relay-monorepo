/**
 * 客户端 API Key 管理路由
 */

import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { HTTPException } from 'hono/http-exception'
import { ClientApiKeyService } from '../../services/admin/client-keys'
import { createSuccessResponse, createErrorResponse } from '../../utils/response'
import { 
  CreateClientKeyRequest, 
  UpdateClientKeyRequest,
  ClientApiKeyListResponse,
  ClientApiKeyDetailResponse 
} from '../../../../../shared/types/admin/client-keys'
import type { Bindings } from '../../types/env'

const clientKeysRoutes = new Hono<{ Bindings: Bindings }>()

// 获取总体统计信息
clientKeysRoutes.get('/stats', async (c) => {
  const service = new ClientApiKeyService(c.env.CLAUDE_RELAY_ADMIN_KV)
  
  try {
    const stats = await service.getOverallStats()
    return createSuccessResponse(stats, '获取统计信息成功')
  } catch (error: any) {
    console.error('Failed to get overall stats:', error)
    throw new HTTPException(500, {
      message: '获取统计信息失败'
    })
  }
})

// 获取用量排行
clientKeysRoutes.get('/usage-ranking', async (c) => {
  const service = new ClientApiKeyService(c.env.CLAUDE_RELAY_ADMIN_KV)
  
  const metric = c.req.query('metric') as 'requests' | 'input_tokens' | 'output_tokens' | 'total_tokens' || 'requests'
  const period = c.req.query('period') as 'today' | 'week' | 'month' | 'all' || 'all'
  const limit = parseInt(c.req.query('limit') || '10')
  
  try {
    const ranking = await service.getUsageRanking({ metric, period, limit })
    return createSuccessResponse(ranking, '获取用量排行成功')
  } catch (error: any) {
    console.error('Failed to get usage ranking:', error)
    throw new HTTPException(500, {
      message: '获取用量排行失败'
    })
  }
})

// 获取所有客户端 API Key 列表
clientKeysRoutes.get('/', async (c) => {
  try {
    const service = new ClientApiKeyService(c.env.CLAUDE_RELAY_ADMIN_KV)
    const keys = await service.getAllKeys()
    
    const response: ClientApiKeyListResponse = {
      keys,
      total: keys.length
    }
    
    return createSuccessResponse(response, '获取客户端 API Key 列表成功')
  } catch (error) {
    console.error('Failed to get client keys:', error)
    throw new HTTPException(500, {
      message: '获取客户端 API Key 列表失败'
    })
  }
})

// 创建新的客户端 API Key
clientKeysRoutes.post('/',
  validator('json', (value: any): CreateClientKeyRequest => {
    const { description } = value
    
    // 描述是可选的，但如果提供了要验证长度
    if (description && description.length > 200) {
      throw new HTTPException(400, {
        message: '描述长度不能超过200个字符'
      })
    }
    
    return { description }
  }),
  async (c) => {
    try {
      const request = c.req.valid('json')
      const service = new ClientApiKeyService(c.env.CLAUDE_RELAY_ADMIN_KV)
      
      // 从环境变量获取当前管理员用户名，或使用默认值
      const createdBy = c.env.ADMIN_USERNAME || 'admin'
      
      const newKey = await service.createKey(request, createdBy)
      
      return createSuccessResponse(newKey, '创建客户端 API Key 成功')
    } catch (error: any) {
      console.error('Failed to create client key:', error)
      
      if (error.message && error.message.includes('DESCRIPTION_TOO_LONG')) {
        throw new HTTPException(400, {
          message: '描述长度超过限制'
        })
      }
      
      throw new HTTPException(500, {
        message: '创建客户端 API Key 失败'
      })
    }
  }
)

// 获取单个客户端 API Key 详情
clientKeysRoutes.get('/:keyId', async (c) => {
  try {
    const keyId = c.req.param('keyId')
    const service = new ClientApiKeyService(c.env.CLAUDE_RELAY_ADMIN_KV)
    
    const keyData = await service.getKeyWithStats(keyId)
    
    if (!keyData) {
      throw new HTTPException(404, {
        message: '客户端 API Key 不存在'
      })
    }
    
    const response: ClientApiKeyDetailResponse = {
      ...keyData.key,
      stats: keyData.stats
    }
    
    return createSuccessResponse(response, '获取客户端 API Key 详情成功')
  } catch (error: any) {
    console.error('Failed to get client key details:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, {
      message: '获取客户端 API Key 详情失败'
    })
  }
})

// 更新客户端 API Key
clientKeysRoutes.put('/:keyId',
  validator('json', (value: any): UpdateClientKeyRequest => {
    const { description, status } = value
    
    // 验证描述长度
    if (description !== undefined && description.length > 200) {
      throw new HTTPException(400, {
        message: '描述长度不能超过200个字符'
      })
    }
    
    // 验证状态值
    if (status !== undefined && !['active', 'disabled'].includes(status)) {
      throw new HTTPException(400, {
        message: '无效的状态值'
      })
    }
    
    return { description, status }
  }),
  async (c) => {
    try {
      const keyId = c.req.param('keyId')
      const request = c.req.valid('json')
      const service = new ClientApiKeyService(c.env.CLAUDE_RELAY_ADMIN_KV)
      
      const updatedKey = await service.updateKey(keyId, request)
      
      if (!updatedKey) {
        throw new HTTPException(404, {
          message: '客户端 API Key 不存在'
        })
      }
      
      return createSuccessResponse(updatedKey, '更新客户端 API Key 成功')
    } catch (error: any) {
      console.error('Failed to update client key:', error)
      
      if (error instanceof HTTPException) {
        throw error
      }
      
      if (error.message && error.message.includes('KEY_NOT_FOUND')) {
        throw new HTTPException(404, {
          message: '客户端 API Key 不存在'
        })
      }
      
      throw new HTTPException(500, {
        message: '更新客户端 API Key 失败'
      })
    }
  }
)

// 删除客户端 API Key
clientKeysRoutes.delete('/:keyId', async (c) => {
  try {
    const keyId = c.req.param('keyId')
    const service = new ClientApiKeyService(c.env.CLAUDE_RELAY_ADMIN_KV)
    
    const success = await service.deleteKey(keyId)
    
    if (!success) {
      throw new HTTPException(404, {
        message: '客户端 API Key 不存在'
      })
    }
    
    return createSuccessResponse({ deleted: true }, '删除客户端 API Key 成功')
  } catch (error: any) {
    console.error('Failed to delete client key:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    if (error.message && error.message.includes('KEY_NOT_FOUND')) {
      throw new HTTPException(404, {
        message: '客户端 API Key 不存在'
      })
    }
    
    throw new HTTPException(500, {
      message: '删除客户端 API Key 失败'
    })
  }
})

// 启用/禁用客户端 API Key
clientKeysRoutes.post('/:keyId/toggle-status', async (c) => {
  try {
    const keyId = c.req.param('keyId')
    const service = new ClientApiKeyService(c.env.CLAUDE_RELAY_ADMIN_KV)
    
    // 先获取当前 Key 的状态
    const currentKey = await service.getKeyById(keyId)
    if (!currentKey) {
      throw new HTTPException(404, {
        message: '客户端 API Key 不存在'
      })
    }
    
    // 切换状态
    const newStatus = currentKey.status === 'active' ? 'disabled' : 'active'
    const updatedKey = await service.toggleKeyStatus(keyId, newStatus)
    
    return createSuccessResponse(updatedKey, `${newStatus === 'active' ? '启用' : '禁用'}客户端 API Key 成功`)
  } catch (error: any) {
    console.error('Failed to toggle client key status:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, {
      message: '切换客户端 API Key 状态失败'
    })
  }
})

// 获取客户端 API Key 使用统计
clientKeysRoutes.get('/:keyId/stats', async (c) => {
  try {
    const keyId = c.req.param('keyId')
    const service = new ClientApiKeyService(c.env.CLAUDE_RELAY_ADMIN_KV)
    
    const stats = await service.getUsageStats(keyId)
    
    if (!stats) {
      throw new HTTPException(404, {
        message: '客户端 API Key 不存在或无统计数据'
      })
    }
    
    return createSuccessResponse(stats, '获取使用统计成功')
  } catch (error: any) {
    console.error('Failed to get client key stats:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    if (error.message && error.message.includes('KEY_NOT_FOUND')) {
      throw new HTTPException(404, {
        message: '客户端 API Key 不存在'
      })
    }
    
    throw new HTTPException(500, {
      message: '获取使用统计失败'
    })
  }
})

// 获取单个 Key 的 Token 使用历史
clientKeysRoutes.get('/:keyId/token-history', async (c) => {
  try {
    const keyId = c.req.param('keyId')
    const period = c.req.query('period') as 'day' | 'week' | 'month' || 'week'
    const service = new ClientApiKeyService(c.env.CLAUDE_RELAY_ADMIN_KV)
    
    const history = await service.getTokenHistory(keyId, period)
    
    return createSuccessResponse(history, '获取 Token 使用历史成功')
  } catch (error: any) {
    console.error('Failed to get token history:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    if (error.message && error.message.includes('KEY_NOT_FOUND')) {
      throw new HTTPException(404, {
        message: '客户端 API Key 不存在'
      })
    }
    
    throw new HTTPException(500, {
      message: '获取 Token 使用历史失败'
    })
  }
})

export { clientKeysRoutes }