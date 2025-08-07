/**
 * API 请求封装
 */

export const useApi = () => {
  const config = useRuntimeConfig()
  
  const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:8787'
  
  // 封装 fetch 请求，自动添加基础 URL
  const apiFetch = async (url: string, options?: any) => {
    // 处理 params 参数
    let finalUrl = url
    if (options?.params) {
      const params = new URLSearchParams()
      Object.entries(options.params).forEach(([key, value]) => {
        params.append(key, String(value))
      })
      finalUrl = `${url}?${params.toString()}`
      // 删除 options 中的 params，因为已经处理过了
      const { params: _, ...restOptions } = options
      options = restOptions
    }
    
    const fullUrl = `${apiBaseUrl}${finalUrl}`
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }
  
  return {
    apiBaseUrl,
    apiFetch
  }
}