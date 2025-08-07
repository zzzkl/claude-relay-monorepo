/**
 * API 请求封装
 */

export const useApi = () => {
  const config = useRuntimeConfig()
  
  const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:8787'
  
  // 封装 fetch 请求，自动添加基础 URL
  const apiFetch = async (url: string, options?: any) => {
    const fullUrl = `${apiBaseUrl}${url}`
    
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