// 云同步服务类型
export type SyncProvider = `github` | `webdav` | `custom`

// 同步配置接口
export interface SyncConfig {
  provider: SyncProvider
  enabled: boolean
  autoSync: boolean
  syncInterval: number // 分钟
  lastSync: string | null

  github?: {
    token: string
    repo: string
    branch: string
    path: string
  }
  webdav?: {
    url: string
    username: string
    password: string
    path: string
  }
  custom?: {
    uploadUrl: string
    downloadUrl: string
    token: string
  }
}

// 同步数据接口
export interface SyncData {
  posts: any[]
  settings: Record<string, any>
  syncTime: string
  version: string
  userId?: string
}

// 云同步服务类
export class CloudSyncService {
  private config: SyncConfig

  constructor(config: SyncConfig) {
    this.config = config
  }

  // 上传数据到云端
  async uploadData(data: SyncData): Promise<void> {
    switch (this.config.provider) {
      case `github`:
        return this.uploadToGitHub(data)
      case `webdav`:
        return this.uploadToWebDAV(data)
      case `custom`:
        return this.uploadToCustom(data)
      default:
        throw new Error(`不支持的同步提供商: ${this.config.provider}`)
    }
  }

  // 从云端下载数据
  async downloadData(): Promise<SyncData> {
    switch (this.config.provider) {
      case `github`:
        return this.downloadFromGitHub()
      case `webdav`:
        return this.downloadFromWebDAV()
      case `custom`:
        return this.downloadFromCustom()
      default:
        throw new Error(`不支持的同步提供商: ${this.config.provider}`)
    }
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case `github`:
          return this.testGitHubConnection()
        case `webdav`:
          return this.testWebDAVConnection()
        case `custom`:
          return this.testCustomConnection()
        default:
          return false
      }
    }
    catch (error) {
      console.error(`Connection test failed:`, error)
      return false
    }
  }

  // GitHub 相关方法
  private async uploadToGitHub(data: SyncData): Promise<void> {
    const config = this.config.github!
    const url = `https://api.github.com/repos/${config.repo}/contents/${config.path}/data.json`

    // 先获取文件的 SHA (如果存在)
    let sha = ``
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${config.token}`,
          Accept: `application/vnd.github.v3+json`,
        },
      })
      if (response.ok) {
        const fileData = await response.json()
        sha = fileData.sha
      }
    }
    catch {
      // 文件不存在，忽略错误
    }

    const content = JSON.stringify(data, null, 2)
    const body = {
      message: `Update MD Editor data - ${new Date().toISOString()}`,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: config.branch,
      ...(sha && { sha }),
    }

    const response = await fetch(url, {
      method: `PUT`,
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': `application/vnd.github.v3+json`,
        'Content-Type': `application/json`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`GitHub 上传失败: ${response.statusText}`)
    }
  }

  private async downloadFromGitHub(): Promise<SyncData> {
    const config = this.config.github!
    const url = `https://api.github.com/repos/${config.repo}/contents/${config.path}/data.json`

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: `application/vnd.github.v3+json`,
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub 下载失败: ${response.statusText}`)
    }

    const data = await response.json()
    const content = decodeURIComponent(escape(atob(data.content)))
    return JSON.parse(content)
  }

  private async testGitHubConnection(): Promise<boolean> {
    const config = this.config.github!
    const response = await fetch(`https://api.github.com/repos/${config.repo}`, {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: `application/vnd.github.v3+json`,
      },
    })

    return response.ok
  }

  // WebDAV 相关方法 (待实现)
  private async uploadToWebDAV(_data: SyncData): Promise<void> {
    throw new Error(`WebDAV 同步功能开发中`)
  }

  private async downloadFromWebDAV(): Promise<SyncData> {
    throw new Error(`WebDAV 同步功能开发中`)
  }

  private async testWebDAVConnection(): Promise<boolean> {
    throw new Error(`WebDAV 连接测试功能开发中`)
  }

  // 自定义 API 相关方法 (待实现)
  private async uploadToCustom(_data: SyncData): Promise<void> {
    throw new Error(`自定义 API 同步功能开发中`)
  }

  private async downloadFromCustom(): Promise<SyncData> {
    throw new Error(`自定义 API 同步功能开发中`)
  }

  private async testCustomConnection(): Promise<boolean> {
    throw new Error(`自定义 API 连接测试功能开发中`)
  }
}

// 创建同步服务实例
export function createSyncService(config: SyncConfig): CloudSyncService {
  return new CloudSyncService(config)
}

// 默认配置
export const defaultSyncConfig: SyncConfig = {
  provider: `github`,
  enabled: false,
  autoSync: false,
  syncInterval: 30,
  lastSync: null,
  github: {
    token: ``,
    repo: ``,
    branch: `main`,
    path: `md-editor-data`,
  },
}
