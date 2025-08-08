/**
 * Claude 官方 API Engine
 */

import type { Engine } from './types'
import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import type { ClaudeToken } from '../../../types/proxy'
import { HTTPException } from 'hono/http-exception'
import { TokenExpiredError } from '../../../utils/errors'
import { CachedKVStore } from '../../../utils/cached-kv-store'

export class ClaudeEngine implements Engine {
  private cachedKV: CachedKVStore
  private tokenCache: ClaudeToken | null = null
  private tokenCacheExpiry: number = 0
  
  constructor(private kv: KVNamespace) {
    // 创建缓存的 KV 存储，Claude token 缓存 30 分钟
    this.cachedKV = new CachedKVStore(kv, {
      maxSize: 50,
      defaultTTL: 30 * 60 * 1000  // 30 分钟
    })
  }
  
  async processRequest(request: MessageCreateParamsBase): Promise<Response> {
    const startTime = Date.now()
    
    // 1. 获取 token
    const tokenStart = Date.now()
    const token = await this.getValidToken()
    const tokenTime = Date.now() - tokenStart
    
    if (!token) {
      throw new TokenExpiredError('No valid Claude token available')
    }
    
    // 2. 转发请求
    const fetchStart = Date.now()
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
      },
      body: JSON.stringify(request)
    })
    
    // 3. 处理响应
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Claude API error: ${response.status}`, errorText)
      
      // 将Claude API错误转换为HTTPException
      throw new HTTPException(response.status as any, { 
        message: `Claude API error: ${errorText}` 
      })
    }
    
    const fetchTime = Date.now() - fetchStart
    const totalTime = Date.now() - startTime
    
    // 4. 返回响应（支持流式和非流式）
    const contentType = response.headers.get('Content-Type')
    const isStream = contentType?.includes('text/event-stream')
    
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        // 添加性能监控头
        'X-Token-Fetch-Time': `${tokenTime}ms`,
        'X-Claude-API-Time': `${fetchTime}ms`,
        'X-Total-Engine-Time': `${totalTime}ms`,
        'X-Token-Cache': this.tokenCache ? 'HIT' : 'MISS',
        ...(isStream && {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        })
      }
    })
  }
  
  private async getValidToken(): Promise<ClaudeToken | null> {
    // 1. 检查内存缓存的 token
    if (this.tokenCache && Date.now() < this.tokenCacheExpiry) {
      // Token 仍然有效
      if (Date.now() < this.tokenCache.expires_at) {
        return this.tokenCache
      }
      // Token 过期了，清除缓存
      this.tokenCache = null
    }
    
    // 2. 获取所有 Claude 账号（使用缓存）
    const accountIds = await this.cachedKV.get<string[]>('claude_account_ids', 5 * 60 * 1000)  // 缓存 5 分钟
    if (!accountIds) return null
    
    // 3. 批量获取所有 token（并行）
    const tokenKeys = accountIds.map(id => `claude_account_token:${id}`)
    const tokens = await this.cachedKV.getMany<ClaudeToken>(tokenKeys, 30 * 60 * 1000)  // 缓存 30 分钟
    
    // 4. 找到第一个有效的 token
    for (const [key, token] of tokens) {
      if (!token) continue
      
      // 检查 token 是否过期
      if (Date.now() > token.expires_at) {
        const accountId = key.replace('claude_account_token:', '')
        console.log(`Claude account ${accountId} token expired`)
        continue
      }
      
      // 缓存有效的 token
      this.tokenCache = token
      // 设置缓存过期时间为 token 过期前 5 分钟或 30 分钟，取较小值
      const ttl = Math.min(
        token.expires_at - Date.now() - 5 * 60 * 1000,  // token 过期前 5 分钟
        30 * 60 * 1000  // 最多缓存 30 分钟
      )
      this.tokenCacheExpiry = Date.now() + Math.max(ttl, 60 * 1000)  // 至少缓存 1 分钟
      
      const accountId = key.replace('claude_account_token:', '')
      console.log(`Using Claude account ${accountId} token (cached)`)
      return token
    }
    
    return null
  }
  
}
