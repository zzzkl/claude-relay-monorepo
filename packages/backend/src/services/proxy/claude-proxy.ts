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
    
    // 如果有 clientId，尝试提取并记录 token 使用
    if (clientId) {
      this.extractAndRecordTokenUsage(response.clone(), clientId, claudeRequest.stream || false)
        .catch(error => {
          console.error('Failed to record token usage:', error)
        })
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
        const data = await response.json() as any
        
        if (data?.usage) {
          const inputTokens = data.usage.input_tokens || 0
          const outputTokens = data.usage.output_tokens || 0
          
          await this.clientKeyService.recordUsage(clientId, {
            inputTokens,
            outputTokens
          })
        }
      }
    } catch (error) {
      console.error('Error extracting token usage:', error)
    }
  }
  
  /**
   * 处理流式响应的 token 统计
   */
  private async handleStreamTokenUsage(response: Response, clientId: string): Promise<void> {
    const text = await response.text()
    const lines = text.split('\n')
    
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let foundUsage = false
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6)
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
          // 忽略解析错误
        }
      }
    }
    
    if (foundUsage && (totalInputTokens > 0 || totalOutputTokens > 0)) {
      await this.clientKeyService.recordUsage(clientId, {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens
      })
    }
  }
}