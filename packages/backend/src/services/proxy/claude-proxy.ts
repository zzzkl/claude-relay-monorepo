/**
 * Claude API 代理服务 - Engine 架构版本
 */

import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import type { SelectedConfig } from './engines/types'
import { ClaudeEngine, ProviderEngine } from './engines'
import { ValidationError } from '../../utils/errors'
import { ClientApiKeyService } from '../admin/client-keys'
import { CachedKVStore } from '../../utils/cached-kv-store'

// 全局实例缓存
const serviceInstances = new Map<string, any>()

export class ClaudeProxyService {
  private claudeEngine: ClaudeEngine
  private providerEngine: ProviderEngine
  private clientKeyService: ClientApiKeyService
  private cachedKV: CachedKVStore
  private cacheHit: boolean = false
  
  constructor(private kv: KVNamespace) {
    const kvId = kv.constructor.name // 使用 KV 实例作为缓存键
    
    // 复用或创建 ClaudeEngine 实例
    const claudeKey = `claude_${kvId}`
    if (!serviceInstances.has(claudeKey)) {
      serviceInstances.set(claudeKey, new ClaudeEngine(kv))
    }
    this.claudeEngine = serviceInstances.get(claudeKey)
    
    // 复用或创建 ProviderEngine 实例
    const providerKey = `provider_${kvId}`
    if (!serviceInstances.has(providerKey)) {
      serviceInstances.set(providerKey, new ProviderEngine(kv))
    }
    this.providerEngine = serviceInstances.get(providerKey)
    
    // 复用或创建 ClientApiKeyService 实例
    const clientKey = `client_${kvId}`
    if (!serviceInstances.has(clientKey)) {
      serviceInstances.set(clientKey, new ClientApiKeyService(kv))
    }
    this.clientKeyService = serviceInstances.get(clientKey)
    
    // 复用或创建 CachedKVStore 实例
    const cachedKey = `cached_${kvId}`
    if (!serviceInstances.has(cachedKey)) {
      serviceInstances.set(cachedKey, new CachedKVStore(kv, {
        maxSize: 20,
        defaultTTL: 5 * 60 * 1000  // 5 分钟
      }))
    }
    this.cachedKV = serviceInstances.get(cachedKey)
  }
  
  /**
   * 代理请求到适当的 API 端点
   * @param request 原始请求
   * @param clientId 客户端 ID（如果有）
   * @param ctx 执行上下文（用于异步任务）
   */
  async proxyRequest(request: Request, clientId?: string, ctx?: ExecutionContext): Promise<Response> {
    const startTime = Date.now()
    
    // 解析请求
    const claudeRequest = await request.json() as MessageCreateParamsBase
    
    // 获取选择的配置（使用缓存）
    const selectedConfig = await this.getSelectedConfigCached()
    
    let response: Response
    
    // 优化：默认使用 Claude，减少判断开销
    if (!selectedConfig || selectedConfig.type === 'claude') {
      // 直接调用 Claude Engine，跳过不必要的中间层
      const engineStartTime = Date.now()
      response = await this.claudeEngine.processRequest(claudeRequest)
      console.log(`Claude Engine processed in ${Date.now() - engineStartTime}ms`)
    } else if (selectedConfig.type === 'route') {
      response = await this.providerEngine.processRequest(claudeRequest)
    } else {
      throw new ValidationError(`Unknown configuration type: ${selectedConfig.type}`)
    }
    
    // 如果有 clientId，异步记录 token 使用
    if (clientId && ctx) {
      // 使用 waitUntil 在后台异步执行，不阻塞响应
      ctx.waitUntil(
        this.extractAndRecordTokenUsage(response.clone(), clientId, claudeRequest.stream || false)
          .catch(error => {
            // 记录错误但不影响主流程
            console.error('Failed to record token usage for client:', clientId, error)
          })
      )
    } else if (clientId && !ctx) {
      // 如果没有 ctx，降级为同步处理（保持向后兼容）
      try {
        await this.extractAndRecordTokenUsage(response.clone(), clientId, claudeRequest.stream || false)
      } catch (error) {
        console.error('Failed to record token usage for client:', clientId, error)
      }
    }
    
    // 记录处理时间
    const processingTime = Date.now() - startTime
    console.log(`Request processed in ${processingTime}ms, cache hit: ${this.cacheHit}`)
    
    return response
  }
  
  /**
   * 从响应中提取 token 使用信息并记录
   */
  private async extractAndRecordTokenUsage(
    response: Response, 
    clientId: string,
    isStream: boolean
  ): Promise<void> {
    try {
      if (isStream) {
        // 对于流式响应，需要解析 SSE 事件
        await this.handleStreamTokenUsage(response, clientId)
      } else {
        // 对于非流式响应，直接解析 JSON
        // 注意：response.clone() 创建的副本需要单独消费
        const clonedResponse = response.clone()
        const data = await clonedResponse.json() as any
        
        if (data?.usage) {
          const inputTokens = data.usage.input_tokens || 0
          const outputTokens = data.usage.output_tokens || 0
          
          console.log(`Recording token usage for client ${clientId}: input=${inputTokens}, output=${outputTokens}`)
          
          await this.clientKeyService.recordUsage(clientId, {
            inputTokens,
            outputTokens
          })
        } else {
          console.log(`No usage data found in response for client ${clientId}`)
        }
      }
    } catch (error) {
      // 提供更详细的错误信息
      console.error(`Error extracting token usage for client ${clientId}:`, error)
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack)
      }
      throw error // 重新抛出错误，让上层处理
    }
  }
  
  /**
   * 获取缓存的配置
   */
  private async getSelectedConfigCached(): Promise<SelectedConfig | null> {
    const config = await this.cachedKV.get<SelectedConfig>('admin_selected_config', 5 * 60 * 1000)
    this.cacheHit = config !== null
    return config
  }
  
  /**
   * 获取缓存状态
   */
  getCacheStatus(): string {
    return this.cacheHit ? 'HIT' : 'MISS'
  }
  
  /**
   * 处理流式响应的 token 统计
   */
  private async handleStreamTokenUsage(response: Response, clientId: string): Promise<void> {
    // 重要：对于流式响应，需要克隆以避免消费原始响应
    const clonedResponse = response.clone()
    const text = await clonedResponse.text()
    const lines = text.split('\n')
    
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let foundUsage = false
    
    console.log(`Processing stream response for client ${clientId}, lines count: ${lines.length}`)
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6).trim()
        if (data === '[DONE]') continue
        
        try {
          const event = JSON.parse(data)
          
          // Claude API 在流式响应中的 usage 信息分布：
          // - message_start: 包含 input_tokens（初始事件）
          // - message_delta: 只包含累积的 output_tokens  
          // - message_stop: 包含完整的 usage 信息
          
          if (event.type === 'message_start' && event.message?.usage) {
            // message_start 事件包含初始的 input_tokens
            totalInputTokens = event.message.usage.input_tokens || 0
            console.log(`Found input tokens in message_start: ${totalInputTokens}`)
          } else if (event.type === 'message_delta' && event.usage) {
            // message_delta 只更新 output_tokens
            totalOutputTokens = event.usage.output_tokens || totalOutputTokens
            foundUsage = true
          } else if (event.type === 'message_stop') {
            // message_stop 可能包含最终的统计
            if (event.message?.usage) {
              totalInputTokens = event.message.usage.input_tokens || totalInputTokens
              totalOutputTokens = event.message.usage.output_tokens || totalOutputTokens
              foundUsage = true
              console.log(`Found final usage in message_stop: input=${totalInputTokens}, output=${totalOutputTokens}`)
            }
          } else if (event.usage) {
            // 处理其他可能包含 usage 的事件
            if (event.usage.input_tokens !== undefined) {
              totalInputTokens = event.usage.input_tokens
            }
            if (event.usage.output_tokens !== undefined) {
              totalOutputTokens = event.usage.output_tokens
            }
            foundUsage = true
          }
        } catch (e) {
          // 记录解析错误但继续处理
          console.error(`Failed to parse SSE event for client ${clientId}:`, e)
        }
      }
    }
    
    if (foundUsage && (totalInputTokens > 0 || totalOutputTokens > 0)) {
      console.log(`Recording stream token usage for client ${clientId}: input=${totalInputTokens}, output=${totalOutputTokens}`)
      await this.clientKeyService.recordUsage(clientId, {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens
      })
    } else {
      console.log(`No usage data found in stream response for client ${clientId}`)
    }
  }
}