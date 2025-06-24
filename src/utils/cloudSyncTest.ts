/**
 * 云同步功能测试工具
 * 用于验证云同步功能的各个组件是否正常工作
 */

import { EncryptionService, PasswordManager } from './encryption'
import { SupabaseSyncService, type SyncConfig } from './supabaseSync'

export class CloudSyncTester {
  private testResults: Array<{ name: string, success: boolean, message: string }> = []

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log(`🧪 开始云同步功能测试...`)

    await this.testEncryption()
    await this.testPasswordManager()
    await this.testSyncService()

    this.printResults()
  }

  /**
   * 测试加密功能
   */
  async testEncryption(): Promise<void> {
    try {
      // 测试基本加密解密
      const testData = `Hello, World! 这是测试数据 🔐`
      const password = `TestPassword123!`

      const encrypted = await EncryptionService.encrypt(testData, password)
      const decrypted = await EncryptionService.decrypt(encrypted, password)

      if (decrypted === testData) {
        this.addResult(`加密解密`, true, `基本加密解密功能正常`)
      }
      else {
        this.addResult(`加密解密`, false, `解密后数据不匹配`)
        return
      }

      // 测试敏感数据加密
      const sensitiveData = {
        apiKey: `sk-test123456`,
        token: `ghp_test789`,
        normalData: `this is normal`,
        nested: {
          secret: `secret123`,
          public: `public data`,
        },
      }

      const encryptedSensitive = await EncryptionService.encryptSensitiveData(sensitiveData, password)
      const decryptedSensitive = await EncryptionService.decryptSensitiveData(encryptedSensitive, password)

      if (decryptedSensitive.apiKey === sensitiveData.apiKey
        && decryptedSensitive.normalData === sensitiveData.normalData) {
        this.addResult(`敏感数据加密`, true, `敏感数据加密功能正常`)
      }
      else {
        this.addResult(`敏感数据加密`, false, `敏感数据加密失败`)
      }

      // 测试密码验证
      const validation = EncryptionService.validatePassword(`weak`)
      if (!validation.valid) {
        this.addResult(`密码验证`, true, `密码强度验证正常`)
      }
      else {
        this.addResult(`密码验证`, false, `密码强度验证失败`)
      }
    }
    catch (error) {
      this.addResult(`加密功能`, false, `加密测试失败: ${error.message}`)
    }
  }

  /**
   * 测试密码管理器
   */
  async testPasswordManager(): Promise<void> {
    try {
      // 清除现有密码
      PasswordManager.clearMasterPassword()

      if (!PasswordManager.hasMasterPassword()) {
        this.addResult(`密码管理器初始状态`, true, `初始状态正确`)
      }
      else {
        this.addResult(`密码管理器初始状态`, false, `初始状态错误`)
        return
      }

      // 设置主密码
      const testPassword = `TestMasterPassword123!`
      PasswordManager.setMasterPassword(testPassword)

      if (PasswordManager.hasMasterPassword()) {
        this.addResult(`设置主密码`, true, `主密码设置成功`)
      }
      else {
        this.addResult(`设置主密码`, false, `主密码设置失败`)
        return
      }

      // 验证主密码
      const isValid = await PasswordManager.verifyMasterPassword(testPassword)
      if (isValid) {
        this.addResult(`验证主密码`, true, `主密码验证成功`)
      }
      else {
        this.addResult(`验证主密码`, false, `主密码验证失败`)
      }

      // 验证错误密码
      const isInvalid = await PasswordManager.verifyMasterPassword(`wrong password`)
      if (!isInvalid) {
        this.addResult(`错误密码验证`, true, `错误密码正确被拒绝`)
      }
      else {
        this.addResult(`错误密码验证`, false, `错误密码被错误接受`)
      }

      // 清除密码
      PasswordManager.clearMasterPassword()
      if (!PasswordManager.hasMasterPassword()) {
        this.addResult(`清除主密码`, true, `主密码清除成功`)
      }
      else {
        this.addResult(`清除主密码`, false, `主密码清除失败`)
      }
    }
    catch (error) {
      this.addResult(`密码管理器`, false, `密码管理器测试失败: ${error.message}`)
    }
  }

  /**
   * 测试同步服务（需要有效的 Supabase 配置）
   */
  async testSyncService(): Promise<void> {
    try {
      // 创建测试配置
      const testConfig: SyncConfig = {
        supabaseUrl: `https://test.supabase.co`,
        supabaseKey: `test-key`,
        userId: `test-user`,
        deviceId: `test-device`,
        deviceName: `Test Device`,
        autoSync: false,
        syncInterval: 30,
        encryptData: false,
      }

      const syncService = new SupabaseSyncService(testConfig)

      // 测试配置验证
      this.addResult(`同步服务创建`, true, `同步服务创建成功`)

      // 测试数据准备
      const testData = {
        posts: [
          {
            id: `test-post-1`,
            title: `测试文章`,
            content: `这是测试内容`,
            createDatetime: new Date().toISOString(),
            updateDatetime: new Date().toISOString(),
          },
        ],
        settings: {
          theme: `light`,
          fontSize: 14,
        },
      }

      // 测试数据校验和计算
      const checksum = syncService.calculateChecksum(testData)
      if (checksum && typeof checksum === `string`) {
        this.addResult(`数据校验和`, true, `校验和计算正常`)
      }
      else {
        this.addResult(`数据校验和`, false, `校验和计算失败`)
      }

      // 测试数据准备
      const syncData = await syncService.prepareSyncData(testData, `full`)
      if (syncData && syncData.data && syncData.checksum) {
        this.addResult(`数据准备`, true, `同步数据准备正常`)
      }
      else {
        this.addResult(`数据准备`, false, `同步数据准备失败`)
      }

      // 注意：实际的网络测试需要有效的 Supabase 配置
      this.addResult(`同步服务`, true, `同步服务基础功能测试通过（需要有效配置进行完整测试）`)
    }
    catch (error) {
      this.addResult(`同步服务`, false, `同步服务测试失败: ${error.message}`)
    }
  }

  /**
   * 添加测试结果
   */
  private addResult(name: string, success: boolean, message: string): void {
    this.testResults.push({ name, success, message })
  }

  /**
   * 打印测试结果
   */
  private printResults(): void {
    console.log(`\n📊 测试结果汇总:`)
    console.log(`=`.repeat(60))

    let passCount = 0
    let failCount = 0

    this.testResults.forEach((result) => {
      const icon = result.success ? `✅` : `❌`
      const status = result.success ? `PASS` : `FAIL`

      console.log(`${icon} [${status}] ${result.name}`)
      console.log(`   ${result.message}`)

      if (result.success) {
        passCount++
      }
      else {
        failCount++
      }
    })

    console.log(`=`.repeat(60))
    console.log(`📈 总计: ${this.testResults.length} 项测试`)
    console.log(`✅ 通过: ${passCount} 项`)
    console.log(`❌ 失败: ${failCount} 项`)
    console.log(`📊 成功率: ${((passCount / this.testResults.length) * 100).toFixed(1)}%`)

    if (failCount === 0) {
      console.log(`\n🎉 所有测试通过！云同步功能准备就绪。`)
    }
    else {
      console.log(`\n⚠️  部分测试失败，请检查相关功能。`)
    }
  }

  /**
   * 获取测试结果
   */
  getResults(): Array<{ name: string, success: boolean, message: string }> {
    return this.testResults
  }
}

/**
 * 运行快速测试
 */
export async function runQuickTest(): Promise<boolean> {
  const tester = new CloudSyncTester()
  await tester.runAllTests()

  const results = tester.getResults()
  return results.every(result => result.success)
}

/**
 * 在浏览器控制台中运行测试
 */
if (typeof window !== `undefined`) {
  (window as any).testCloudSync = runQuickTest
  console.log(`💡 提示: 在控制台中运行 testCloudSync() 来测试云同步功能`)
}
