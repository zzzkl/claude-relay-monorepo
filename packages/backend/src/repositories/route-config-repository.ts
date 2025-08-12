/**
 * 路由配置数据访问层
 */

import type { RouteConfig } from '../../../../shared/types/admin/routes'
import type { SelectedConfig } from '../services/proxy/engines/types'
import { CachedKVStore } from '../utils/cached-kv-store'

export class RouteConfigRepository {
  private readonly ROUTE_CONFIGS_KEY = 'admin_route_configs'
  private cachedKV: CachedKVStore
  
  constructor(private kv: KVNamespace) {
    // 创建缓存的 KV 存储
    this.cachedKV = new CachedKVStore(kv, {
      maxSize: 10,
      defaultTTL: 5 * 60 * 1000  // 5 分钟
    })
  }

  /**
   * 获取所有路由配置
   */
  async getAllConfigs(): Promise<RouteConfig[]> {
    const configs = await this.cachedKV.get<RouteConfig[]>(this.ROUTE_CONFIGS_KEY, 5 * 60 * 1000)
    return configs || []
  }
  
  /**
   * 保存所有路由配置
   */
  async saveAllConfigs(configs: RouteConfig[]): Promise<void> {
    await this.cachedKV.put(this.ROUTE_CONFIGS_KEY, configs, 5 * 60 * 1000)
  }

  /**
   * 获取当前选择的配置
   */
  async getSelectedConfig(): Promise<SelectedConfig | null> {
    return await this.cachedKV.get<SelectedConfig>('admin_selected_config', 5 * 60 * 1000)
  }

  /**
   * 获取路由配置
   */
  async getRouteConfig(routeId: string): Promise<RouteConfig | null> {
    const configs = await this.getAllConfigs()
    return configs.find(c => c.id === routeId) || null
  }

  /**
   * 获取当前激活的路由配置
   */
  async getActiveRouteConfig(): Promise<RouteConfig | null> {
    const selectedConfig = await this.getSelectedConfig()
    
    if (!selectedConfig || selectedConfig.type !== 'route' || !selectedConfig.routeId) {
      return null
    }
    
    return await this.getRouteConfig(selectedConfig.routeId)
  }

  /**
   * 保存选择的配置
   */
  async setSelectedConfig(config: SelectedConfig): Promise<void> {
    await this.cachedKV.put('admin_selected_config', config, 5 * 60 * 1000)
  }

  /**
   * 保存路由配置（兼容旧的单个保存方式）
   */
  async saveRouteConfig(routeConfig: RouteConfig): Promise<void> {
    const configs = await this.getAllConfigs()
    const index = configs.findIndex(c => c.id === routeConfig.id)
    
    if (index >= 0) {
      configs[index] = routeConfig
    } else {
      configs.push(routeConfig)
    }
    
    await this.saveAllConfigs(configs)
  }
}