/**
 * 客户端 API Key 认证中间件
 */
import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Bindings } from '../types/env'
import { ClientApiKeyAuthService } from '../services/auth/client-auth'
import { CLIENT_KEY_ERRORS } from '../../../../shared/constants/admin/client-keys'

// 扩展 Hono 上下文，添加客户端信息
declare module 'hono' {
  interface HonoRequest {
    clientId?: string
    clientKey?: string
  }
}

export interface ClientAuthMiddlewareOptions {
  required?: boolean // 是否必须提供客户端认证
  skipPaths?: string[] // 跳过认证的路径
}

/**
 * 客户端 API Key 认证中间件
 * 可以与现有的管理员认证并存
 */
export const clientAuthMiddleware = (options: ClientAuthMiddlewareOptions = {}) => {
  const { required = false, skipPaths = [] } = options

  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const path = c.req.path
    
    // 检查是否跳过认证
    if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
      await next()
      return
    }

    // 检查是否有 KV 存储
    if (!c.env.CLAUDE_RELAY_ADMIN_KV) {
      throw new HTTPException(500, {
        message: 'Service configuration error'
      })
    }

    const authService = new ClientApiKeyAuthService(c.env.CLAUDE_RELAY_ADMIN_KV)
    
    // 从请求头中提取 API Key
    const authHeader = c.req.header('Authorization')
    const apiKey = authService.extractApiKeyFromHeader(authHeader)

    // 如果没有提供 API Key
    if (!apiKey) {
      if (required) {
        throw new HTTPException(401, {
          message: 'Client API key is required'
        })
      }
      // 可选认证，继续处理请求
      await next()
      return
    }

    // 验证 API Key
    const authResult = await authService.authenticate(apiKey)
    
    if (!authResult.success) {
      let statusCode = 401
      let message = 'Authentication failed'

      switch (authResult.error) {
      case CLIENT_KEY_ERRORS.KEY_NOT_FOUND:
      case CLIENT_KEY_ERRORS.KEY_INVALID:
        statusCode = 401
        message = 'Invalid API key'
        break
      case CLIENT_KEY_ERRORS.KEY_DISABLED:
        statusCode = 403
        message = 'API key has been disabled'
        break
      default:
        statusCode = 401
        message = 'Authentication failed'
      }

      throw new HTTPException(statusCode as 401 | 403, { message })
    }

    // 认证成功，将客户端信息添加到请求上下文
    if (authResult.clientKey) {
      c.req.clientId = authResult.clientKey.id
      c.req.clientKey = authResult.clientKey.key
    }

    await next()
  }
}

/**
 * 严格的客户端认证中间件 - 必须提供有效的客户端 API Key
 */
export const requireClientAuth = () => clientAuthMiddleware({ required: true })

/**
 * 可选的客户端认证中间件 - 如果提供了 Key 就验证，没提供就跳过
 */
export const optionalClientAuth = (skipPaths?: string[]) => 
  clientAuthMiddleware({ required: false, skipPaths })

/**
 * 检查当前请求是否已通过客户端认证
 */
export const isClientAuthenticated = (c: Context): boolean => {
  return !!c.req.clientId
}

/**
 * 获取当前请求的客户端 ID
 */
export const getClientId = (c: Context): string | undefined => {
  return c.req.clientId
}