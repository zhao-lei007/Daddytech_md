import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { EncryptionService, PasswordManager } from './encryption'

/**
 * 同步数据结构
 */
export interface SyncData {
  id?: string
  user_id: string
  device_id: string
  device_name: string
  data_type: `full` | `posts` | `settings`
  data: any
  encrypted: boolean
  version: string
  checksum: string
  created_at?: string
  updated_at?: string
  last_sync_at?: string
}

/**
 * 同步配置
 */
export interface SyncConfig {
  supabaseUrl: string
  supabaseKey: string
  userId: string
  deviceId: string
  deviceName: string
  autoSync: boolean
  syncInterval: number // 分钟
  encryptData: boolean
}

/**
 * 冲突解决策略
 */
export type ConflictResolution = `local` | `remote` | `merge` | `manual`

/**
 * 同步状态
 */
export interface SyncStatus {
  status: `idle` | `syncing` | `success` | `error` | `conflict`
  message: string
  lastSync?: Date
  progress?: number
  conflicts?: SyncConflict[]
}

/**
 * 同步冲突
 */
export interface SyncConflict {
  field: string
  localValue: any
  remoteValue: any
  localTimestamp: string
  remoteTimestamp: string
}

/**
 * Supabase 云同步服务
 */
export class SupabaseSyncService {
  private client: SupabaseClient
  private config: SyncConfig
  private syncTimer: number | null = null
  private isOnline = navigator.onLine

  constructor(config: SyncConfig) {
    this.config = config
    this.client = createClient(config.supabaseUrl, config.supabaseKey)
    this.setupNetworkListeners()
    this.setupAutoSync()
  }

  /**
   * 设置网络监听
   */
  private setupNetworkListeners(): void {
    window.addEventListener(`online`, () => {
      this.isOnline = true
      if (this.config.autoSync) {
        this.performAutoSync()
      }
    })

    window.addEventListener(`offline`, () => {
      this.isOnline = false
    })
  }

  /**
   * 设置自动同步
   */
  private setupAutoSync(): void {
    if (this.config.autoSync && this.config.syncInterval > 0) {
      this.syncTimer = window.setInterval(() => {
        if (this.isOnline) {
          this.performAutoSync()
        }
      }, this.config.syncInterval * 60 * 1000)
    }
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  /**
   * 执行自动同步
   */
  private async performAutoSync(): Promise<void> {
    try {
      await this.syncData(`full`)
    }
    catch (error) {
      console.warn(`Auto sync failed:`, error)
    }
  }

  /**
   * 计算数据校验和
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data, Object.keys(data).sort())
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * 准备同步数据
   */
  private async prepareSyncData(data: any, dataType: `full` | `posts` | `settings`): Promise<SyncData> {
    let processedData = data
    let encrypted = false

    // 如果启用加密且有主密码
    if (this.config.encryptData && PasswordManager.getMasterPassword()) {
      const masterPassword = PasswordManager.getMasterPassword()!
      processedData = await EncryptionService.encryptSensitiveData(data, masterPassword)
      encrypted = true
    }

    return {
      user_id: this.config.userId,
      device_id: this.config.deviceId,
      device_name: this.config.deviceName,
      data_type: dataType,
      data: processedData,
      encrypted,
      version: `2.0.3`,
      checksum: this.calculateChecksum(data),
      last_sync_at: new Date().toISOString(),
    }
  }

  /**
   * 上传数据到云端
   */
  async uploadData(data: any, dataType: `full` | `posts` | `settings` = `full`): Promise<void> {
    if (!this.isOnline) {
      throw new Error(`网络连接不可用`)
    }

    const syncData = await this.prepareSyncData(data, dataType)

    const { error } = await this.client
      .from(`md_editor_sync`)
      .upsert(syncData, {
        onConflict: `user_id,device_id,data_type`,
      })

    if (error) {
      throw new Error(`上传失败: ${error.message}`)
    }
  }

  /**
   * 从云端下载数据
   */
  async downloadData(dataType: `full` | `posts` | `settings` = `full`): Promise<any> {
    if (!this.isOnline) {
      throw new Error(`网络连接不可用`)
    }

    const { data, error } = await this.client
      .from(`md_editor_sync`)
      .select(`*`)
      .eq(`user_id`, this.config.userId)
      .eq(`data_type`, dataType)
      .order(`updated_at`, { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === `PGRST116`) {
        throw new Error(`云端暂无数据`)
      }
      throw new Error(`下载失败: ${error.message}`)
    }

    let processedData = data.data

    // 如果数据已加密，需要解密
    if (data.encrypted && PasswordManager.getMasterPassword()) {
      const masterPassword = PasswordManager.getMasterPassword()!
      processedData = await EncryptionService.decryptSensitiveData(data.data, masterPassword)
    }

    return processedData
  }

  /**
   * 获取所有设备的同步记录
   */
  async getDeviceList(): Promise<SyncData[]> {
    const { data, error } = await this.client
      .from(`md_editor_sync`)
      .select(`device_id, device_name, updated_at, data_type`)
      .eq(`user_id`, this.config.userId)
      .order(`updated_at`, { ascending: false })

    if (error) {
      throw new Error(`获取设备列表失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 检测数据冲突
   */
  async detectConflicts(localData: any, dataType: `full` | `posts` | `settings` = `full`): Promise<SyncConflict[]> {
    try {
      const remoteData = await this.downloadData(dataType)
      return this.compareData(localData, remoteData)
    }
    catch {
      // 如果远程没有数据，不算冲突
      return []
    }
  }

  /**
   * 比较本地和远程数据
   */
  private compareData(localData: any, remoteData: any): SyncConflict[] {
    const conflicts: SyncConflict[] = []
    const now = new Date().toISOString()

    const compareObjects = (local: any, remote: any, path = ``) => {
      for (const key in local) {
        const currentPath = path ? `${path}.${key}` : key

        if (typeof local[key] === `object` && typeof remote[key] === `object`) {
          if (local[key] && remote[key]) {
            compareObjects(local[key], remote[key], currentPath)
          }
        }
        else if (local[key] !== remote[key]) {
          conflicts.push({
            field: currentPath,
            localValue: local[key],
            remoteValue: remote[key],
            localTimestamp: now,
            remoteTimestamp: now,
          })
        }
      }
    }

    if (localData && remoteData) {
      compareObjects(localData, remoteData)
    }

    return conflicts
  }

  /**
   * 合并数据（智能合并策略）
   */
  mergeData(localData: any, remoteData: any, _conflicts: SyncConflict[]): any {
    const merged = { ...localData }

    // 对于文章数据，使用时间戳合并
    if (merged.posts && remoteData.posts) {
      const localPosts = new Map(merged.posts.map((p: any) => [p.id, p]))
      const remotePosts = new Map(remoteData.posts.map((p: any) => [p.id, p]))

      // 合并文章
      for (const [id, remotePost] of remotePosts) {
        const localPost = localPosts.get(id)
        if (!localPost) {
          // 远程有，本地没有，直接添加
          merged.posts.push(remotePost)
        }
        else {
          // 两边都有，比较更新时间
          const localTime = new Date(localPost.updateDatetime).getTime()
          const remoteTime = new Date(remotePost.updateDatetime).getTime()
          if (remoteTime > localTime) {
            // 远程更新，替换本地
            const index = merged.posts.findIndex((p: any) => p.id === id)
            merged.posts[index] = remotePost
          }
        }
      }
    }

    // 对于设置数据，优先使用最新的
    if (merged.settings && remoteData.settings) {
      for (const key in remoteData.settings) {
        if (remoteData.settings[key] !== undefined) {
          merged.settings[key] = remoteData.settings[key]
        }
      }
    }

    return merged
  }

  /**
   * 执行同步
   */
  async syncData(dataType: `full` | `posts` | `settings` = `full`): Promise<SyncStatus> {
    try {
      if (!this.isOnline) {
        return {
          status: `error`,
          message: `网络连接不可用，无法同步`,
        }
      }

      // 这里需要从外部传入本地数据
      // 实际使用时会从 store 获取
      const localData = this.getLocalData(dataType)

      // 检测冲突
      const conflicts = await this.detectConflicts(localData, dataType)

      if (conflicts.length > 0) {
        return {
          status: `conflict`,
          message: `检测到 ${conflicts.length} 个数据冲突`,
          conflicts,
        }
      }

      // 上传本地数据
      await this.uploadData(localData, dataType)

      return {
        status: `success`,
        message: `同步成功`,
        lastSync: new Date(),
      }
    }
    catch (error: any) {
      return {
        status: `error`,
        message: error.message || `同步失败`,
      }
    }
  }

  /**
   * 设置获取本地数据的回调函数
   */
  setGetLocalDataCallback(callback: (dataType: `full` | `posts` | `settings`) => any): void {
    this.getLocalDataCallback = callback
  }

  private getLocalDataCallback?: (dataType: `full` | `posts` | `settings`) => any

  /**
   * 获取本地数据
   */
  private getLocalData(dataType: `full` | `posts` | `settings`): any {
    if (!this.getLocalDataCallback) {
      throw new Error(`getLocalData callback not set`)
    }
    return this.getLocalDataCallback(dataType)
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from(`md_editor_sync`)
        .select(`count`, { count: `exact`, head: true })

      return !error
    }
    catch {
      return false
    }
  }

  /**
   * 清理旧数据
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { error } = await this.client
      .from(`md_editor_sync`)
      .delete()
      .eq(`user_id`, this.config.userId)
      .lt(`updated_at`, cutoffDate.toISOString())

    if (error) {
      throw new Error(`清理旧数据失败: ${error.message}`)
    }
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopAutoSync()
    window.removeEventListener(`online`, this.performAutoSync)
    window.removeEventListener(`offline`, this.performAutoSync)
  }
}
