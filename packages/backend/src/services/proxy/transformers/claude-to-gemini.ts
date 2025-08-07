/**
 * Claude to Gemini 转换器 - 重构版本
 * 完全重构为 processRequest 模式，直接完成请求转换 -> 调用 -> 响应转换
 * 充分利用 @google/genai SDK 的特性，大幅简化逻辑
 */

import type { Transformer } from './base-transformer'
import type { 
  MessageCreateParamsBase,
  Message,
  MessageParam,
  TextBlockParam,
  ImageBlockParam,
  ToolUseBlockParam,
  ToolResultBlockParam,
  Tool as ClaudeTool,
  Usage,
  StopReason
} from '@anthropic-ai/sdk/resources/messages'
import { GoogleGenAI } from '@google/genai'
import type {
  GenerateContentResponse,
  GenerateContentConfig,
  Content,
  Part,
  FunctionDeclaration,
  Tool,
  ToolConfig
} from '@google/genai'

export class ClaudeToGeminiTransformer implements Transformer {
  private client: GoogleGenAI | null = null
  // 维护 tool_use_id 到函数名的映射关系
  private toolUseIdToFunctionName: Map<string, string> = new Map()

  /**
   * 初始化 Gemini 客户端
   */
  public initializeClient(apiKey: string): void {
    this.client = new GoogleGenAI({ apiKey })
  }

  /**
   * 获取客户端实例
   */
  private getClient(): GoogleGenAI {
    if (!this.client) {
      throw new Error('Gemini client not initialized. Call initializeClient() first.')
    }
    return this.client
  }

  /**
   * 主要转换方法 - 直接调用 SDK 并转换响应
   */
  async processRequest(claudeRequest: MessageCreateParamsBase, model: string): Promise<Message | ReadableStream> {
    const client = this.getClient()
    
    const geminiParams = this.buildGeminiParams(claudeRequest, model)
    
    if (claudeRequest.stream) {
      // 流式响应
      const streamResponse = await client.models.generateContentStream(geminiParams)
      
      return await this.transformStreamResponse(streamResponse)
    } else {
      // 非流式响应
      const response = await client.models.generateContent(geminiParams)
      
      return this.transformNormalResponse(response)
    }
  }

  /**
   * 构建 Gemini API 参数 - 简化版本
   */
  private buildGeminiParams(claudeRequest: MessageCreateParamsBase, model: string) {
    const config: GenerateContentConfig = {}
    
    // 基础配置
    if (claudeRequest.max_tokens) config.maxOutputTokens = claudeRequest.max_tokens
    if (claudeRequest.temperature !== undefined) config.temperature = claudeRequest.temperature
    if (claudeRequest.top_p !== undefined) config.topP = claudeRequest.top_p
    if (claudeRequest.top_k !== undefined) config.topK = claudeRequest.top_k
    if (claudeRequest.stop_sequences) config.stopSequences = claudeRequest.stop_sequences

    // 思考配置 - 为 Gemini 2.5 Pro 启用思考内容返回
    config.thinkingConfig = {
      includeThoughts: true,  // 必须设置为 true 才能看到思考过程
      thinkingBudget: -1      // -1 表示自动，让模型决定思考时长
    }

    // 系统指令
    if (claudeRequest.system) {
      config.systemInstruction = typeof claudeRequest.system === 'string' 
        ? claudeRequest.system 
        : this.extractTextFromContent(claudeRequest.system)
    }

    // 工具配置
    if (claudeRequest.tools?.length) {
      config.tools = this.transformTools(claudeRequest.tools as ClaudeTool[])
      if (claudeRequest.tool_choice) {
        config.toolConfig = this.transformToolChoice(claudeRequest.tool_choice)
      }
    }

    return {
      model,
      contents: claudeRequest.messages ? this.transformMessages(claudeRequest.messages) : [],
      config
    }
  }

  /**
   * 转换消息 - 简化版本
   */
  private transformMessages(messages: MessageParam[]): Content[] {
    const contents: Content[] = []
    let currentContent: Content | null = null

    for (const message of messages) {
      const role = message.role === 'assistant' ? 'model' : 'user'
      const parts = this.transformMessageContent(message.content)

      // 合并连续的同角色消息
      if (!currentContent || currentContent.role !== role) {
        if (currentContent) contents.push(currentContent)
        currentContent = { role, parts }
      } else {
        if (currentContent.parts) {
          currentContent.parts.push(...parts)
        }
      }
    }

    if (currentContent) contents.push(currentContent)
    return contents
  }

  /**
   * 转换消息内容 - 简化版本
   */
  private transformMessageContent(content: string | Array<any>): Part[] {
    const parts: Part[] = []

    if (typeof content === 'string') {
      parts.push({ text: content })
    } else if (Array.isArray(content)) {
      for (const item of content) {
        switch (item.type) {
        case 'text':
          parts.push({ text: (item as TextBlockParam).text })
          break
        case 'image':
          const imageBlock = item as ImageBlockParam
          if (imageBlock.source.type === 'base64') {
            parts.push({
              inlineData: {
                mimeType: imageBlock.source.media_type,
                data: imageBlock.source.data
              }
            })
          }
          break
        case 'tool_use':
          const toolUseBlock = item as ToolUseBlockParam
          this.toolUseIdToFunctionName.set(toolUseBlock.id, toolUseBlock.name)
          parts.push({
            functionCall: {
              name: toolUseBlock.name,
              args: (toolUseBlock.input as Record<string, unknown>) || {}
            }
          })
          break
        case 'tool_result':
          const toolResultBlock = item as ToolResultBlockParam
          const functionName = this.toolUseIdToFunctionName.get(toolResultBlock.tool_use_id) || 'unknown_function'
          parts.push({
            functionResponse: {
              name: functionName,
              response: {
                result: typeof toolResultBlock.content === 'string' 
                  ? toolResultBlock.content 
                  : JSON.stringify(toolResultBlock.content)
              }
            }
          })
          break
        }
      }
    }

    return parts
  }

  /**
   * 转换工具定义 - 简化版本
   */
  private transformTools(tools: ClaudeTool[]): Tool[] {
    const functionDeclarations: FunctionDeclaration[] = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: this.cleanupParameters(tool.input_schema)
    }))

    return [{ functionDeclarations }]
  }

  /**
   * 转换工具选择策略 - 简化版本
   */
  private transformToolChoice(toolChoice: MessageCreateParamsBase['tool_choice']): ToolConfig {
    if (typeof toolChoice === 'string') {
      const mode = toolChoice === 'auto' ? 'AUTO' 
        : toolChoice === 'none' ? 'NONE' 
          : 'ANY'
      return { functionCallingConfig: { mode: mode as any } }
    }
    
    if (toolChoice && typeof toolChoice === 'object') {
      if (toolChoice.type === 'tool' && 'name' in toolChoice) {
        return {
          functionCallingConfig: {
            mode: 'ANY' as any,
            allowedFunctionNames: [toolChoice.name]
          }
        }
      }
      const mode = toolChoice.type === 'auto' ? 'AUTO' : 'ANY'
      return { functionCallingConfig: { mode: mode as any } }
    }
    
    return { functionCallingConfig: { mode: 'AUTO' as any } }
  }

  /**
   * 转换非流式响应 - 利用 SDK 的访问器简化
   */
  private transformNormalResponse(response: GenerateContentResponse): Message {
    return {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      model: response.modelVersion || 'gemini',
      content: this.extractContentFromResponse(response),
      stop_reason: this.mapFinishReason(response.candidates?.[0]?.finishReason || null),
      stop_sequence: null,
      usage: this.buildUsageStats(response.usageMetadata)
    }
  }

  /**
   * 从响应中提取内容 - 完整处理所有 Part 类型
   */
  private extractContentFromResponse(response: GenerateContentResponse): any[] {
    const content: any[] = []
    
    // 处理所有 parts，不使用 response.text 访问器避免丢失非文本内容
    const candidate = response.candidates?.[0]
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        // 处理思考内容 - 转换为 Claude 的 thinking block
        if (part.thought) {
          // Gemini 的 thought 字段表示这是思考内容
          // 将其转换为 Claude 的 thinking 类型
          const thoughtText = part.text || part.thought || ''
          if (thoughtText) {
            content.push({
              type: 'thinking',
              thinking: thoughtText,
              // 如果有 thoughtSignature，添加到 signature 字段
              signature: part.thoughtSignature || undefined
            })
          }
        }
        // 处理普通文本内容（非思考内容）
        else if (part.text) {
          content.push({ 
            type: 'text', 
            text: part.text 
          })
        }
        
        // 处理思考签名（如果单独出现，没有伴随 thought）
        if (part.thoughtSignature && !part.thought) {
          // 记录日志，但通常不需要单独处理
          // 找到独立的 thoughtSignature
        }
        
        // 处理函数调用
        if (part.functionCall) {
          const toolUseId = this.generateToolUseId()
          if (part.functionCall.name) {
            this.toolUseIdToFunctionName.set(toolUseId, part.functionCall.name)
            content.push({
              type: 'tool_use',
              id: toolUseId,
              name: part.functionCall.name,
              input: part.functionCall.args || {}
            })
          }
        }
        
        // 处理代码执行结果
        if (part.codeExecutionResult) {
          content.push({
            type: 'text',
            text: `[代码执行结果]\n${part.codeExecutionResult.output || '执行完成'}`
          })
        }
        
        // 处理可执行代码
        if (part.executableCode) {
          content.push({
            type: 'text',
            text: `\`\`\`${part.executableCode.language || ''}\n${part.executableCode.code}\n\`\`\``
          })
        }
      }
    }
    
    // 如果没有任何内容，返回一个空文本块
    if (content.length === 0) {
      // 无内容提取
      content.push({ type: 'text', text: '' })
    }

    return content
  }

  /**
   * 转换流式响应 - 大幅简化
   */
  private async transformStreamResponse(streamResponse: AsyncGenerator<GenerateContentResponse>): Promise<ReadableStream> {
    const encoder = new TextEncoder()
    const self = this
    
    return new ReadableStream({
      async start(controller) {
        let messageStarted = false
        let contentIndex = 0
        // 跟踪当前内容块的类型和状态
        let currentBlockType: 'thinking' | 'text' | null = null
        let accumulatedSignature = ''

        try {
          for await (const chunk of streamResponse) {
            // 记录原始 Gemini 流响应块
            // 流式响应块日志已禁用
            
            // 发送 message_start
            if (!messageStarted) {
              controller.enqueue(encoder.encode(self.createSSEEvent('message_start', {
                type: 'message_start',
                message: {
                  id: `msg_${Date.now()}`,
                  type: 'message',
                  role: 'assistant',
                  model: chunk.modelVersion || 'gemini',
                  content: [],
                  stop_reason: null,
                  stop_sequence: null,
                  usage: { input_tokens: 0, output_tokens: 0 }
                }
              })))
              messageStarted = true
            }

            // 处理响应的各个部分
            const candidate = chunk.candidates?.[0]
            if (candidate?.content?.parts) {
              for (const part of candidate.content.parts) {
                // 处理思考内容
                if (part.thought && part.text) {
                  // 如果当前不是思考块，先结束之前的块并开始新的思考块
                  if (currentBlockType !== 'thinking') {
                    if (currentBlockType !== null) {
                      controller.enqueue(encoder.encode(self.createSSEEvent('content_block_stop', {
                        type: 'content_block_stop',
                        index: contentIndex
                      })))
                      contentIndex++
                    }
                    
                    // 开始新的思考内容块
                    controller.enqueue(encoder.encode(self.createSSEEvent('content_block_start', {
                      type: 'content_block_start',
                      index: contentIndex,
                      content_block: { type: 'thinking', thinking: '' }
                    })))
                    currentBlockType = 'thinking'
                  }

                  // 发送思考内容增量
                  controller.enqueue(encoder.encode(self.createSSEEvent('content_block_delta', {
                    type: 'content_block_delta',
                    index: contentIndex,
                    delta: { type: 'thinking_delta', thinking: part.text }
                  })))
                  
                  // 如果有 thoughtSignature，累积它
                  if (part.thoughtSignature) {
                    accumulatedSignature = part.thoughtSignature
                  }
                }
                // 处理普通文本内容
                else if (part.text && !part.thought) {
                  // 如果当前不是文本块，先结束之前的块并开始新的文本块
                  if (currentBlockType !== 'text') {
                    if (currentBlockType !== null) {
                      // 如果结束的是思考块且有签名，发送签名
                      if (currentBlockType === 'thinking' && accumulatedSignature) {
                        controller.enqueue(encoder.encode(self.createSSEEvent('content_block_delta', {
                          type: 'content_block_delta',
                          index: contentIndex,
                          delta: { type: 'signature_delta', signature: accumulatedSignature }
                        })))
                        accumulatedSignature = ''
                      }
                      
                      controller.enqueue(encoder.encode(self.createSSEEvent('content_block_stop', {
                        type: 'content_block_stop',
                        index: contentIndex
                      })))
                      contentIndex++
                    }
                    
                    // 开始新的文本内容块
                    controller.enqueue(encoder.encode(self.createSSEEvent('content_block_start', {
                      type: 'content_block_start',
                      index: contentIndex,
                      content_block: { type: 'text', text: '' }
                    })))
                    currentBlockType = 'text'
                  }

                  // 发送文本增量
                  controller.enqueue(encoder.encode(self.createSSEEvent('content_block_delta', {
                    type: 'content_block_delta',
                    index: contentIndex,
                    delta: { type: 'text_delta', text: part.text }
                  })))
                }
                // 处理工具调用
                else if (part.functionCall) {
                  // 如果当前有其他类型的块，先结束它
                  if (currentBlockType !== null) {
                    if (currentBlockType === 'thinking' && accumulatedSignature) {
                      controller.enqueue(encoder.encode(self.createSSEEvent('content_block_delta', {
                        type: 'content_block_delta',
                        index: contentIndex,
                        delta: { type: 'signature_delta', signature: accumulatedSignature }
                      })))
                      accumulatedSignature = ''
                    }
                    
                    controller.enqueue(encoder.encode(self.createSSEEvent('content_block_stop', {
                      type: 'content_block_stop',
                      index: contentIndex
                    })))
                    contentIndex++
                  }
                  
                  // 生成 tool_use_id 并记录映射
                  const toolUseId = self.generateToolUseId()
                  if (part.functionCall.name) {
                    self.toolUseIdToFunctionName.set(toolUseId, part.functionCall.name)
                  }
                  
                  // 发送工具使用块开始
                  controller.enqueue(encoder.encode(self.createSSEEvent('content_block_start', {
                    type: 'content_block_start',
                    index: contentIndex,
                    content_block: {
                      type: 'tool_use',
                      id: toolUseId,
                      name: part.functionCall.name,
                      input: {}
                    }
                  })))
                  
                  // 发送工具调用的参数（作为完整的 JSON）
                  const argsJson = JSON.stringify(part.functionCall.args || {})
                  controller.enqueue(encoder.encode(self.createSSEEvent('content_block_delta', {
                    type: 'content_block_delta',
                    index: contentIndex,
                    delta: {
                      type: 'input_json_delta',
                      partial_json: argsJson
                    }
                  })))
                  
                  // 结束工具使用块
                  controller.enqueue(encoder.encode(self.createSSEEvent('content_block_stop', {
                    type: 'content_block_stop',
                    index: contentIndex
                  })))
                  
                  contentIndex++
                  currentBlockType = null
                }
              }
            }

            // 处理结束
            if (chunk.candidates?.[0]?.finishReason) {
              // 先结束当前内容块
              if (currentBlockType !== null) {
                // 如果是思考块且有签名，先发送签名
                if (currentBlockType === 'thinking' && accumulatedSignature) {
                  controller.enqueue(encoder.encode(self.createSSEEvent('content_block_delta', {
                    type: 'content_block_delta',
                    index: contentIndex,
                    delta: { type: 'signature_delta', signature: accumulatedSignature }
                  })))
                }
                
                controller.enqueue(encoder.encode(self.createSSEEvent('content_block_stop', {
                  type: 'content_block_stop',
                  index: contentIndex
                })))
              }
              
              // 发送消息结束信息
              controller.enqueue(encoder.encode(self.createSSEEvent('message_delta', {
                type: 'message_delta',
                delta: {
                  stop_reason: self.mapFinishReason(chunk.candidates[0].finishReason),
                  stop_sequence: null
                },
                usage: chunk.usageMetadata ? {
                  output_tokens: chunk.usageMetadata.candidatesTokenCount || 0
                } : undefined
              })))
            }
          }

          // 发送结束事件
          controller.enqueue(encoder.encode(self.createSSEEvent('message_stop', {
            type: 'message_stop'
          })))
        } catch (error) {
          controller.error(error)
        } finally {
          controller.close()
        }
      }
    })
  }

  /**
   * 构建使用统计 - 简化版本
   */
  private buildUsageStats(usageMetadata?: any): Usage {
    return {
      input_tokens: usageMetadata?.promptTokenCount || 0,
      output_tokens: usageMetadata?.candidatesTokenCount || 0,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: usageMetadata?.cachedContentTokenCount || null,
      server_tool_use: null,
      service_tier: null
    }
  }

  /**
   * 映射完成原因
   */
  private mapFinishReason(reason: string | null): StopReason {
    if (!reason) return 'end_turn'
    
    const mapping: Record<string, StopReason> = {
      'STOP': 'end_turn',
      'MAX_TOKENS': 'max_tokens',
      'SAFETY': 'end_turn',
      'RECITATION': 'end_turn',
      'OTHER': 'end_turn'
    }
    
    return mapping[reason] || 'end_turn'
  }

  /**
   * 生成唯一的 tool_use_id
   */
  private generateToolUseId(): string {
    return `toolu_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * 清理参数定义
   */
  private cleanupParameters(params: any): any {
    if (!params || typeof params !== 'object') return params
    
    const cleaned = JSON.parse(JSON.stringify(params))
    this.removeUnsupportedProperties(cleaned)
    return cleaned
  }

  /**
   * 递归移除不支持的属性
   */
  private removeUnsupportedProperties(obj: any): void {
    if (!obj || typeof obj !== 'object') return
    
    if (Array.isArray(obj)) {
      obj.forEach(item => this.removeUnsupportedProperties(item))
      return
    }

    // 移除 Gemini 不支持的属性
    delete obj.$schema
    delete obj.additionalProperties
    delete obj.const

    // 处理 format 属性 - Gemini 对 STRING 类型只支持 'enum' 和 'date-time'
    if (obj.type === 'string' && obj.format) {
      const supportedFormats = ['enum', 'date-time']
      if (!supportedFormats.includes(obj.format)) {
        delete obj.format
      }
    }

    // 递归处理子属性
    Object.values(obj).forEach(value => this.removeUnsupportedProperties(value))
  }

  /**
   * 从复合内容中提取文本
   */
  private extractTextFromContent(content: Array<TextBlockParam | ImageBlockParam>): string {
    return content
      .filter((item): item is TextBlockParam => item.type === 'text')
      .map(item => item.text)
      .join('\n')
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.toolUseIdToFunctionName.clear()
  }

  /**
   * 创建 SSE 事件格式
   */
  private createSSEEvent(event: string, data: Record<string, any>): string {
    // 记录转换后的 Claude 流事件
    // SSE 事件日志已禁用
    
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  }

}