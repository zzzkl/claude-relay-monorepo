/**
 * Claude API 代理路由
 * 实现 Claude API 的代理功能，支持智能路由到第三方模型供应商
 */

import { Hono } from 'hono'
import { ClaudeProxyService } from '../../services/proxy/claude-proxy'
import { optionalClientAuth, getClientId } from '../../middleware/client-auth'
import { ClientApiKeyService } from '../../services/admin/client-keys'
import type { Bindings } from '../../types/env'

const claudeRoutes = new Hono<{ Bindings: Bindings }>()

// 应用客户端认证中间件（可选的，如果提供了就验证）
claudeRoutes.use('/messages', optionalClientAuth())

/**
 * Claude Messages API 代理
 * POST /v1/messages - 代理 Claude API 消息请求
 */
claudeRoutes.post('/messages', async (c) => {
  const claudeService = new ClaudeProxyService(c.env.CLAUDE_RELAY_ADMIN_KV)
  
  // 获取客户端 ID
  const clientId = getClientId(c)
  
  // 代理请求，传递 clientId 以便记录 token 使用
  const response = await claudeService.proxyRequest(c.req.raw, clientId)
  
  return response
})

/**
 * 健康检查 - Claude API 代理状态
 * GET /v1/health
 */
claudeRoutes.get('/health', async (c) => {
  return c.json({
    status: 'ok',
    service: 'Claude API Proxy',
    timestamp: new Date().toISOString()
  })
})

export { claudeRoutes }