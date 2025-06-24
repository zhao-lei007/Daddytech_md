/**
 * 数据加密工具类
 * 使用 Web Crypto API 实现 AES-GCM 加密
 */

export class EncryptionService {
  private static readonly ALGORITHM = `AES-GCM`
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12

  /**
   * 从密码生成加密密钥
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      `raw`,
      encoder.encode(password),
      `PBKDF2`,
      false,
      [`deriveKey`],
    )

    return crypto.subtle.deriveKey(
      {
        name: `PBKDF2`,
        salt,
        iterations: 100000,
        hash: `SHA-256`,
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false,
      [`encrypt`, `decrypt`],
    )
  }

  /**
   * 加密数据
   */
  static async encrypt(data: string, password: string): Promise<string> {
    try {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)

      // 生成随机盐和初始化向量
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))

      // 派生密钥
      const key = await this.deriveKey(password, salt)

      // 加密数据
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv,
        },
        key,
        dataBuffer,
      )

      // 组合盐、IV和加密数据
      const result = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength)
      result.set(salt, 0)
      result.set(iv, salt.length)
      result.set(new Uint8Array(encryptedBuffer), salt.length + iv.length)

      // 转换为 Base64
      return btoa(String.fromCharCode(...result))
    }
    catch (error) {
      console.error(`Encryption failed:`, error)
      throw new Error(`数据加密失败`)
    }
  }

  /**
   * 解密数据
   */
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      // 从 Base64 解码
      const data = new Uint8Array(
        atob(encryptedData)
          .split(``)
          .map(char => char.charCodeAt(0)),
      )

      // 提取盐、IV和加密数据
      const salt = data.slice(0, 16)
      const iv = data.slice(16, 16 + this.IV_LENGTH)
      const encryptedBuffer = data.slice(16 + this.IV_LENGTH)

      // 派生密钥
      const key = await this.deriveKey(password, salt)

      // 解密数据
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv,
        },
        key,
        encryptedBuffer,
      )

      // 转换为字符串
      const decoder = new TextDecoder()
      return decoder.decode(decryptedBuffer)
    }
    catch (error) {
      console.error(`Decryption failed:`, error)
      throw new Error(`数据解密失败，请检查密码是否正确`)
    }
  }

  /**
   * 生成随机密码
   */
  static generatePassword(length: number = 32): string {
    const chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*`
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array, byte => chars[byte % chars.length]).join(``)
  }

  /**
   * 验证密码强度
   */
  static validatePassword(password: string): { valid: boolean, message: string } {
    if (password.length < 8) {
      return { valid: false, message: `密码长度至少8位` }
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: `密码需包含大写字母` }
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: `密码需包含小写字母` }
    }
    if (!/\d/.test(password)) {
      return { valid: false, message: `密码需包含数字` }
    }
    return { valid: true, message: `密码强度良好` }
  }

  /**
   * 加密敏感配置
   */
  static async encryptSensitiveData(data: Record<string, any>, password: string): Promise<Record<string, any>> {
    const sensitiveFields = [
      `token`,
      `key`,
      `secret`,
      `password`,
      `accessToken`,
      `secretKey`,
      `apiKey`,
      `apiSecret`,
      `accessKeyId`,
      `accessKeySecret`,
    ]

    const result = { ...data }

    for (const [key, value] of Object.entries(result)) {
      if (typeof value === `string` && value && sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase()),
      )) {
        result[key] = await this.encrypt(value, password)
      }
      else if (typeof value === `object` && value !== null) {
        result[key] = await this.encryptSensitiveData(value, password)
      }
    }

    return result
  }

  /**
   * 解密敏感配置
   */
  static async decryptSensitiveData(data: Record<string, any>, password: string): Promise<Record<string, any>> {
    const sensitiveFields = [
      `token`,
      `key`,
      `secret`,
      `password`,
      `accessToken`,
      `secretKey`,
      `apiKey`,
      `apiSecret`,
      `accessKeyId`,
      `accessKeySecret`,
    ]

    const result = { ...data }

    for (const [key, value] of Object.entries(result)) {
      if (typeof value === `string` && value && sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase()),
      )) {
        try {
          result[key] = await this.decrypt(value, password)
        }
        catch (error) {
          console.warn(`Failed to decrypt field ${key}:`, error)
          // 如果解密失败，保持原值（可能是未加密的数据）
        }
      }
      else if (typeof value === `object` && value !== null) {
        result[key] = await this.decryptSensitiveData(value, password)
      }
    }

    return result
  }
}

/**
 * 密码管理器
 */
export class PasswordManager {
  private static readonly STORAGE_KEY = `md_editor_master_key`
  private static masterPassword: string | null = null

  /**
   * 设置主密码
   */
  static setMasterPassword(password: string): void {
    this.masterPassword = password
    // 将密码哈希存储到 localStorage 用于验证
    this.storeMasterPasswordHash(password)
  }

  /**
   * 获取主密码
   */
  static getMasterPassword(): string | null {
    return this.masterPassword
  }

  /**
   * 验证主密码
   */
  static async verifyMasterPassword(password: string): Promise<boolean> {
    const storedHash = localStorage.getItem(this.STORAGE_KEY)
    if (!storedHash)
      return false

    try {
      const hash = await this.hashPassword(password)
      return hash === storedHash
    }
    catch (error) {
      console.error(`Password verification failed:`, error)
      return false
    }
  }

  /**
   * 检查是否已设置主密码
   */
  static hasMasterPassword(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY)
  }

  /**
   * 清除主密码
   */
  static clearMasterPassword(): void {
    this.masterPassword = null
    localStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * 存储主密码哈希
   */
  private static async storeMasterPasswordHash(password: string): Promise<void> {
    const hash = await this.hashPassword(password)
    localStorage.setItem(this.STORAGE_KEY, hash)
  }

  /**
   * 计算密码哈希
   */
  private static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest(`SHA-256`, data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, `0`)).join(``)
  }
}
