/**
 * Claude API 代理服务 - Engine 架构版本
 */

import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import type { SelectedConfig } from './engines/types'
import { ClaudeEngine, ProviderEngine } from './engines'
import { RouteConfigRepository } from '../../repositories'
import { ValidationError } from '../../utils/errors'
import { ClientApiKeyService } from '../admin/client-keys'

export class ClaudeProxyService {
  private claudeEngine: ClaudeEngine
  private providerEngine: ProviderEngine
  private routeConfigRepo: RouteConfigRepository
  private clientKeyService: ClientApiKeyService
  
  constructor(private kv: KVNamespace) {
    this.claudeEngine = new ClaudeEngine(kv)
    this.providerEngine = new ProviderEngine(kv)
    this.routeConfigRepo = new RouteConfigRepository(kv)
    this.clientKeyService = new ClientApiKeyService(kv)
  }
  
  /**
   * 代理请求到适当的 API 端点
   * @param request 原始请求
   * @param clientId 客户端 ID（如果有）
   */
  async proxyRequest(request: Request, clientId?: string): Promise<Response> {
    // 解析请求
    const claudeRequest = await request.json() as MessageCreateParamsBase
    
    // 获取选择的配置
    const selectedConfig = await this.routeConfigRepo.getSelectedConfig()
    
    let response: Response
    
    if (!selectedConfig || selectedConfig.type === 'claude') {
      response = await this.claudeEngine.processRequest(claudeRequest)
    } else if (selectedConfig.type === 'route') {
      response = await this.providerEngine.processRequest(claudeRequest)
    } else {
      throw new ValidationError(`Unknown configuration type: ${selectedConfig.type}`)
    }
    
    // 如果有 clientId，提取并记录 token 使用
    // 重要：必须等待此操作完成，否则在 Cloudflare Workers 中会被中断
    if (clientId) {
      try {
        await this.extractAndRecordTokenUsage(response.clone(), clientId, claudeRequest.stream || false)
      } catch (error) {
        // 记录错误但不影响主流程
        console.error('Failed to record token usage for client:', clientId, error)
      }
    }
    
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