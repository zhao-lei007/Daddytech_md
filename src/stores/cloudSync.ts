import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { PasswordManager } from '@/utils/encryption'
import { SupabaseSyncService, type SyncConfig, type SyncConflict, type SyncStatus } from '@/utils/supabaseSync'
import { useStore } from './index'

/**
 * 云同步状态管理
 */
export const useCloudSyncStore = defineStore(`cloudSync`, () => {
  // 基础状态
  const isEnabled = useStorage(`cloudSync_enabled`, false)
  const syncService = ref<SupabaseSyncService | null>(null)
  const syncStatus = ref<SyncStatus>({ status: `idle`, message: `` })
  const isOnline = ref(navigator.onLine)
  const lastSyncTime = ref<Date | null>(null)

  // 配置
  const config = useStorage<Partial<SyncConfig>>(`cloudSync_config`, {
    supabaseUrl: ``,
    supabaseKey: ``,
    userId: ``,
    deviceId: generateDeviceId(),
    deviceName: getDeviceName(),
    autoSync: true,
    syncInterval: 30, // 30分钟
    encryptData: true,
  })

  // 冲突处理
  const conflicts = ref<SyncConflict[]>([])
  const isResolvingConflicts = ref(false)

  // 主密码状态
  const hasMasterPassword = ref(PasswordManager.hasMasterPassword())
  const isMasterPasswordSet = ref(false)

  // 计算属性
  const isConfigured = computed(() => {
    return !!(config.value.supabaseUrl
      && config.value.supabaseKey
      && config.value.userId)
  })

  const canSync = computed(() => {
    return isConfigured.value
      && isOnline.value
      && (!config.value.encryptData || isMasterPasswordSet.value)
  })

  const syncStatusText = computed(() => {
    switch (syncStatus.value.status) {
      case `idle`:
        return `就绪`
      case `syncing`:
        return `同步中...`
      case `success`:
        return `同步成功`
      case `error`:
        return `同步失败`
      case `conflict`:
        return `存在冲突`
      default:
        return `未知状态`
    }
  })

  // 网络状态监听
  window.addEventListener(`online`, () => {
    isOnline.value = true
  })

  window.addEventListener(`offline`, () => {
    isOnline.value = false
  })

  /**
   * 生成设备ID
   */
  function generateDeviceId(): string {
    let deviceId = localStorage.getItem(`md_editor_device_id`)
    if (!deviceId) {
      deviceId = `device_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
      localStorage.setItem(`md_editor_device_id`, deviceId)
    }
    return deviceId
  }

  /**
   * 获取设备名称
   */
  function getDeviceName(): string {
    const userAgent = navigator.userAgent
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return `移动设备`
    }
    else if (/Mac/.test(userAgent)) {
      return `Mac`
    }
    else if (/Windows/.test(userAgent)) {
      return `Windows PC`
    }
    else if (/Linux/.test(userAgent)) {
      return `Linux`
    }
    return `未知设备`
  }

  /**
   * 初始化同步服务
   */
  function initSyncService(): void {
    if (!isConfigured.value)
      return

    const fullConfig: SyncConfig = {
      supabaseUrl: config.value.supabaseUrl!,
      supabaseKey: config.value.supabaseKey!,
      userId: config.value.userId!,
      deviceId: config.value.deviceId!,
      deviceName: config.value.deviceName!,
      autoSync: config.value.autoSync!,
      syncInterval: config.value.syncInterval!,
      encryptData: config.value.encryptData!,
    }

    if (syncService.value) {
      syncService.value.destroy()
    }

    syncService.value = new SupabaseSyncService(fullConfig)

    // 设置获取本地数据的回调
    syncService.value.setGetLocalDataCallback(getLocalData)
  }

  /**
   * 设置主密码
   */
  function setMasterPassword(password: string): void {
    PasswordManager.setMasterPassword(password)
    isMasterPasswordSet.value = true
    hasMasterPassword.value = true
  }

  /**
   * 验证主密码
   */
  async function verifyMasterPassword(password: string): Promise<boolean> {
    const isValid = await PasswordManager.verifyMasterPassword(password)
    if (isValid) {
      PasswordManager.setMasterPassword(password)
      isMasterPasswordSet.value = true
    }
    return isValid
  }

  /**
   * 清除主密码
   */
  function clearMasterPassword(): void {
    PasswordManager.clearMasterPassword()
    isMasterPasswordSet.value = false
    hasMasterPassword.value = false
  }

  /**
   * 获取本地数据
   */
  function getLocalData(dataType: `full` | `posts` | `settings` = `full`): any {
    const store = useStore()

    switch (dataType) {
      case `posts`:
        return {
          posts: store.posts,
          currentPostId: store.currentPostId,
        }
      case `settings`:
        return {
          theme: store.theme,
          fontFamily: store.fontFamily,
          fontSize: store.fontSize,
          primaryColor: store.primaryColor,
          codeBlockTheme: store.codeBlockTheme,
          legend: store.legend,
          isMacCodeBlock: store.isMacCodeBlock,
          isCiteStatus: store.isCiteStatus,
          isCountStatus: store.isCountStatus,
          isUseIndent: store.isUseIndent,
          showAIToolbox: store.showAIToolbox,
          cssContentConfig: store.cssContentConfig,
        }
      case `full`:
      default:
        return {
          posts: store.posts,
          currentPostId: store.currentPostId,
          settings: {
            theme: store.theme,
            fontFamily: store.fontFamily,
            fontSize: store.fontSize,
            primaryColor: store.primaryColor,
            codeBlockTheme: store.codeBlockTheme,
            legend: store.legend,
            isMacCodeBlock: store.isMacCodeBlock,
            isCiteStatus: store.isCiteStatus,
            isCountStatus: store.isCountStatus,
            isUseIndent: store.isUseIndent,
            showAIToolbox: store.showAIToolbox,
            cssContentConfig: store.cssContentConfig,
          },
        }
    }
  }

  /**
   * 应用远程数据
   */
  function applyRemoteData(data: any, dataType: `full` | `posts` | `settings` = `full`): void {
    const store = useStore()

    if (dataType === `posts` || dataType === `full`) {
      if (data.posts) {
        store.posts = data.posts
      }
      if (data.currentPostId) {
        store.currentPostId = data.currentPostId
      }
    }

    if (dataType === `settings` || dataType === `full`) {
      const settings = dataType === `settings` ? data : data.settings
      if (settings) {
        Object.keys(settings).forEach((key) => {
          if (key in store && settings[key] !== undefined) {
            (store as any)[key] = settings[key]
          }
        })
      }
    }
  }

  /**
   * 上传数据
   */
  async function uploadData(dataType: `full` | `posts` | `settings` = `full`): Promise<void> {
    if (!syncService.value || !canSync.value) {
      throw new Error(`同步服务未就绪`)
    }

    syncStatus.value = { status: `syncing`, message: `正在上传数据...` }

    try {
      const localData = getLocalData(dataType)
      await syncService.value.uploadData(localData, dataType)

      syncStatus.value = { status: `success`, message: `上传成功` }
      lastSyncTime.value = new Date()

      // 3秒后重置状态
      setTimeout(() => {
        if (syncStatus.value.status === `success`) {
          syncStatus.value = { status: `idle`, message: `` }
        }
      }, 3000)
    }
    catch (error: any) {
      syncStatus.value = { status: `error`, message: error.message }
      throw error
    }
  }

  /**
   * 下载数据
   */
  async function downloadData(dataType: `full` | `posts` | `settings` = `full`): Promise<void> {
    if (!syncService.value || !canSync.value) {
      throw new Error(`同步服务未就绪`)
    }

    syncStatus.value = { status: `syncing`, message: `正在下载数据...` }

    try {
      const remoteData = await syncService.value.downloadData(dataType)
      applyRemoteData(remoteData, dataType)

      syncStatus.value = { status: `success`, message: `下载成功` }
      lastSyncTime.value = new Date()

      // 3秒后重置状态
      setTimeout(() => {
        if (syncStatus.value.status === `success`) {
          syncStatus.value = { status: `idle`, message: `` }
        }
      }, 3000)
    }
    catch (error: any) {
      syncStatus.value = { status: `error`, message: error.message }
      throw error
    }
  }

  /**
   * 双向同步
   */
  async function syncData(dataType: `full` | `posts` | `settings` = `full`): Promise<void> {
    if (!syncService.value || !canSync.value) {
      throw new Error(`同步服务未就绪`)
    }

    syncStatus.value = { status: `syncing`, message: `正在检查冲突...` }

    try {
      const localData = getLocalData(dataType)
      const detectedConflicts = await syncService.value.detectConflicts(localData, dataType)

      if (detectedConflicts.length > 0) {
        conflicts.value = detectedConflicts
        syncStatus.value = {
          status: `conflict`,
          message: `检测到 ${detectedConflicts.length} 个冲突，需要手动解决`,
          conflicts: detectedConflicts,
        }
        return
      }

      // 没有冲突，执行上传
      await uploadData(dataType)
    }
    catch (error: any) {
      syncStatus.value = { status: `error`, message: error.message }
      throw error
    }
  }

  /**
   * 解决冲突
   */
  async function resolveConflicts(resolution: `local` | `remote` | `merge`): Promise<void> {
    if (!syncService.value || conflicts.value.length === 0)
      return

    isResolvingConflicts.value = true
    syncStatus.value = { status: `syncing`, message: `正在解决冲突...` }

    try {
      const localData = getLocalData(`full`)

      if (resolution === `local`) {
        // 使用本地数据覆盖远程
        await syncService.value.uploadData(localData, `full`)
      }
      else if (resolution === `remote`) {
        // 使用远程数据覆盖本地
        const remoteData = await syncService.value.downloadData(`full`)
        applyRemoteData(remoteData, `full`)
      }
      else if (resolution === `merge`) {
        // 智能合并
        const remoteData = await syncService.value.downloadData(`full`)
        const mergedData = syncService.value.mergeData(localData, remoteData, conflicts.value)
        applyRemoteData(mergedData, `full`)
        await syncService.value.uploadData(mergedData, `full`)
      }

      conflicts.value = []
      syncStatus.value = { status: `success`, message: `冲突解决成功` }
      lastSyncTime.value = new Date()

      setTimeout(() => {
        if (syncStatus.value.status === `success`) {
          syncStatus.value = { status: `idle`, message: `` }
        }
      }, 3000)
    }
    catch (error: any) {
      syncStatus.value = { status: `error`, message: error.message }
      throw error
    }
    finally {
      isResolvingConflicts.value = false
    }
  }

  /**
   * 测试连接
   */
  async function testConnection(): Promise<boolean> {
    if (!syncService.value)
      return false
    return await syncService.value.testConnection()
  }

  /**
   * 启用同步
   */
  function enableSync(): void {
    if (!isConfigured.value) {
      throw new Error(`请先完成配置`)
    }

    isEnabled.value = true
    initSyncService()
  }

  /**
   * 禁用同步
   */
  function disableSync(): void {
    isEnabled.value = false
    if (syncService.value) {
      syncService.value.destroy()
      syncService.value = null
    }
  }

  // 监听配置变化
  watch(
    () => [config.value.supabaseUrl, config.value.supabaseKey, config.value.userId],
    () => {
      if (isEnabled.value && isConfigured.value) {
        initSyncService()
      }
    },
    { deep: true },
  )

  // 监听启用状态变化
  watch(isEnabled, (enabled) => {
    if (enabled && isConfigured.value) {
      initSyncService()
    }
    else if (!enabled && syncService.value) {
      syncService.value.destroy()
      syncService.value = null
    }
  })

  return {
    // 状态
    isEnabled,
    isConfigured,
    canSync,
    isOnline,
    syncStatus,
    syncStatusText,
    lastSyncTime,
    conflicts,
    isResolvingConflicts,
    hasMasterPassword,
    isMasterPasswordSet,

    // 配置
    config,

    // 方法
    setMasterPassword,
    verifyMasterPassword,
    clearMasterPassword,
    uploadData,
    downloadData,
    syncData,
    resolveConflicts,
    testConnection,
    enableSync,
    disableSync,
    initSyncService,
  }
})
