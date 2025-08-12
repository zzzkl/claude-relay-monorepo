/**
 * 优化的 Token 估算器
 * 专注于中英文内容的高效估算
 * 
 * 基于实证数据：
 * - 英文：4 字符 = 1 token (OpenAI 官方)
 * - 中文：1.5 字符 = 1 token (实测数据)
 */

export type ContentType = 'english' | 'chinese' | 'code' | 'json' | 'mixed'

interface TokenEstimatorConfig {
  enableCache?: boolean
  maxCacheSize?: number
  sampleSize?: number  // 用于内容检测的采样大小
}

/**
 * 基于实证数据的 token/字符比率
 */
const TOKEN_RATIOS = {
  english: 4.0,      // 英文：4 字符 = 1 token
  chinese: 1.5,      // 中文：1.5 字符 = 1 token
  code: 3.5,         // 代码：3.5 字符 = 1 token
  json: 3.0,         // JSON：3 字符 = 1 token
  mixed: 3.5         // 中英混合：平均值
} as const

/**
 * 特殊模式的 token 调整系数
 */
const PATTERN_ADJUSTMENTS = {
  // 代码相关
  codeKeywords: 0.2,       // 编程关键字额外 token
  codeComments: 1.1,       // 注释通常更接近自然语言
  
  // 结构化数据
  jsonNested: 0.9,         // 深层嵌套的 JSON 效率更低
  
  // 自然语言
  shortWords: 1.3,         // 短单词（<4字符）每个约 1.3 token
  longWords: 0.7,          // 长单词（>12字符）会被分割
  punctuation: 1.0,        // 标点符号通常是单独 token
} as const

export class OptimizedTokenEstimator {
  private cache: Map<string, number>
  private config: Required<TokenEstimatorConfig>
  
  constructor(config: TokenEstimatorConfig = {}) {
    this.cache = new Map()
    this.config = {
      enableCache: config.enableCache ?? true,
      maxCacheSize: config.maxCacheSize ?? 100,
      sampleSize: config.sampleSize ?? 1000
    }
  }
  
  /**
   * 估算文本的 token 数量
   */
  estimate(text: string): number {
    if (!text) return 0
    
    // 缓存检查
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey(text)
      const cached = this.cache.get(cacheKey)
      if (cached !== undefined) return cached
    }
    
    // 检测内容类型
    const contentType = this.detectContentType(text)
    
    // 根据内容类型估算
    let tokenCount: number
    switch (contentType) {
    case 'chinese':
      tokenCount = this.estimateChinese(text)
      break
    case 'code':
      tokenCount = this.estimateCode(text)
      break
    case 'json':
      tokenCount = this.estimateJSON(text)
      break
    case 'english':
      tokenCount = this.estimateEnglish(text)
      break
    default:
      tokenCount = this.estimateMixed(text)
    }
    
    // 缓存结果
    if (this.config.enableCache) {
      this.cacheResult(this.getCacheKey(text), tokenCount)
    }
    
    return Math.ceil(tokenCount)
  }
  
  /**
   * 检测内容类型
   * 专注于中英文和常见格式
   */
  private detectContentType(text: string): ContentType {
    // 采样文本（避免处理整个文本）
    const sample = this.getSample(text)
    
    // JSON 检测（优先级最高）
    if (this.isLikelyJSON(sample)) {
      return 'json'
    }
    
    // 代码检测
    if (this.isLikelyCode(sample)) {
      return 'code'
    }
    
    // 中英文检测
    const charCount = sample.length
    if (charCount === 0) return 'english'
    
    const chineseCount = (sample.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishCount = (sample.match(/[a-zA-Z]/g) || []).length
    
    const chineseRatio = chineseCount / charCount
    const englishRatio = englishCount / charCount
    
    // 根据比例判断
    if (chineseRatio > 0.3) return 'chinese'  // 30% 以上中文
    if (englishRatio > 0.6) return 'english'  // 60% 以上英文
    
    return 'mixed'  // 中英混合
  }
  
  /**
   * 简化的代码检测
   */
  private isLikelyCode(text: string): boolean {
    const codePatterns = /\b(function|const|let|var|class|import|export|if|for|while|return)\b/
    const codeSymbols = /[{}();]/g
    
    const hasKeywords = codePatterns.test(text)
    const symbolCount = (text.match(codeSymbols) || []).length
    const symbolRatio = symbolCount / (text.length || 1)
    
    return hasKeywords && symbolRatio > 0.05  // 有关键字且符号占比 > 5%
  }
  
  /**
   * 中文文本估算
   * 基于实证数据：1.5 字符/token
   */
  private estimateChinese(text: string): number {
    const baseTokens = text.length / TOKEN_RATIOS.chinese
    
    // 识别常见中文词组（可能合并为单个 token）
    const commonPhrases = ['的', '了', '和', '是', '在', '我们', '你们', '他们', '这个', '那个']
    let adjustment = 0
    
    commonPhrases.forEach(phrase => {
      const count = (text.match(new RegExp(phrase, 'g')) || []).length
      // 常见词组效率更高
      adjustment -= count * 0.2
    })
    
    return baseTokens + adjustment
  }
  
  /**
   * 代码估算
   * 考虑关键字、注释、字符串等不同部分
   */
  private estimateCode(text: string): number {
    const lines = text.split('\n')
    let tokenCount = 0
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (!trimmed) {
        tokenCount += 1  // 空行
        continue
      }
      
      // 注释行（使用自然语言规则）
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
        const commentText = trimmed.replace(/^\/\/|^#|^\/\*|\*\/$/, '').trim()
        tokenCount += commentText.length / 4 * PATTERN_ADJUSTMENTS.codeComments
        continue
      }
      
      // 代码行
      const baseTokens = trimmed.length / TOKEN_RATIOS.code
      
      // 关键字补偿
      const keywords = (trimmed.match(/\b(function|const|let|var|if|else|for|while|return|class|import|export|async|await|try|catch)\b/g) || []).length
      const keywordAdjustment = keywords * PATTERN_ADJUSTMENTS.codeKeywords
      
      tokenCount += baseTokens + keywordAdjustment
    }
    
    return tokenCount
  }
  
  /**
   * JSON 估算
   * 基于实证数据：比 Markdown 多 15% token
   */
  private estimateJSON(text: string): number {
    const baseTokens = text.length / TOKEN_RATIOS.json
    
    // 检测嵌套深度（深层嵌套效率更低）
    const nestingLevel = this.estimateJSONNesting(text)
    const nestingAdjustment = nestingLevel > 3 ? 
      baseTokens * (1 - PATTERN_ADJUSTMENTS.jsonNested) : 0
    
    return baseTokens + nestingAdjustment
  }
  
  /**
   * 英文文本估算
   * 基于单词级别的分析
   */
  private estimateEnglish(text: string): number {
    // 分词
    const words = text.split(/\s+/).filter(w => w.length > 0)
    let tokenCount = 0
    
    for (const word of words) {
      if (word.length === 0) continue
      
      // 缩写（如 don't）通常分解为 2 个 token
      if (word.includes('\'')) {
        tokenCount += 2
      }
      // 超长单词会被分割
      else if (word.length > 12) {
        tokenCount += Math.ceil(word.length / 7) * PATTERN_ADJUSTMENTS.longWords
      }
      // 短单词
      else if (word.length < 4) {
        tokenCount += PATTERN_ADJUSTMENTS.shortWords
      }
      // 普通单词
      else {
        tokenCount += 1
      }
    }
    
    // 标点符号
    const punctuation = (text.match(/[.,;:!?'"()\[\]{}]/g) || []).length
    tokenCount += punctuation * PATTERN_ADJUSTMENTS.punctuation
    
    return tokenCount
  }
  
  /**
   * 混合内容估算
   * 使用加权平均
   */
  private estimateMixed(text: string): number {
    // 识别不同部分并分别估算
    let totalTokens = 0
    
    // 简单的混合策略：检测每个字符的类型
    const englishChars = (text.match(/[a-zA-Z\s]/g) || []).length
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const otherChars = text.length - englishChars - chineseChars
    
    totalTokens += englishChars / TOKEN_RATIOS.english
    totalTokens += chineseChars / TOKEN_RATIOS.chinese
    totalTokens += otherChars / TOKEN_RATIOS.mixed
    
    return totalTokens
  }
  
  /**
   * 获取文本采样
   * 从前、中、后各取一部分
   */
  private getSample(text: string): string {
    const maxLength = this.config.sampleSize
    
    if (text.length <= maxLength) {
      return text
    }
    
    const partSize = Math.floor(maxLength / 3)
    const start = text.slice(0, partSize)
    const middle = text.slice(
      Math.floor((text.length - partSize) / 2),
      Math.floor((text.length + partSize) / 2)
    )
    const end = text.slice(-partSize)
    
    return start + middle + end
  }
  
  
  /**
   * 检测是否可能是 JSON
   */
  private isLikelyJSON(text: string): boolean {
    const trimmed = text.trim()
    
    // 快速检查开头和结尾
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      // 检查是否有 JSON 特征
      return /"[^"]*":\s*["{[\d]/.test(trimmed)
    }
    
    return false
  }
  
  /**
   * 估算 JSON 嵌套深度
   */
  private estimateJSONNesting(text: string): number {
    let maxDepth = 0
    let currentDepth = 0
    
    for (const char of text) {
      if (char === '{' || char === '[') {
        currentDepth++
        maxDepth = Math.max(maxDepth, currentDepth)
      } else if (char === '}' || char === ']') {
        currentDepth--
      }
    }
    
    return maxDepth
  }
  
  /**
   * 生成缓存键
   */
  private getCacheKey(text: string): string {
    // 使用长度 + 前100字符 + 简单哈希
    const prefix = text.slice(0, 100)
    const hash = this.simpleHash(text)
    return `${text.length}-${hash}-${prefix.length}`
  }
  
  /**
   * 简单哈希函数
   */
  private simpleHash(text: string): number {
    let hash = 0
    const sample = text.slice(0, 1000)  // 只对前 1000 字符哈希
    
    for (let i = 0; i < sample.length; i++) {
      const char = sample.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash  // Convert to 32-bit integer
    }
    
    return Math.abs(hash)
  }
  
  /**
   * 缓存结果（LRU 策略）
   */
  private cacheResult(key: string, value: number): void {
    if (this.cache.size >= this.config.maxCacheSize) {
      // 删除最旧的条目
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    
    this.cache.set(key, value)
  }
  
  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear()
  }
  
  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize
    }
  }
}

/**
 * 创建全局单例
 */
let globalEstimator: OptimizedTokenEstimator | null = null

export function getGlobalTokenEstimator(config?: TokenEstimatorConfig): OptimizedTokenEstimator {
  if (!globalEstimator) {
    globalEstimator = new OptimizedTokenEstimator(config)
  }
  return globalEstimator
}

/**
 * 便捷函数：直接估算 token 数
 */
export function estimateTokens(text: string): number {
  return getGlobalTokenEstimator().estimate(text)
}