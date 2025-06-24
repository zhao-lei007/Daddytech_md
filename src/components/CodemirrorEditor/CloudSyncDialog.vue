<script setup lang="ts">
import {
  AlertTriangle,
  Check,
  Cloud,
  Database,
  Download,
  Info,
  Key,
  Lock,
  Monitor,
  RefreshCw,
  Shield,
  Sync,
  Unlock,
  Upload,
  Wifi,
  WifiOff,
  X,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/stores'
import { useCloudSyncStore } from '@/stores/cloudSync'
import MasterPasswordDialog from './MasterPasswordDialog.vue'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useStore()
const cloudSyncStore = useCloudSyncStore()

// 本地状态
const activeTab = ref(`status`)
const isTestingConnection = ref(false)
const testResult = ref<{ success: boolean, message: string } | null>(null)
const masterPasswordDialogVisible = ref(false)
const masterPasswordMode = ref<`setup` | `verify` | `change`>(`setup`)
const showAdvancedSettings = ref(false)

// 计算属性
const syncStatusIcon = computed(() => {
  switch (cloudSyncStore.syncStatus.status) {
    case `success`:
      return Check
    case `error`:
      return X
    case `syncing`:
      return RefreshCw
    case `conflict`:
      return AlertTriangle
    default:
      return Cloud
  }
})

const syncStatusColor = computed(() => {
  switch (cloudSyncStore.syncStatus.status) {
    case `success`:
      return `text-green-500`
    case `error`:
      return `text-red-500`
    case `syncing`:
      return `text-blue-500`
    case `conflict`:
      return `text-yellow-500`
    default:
      return `text-gray-500`
  }
})

const needsMasterPassword = computed(() => {
  return cloudSyncStore.config.encryptData && !cloudSyncStore.isMasterPasswordSet
})

// 方法
async function handleSync(direction: `upload` | `download` | `sync`) {
  if (needsMasterPassword.value) {
    masterPasswordMode.value = cloudSyncStore.hasMasterPassword ? `verify` : `setup`
    masterPasswordDialogVisible.value = true
    return
  }

  try {
    switch (direction) {
      case `upload`:
        await cloudSyncStore.uploadData(`full`)
        break
      case `download`:
        await cloudSyncStore.downloadData(`full`)
        break
      case `sync`:
        await cloudSyncStore.syncData(`full`)
        break
    }
  }
  catch (error: any) {
    console.error(`Sync error:`, error)
  }
}

async function testConnection() {
  if (!cloudSyncStore.isConfigured) {
    testResult.value = { success: false, message: `请先完成配置` }
    return
  }

  isTestingConnection.value = true
  testResult.value = null

  try {
    cloudSyncStore.initSyncService()
    const success = await cloudSyncStore.testConnection()
    testResult.value = {
      success,
      message: success ? `连接成功` : `连接失败，请检查配置`,
    }
  }
  catch (error: any) {
    testResult.value = {
      success: false,
      message: error.message || `连接测试失败`,
    }
  }
  finally {
    isTestingConnection.value = false
  }
}

function handleMasterPasswordSuccess(_password: string) {
  masterPasswordDialogVisible.value = false
  // 密码已在 store 中设置，可以继续同步操作
}

function toggleSync() {
  if (cloudSyncStore.isEnabled) {
    cloudSyncStore.disableSync()
  }
  else {
    if (!cloudSyncStore.isConfigured) {
      activeTab.value = `config`
      return
    }
    cloudSyncStore.enableSync()
  }
}

function handleConflictResolution(resolution: `local` | `remote` | `merge`) {
  cloudSyncStore.resolveConflicts(resolution)
}

// 格式化时间
function formatTime(date: Date | null): string {
  if (!date)
    return `从未同步`
  return date.toLocaleString(`zh-CN`)
}

// 初始化
onMounted(() => {
  // 如果已配置且启用，初始化同步服务
  if (cloudSyncStore.isEnabled && cloudSyncStore.isConfigured) {
    cloudSyncStore.initSyncService()
  }
})
</script>

<template>
  <Dialog :open="visible" @update:open="(open) => !open && emit('close')">
    <DialogContent class="max-h-[90vh] max-w-4xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Cloud class="h-5 w-5" />
          云同步管理
        </DialogTitle>
      </DialogHeader>

      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid grid-cols-4 w-full">
          <TabsTrigger value="status">
            同步状态
          </TabsTrigger>
          <TabsTrigger value="config">
            配置设置
          </TabsTrigger>
          <TabsTrigger value="security">
            安全设置
          </TabsTrigger>
          <TabsTrigger value="advanced">
            高级选项
          </TabsTrigger>
        </TabsList>

        <!-- 同步状态 -->
        <TabsContent value="status" class="space-y-4">
          <!-- 总体状态卡片 -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <component :is="syncStatusIcon" class="h-5 w-5" :class="[syncStatusColor]" />
                  云同步状态
                </div>
                <div class="flex items-center gap-2">
                  <Badge :variant="cloudSyncStore.isEnabled ? 'default' : 'secondary'">
                    {{ cloudSyncStore.isEnabled ? '已启用' : '未启用' }}
                  </Badge>
                  <Switch
                    :checked="cloudSyncStore.isEnabled"
                    :disabled="!cloudSyncStore.isConfigured"
                    @update:checked="toggleSync"
                  />
                </div>
              </CardTitle>
              <CardDescription>
                {{ cloudSyncStore.syncStatusText }}
                <span v-if="cloudSyncStore.lastSyncTime" class="ml-2">
                  · 上次同步: {{ formatTime(cloudSyncStore.lastSyncTime) }}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <!-- 网络状态 -->
              <div class="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                <div class="flex items-center gap-2">
                  <Wifi v-if="cloudSyncStore.isOnline" class="h-4 w-4 text-green-500" />
                  <WifiOff v-else class="h-4 w-4 text-red-500" />
                  <span class="text-sm">网络状态</span>
                </div>
                <Badge :variant="cloudSyncStore.isOnline ? 'default' : 'destructive'">
                  {{ cloudSyncStore.isOnline ? '在线' : '离线' }}
                </Badge>
              </div>

              <!-- 配置状态 -->
              <div class="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                <div class="flex items-center gap-2">
                  <Database class="h-4 w-4" :class="cloudSyncStore.isConfigured ? 'text-green-500' : 'text-gray-400'" />
                  <span class="text-sm">配置状态</span>
                </div>
                <Badge :variant="cloudSyncStore.isConfigured ? 'default' : 'secondary'">
                  {{ cloudSyncStore.isConfigured ? '已配置' : '未配置' }}
                </Badge>
              </div>

              <!-- 加密状态 -->
              <div class="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                <div class="flex items-center gap-2">
                  <Lock v-if="cloudSyncStore.config.encryptData" class="h-4 w-4 text-blue-500" />
                  <Unlock v-else class="h-4 w-4 text-gray-400" />
                  <span class="text-sm">数据加密</span>
                </div>
                <Badge :variant="cloudSyncStore.config.encryptData ? 'default' : 'secondary'">
                  {{ cloudSyncStore.config.encryptData ? '已启用' : '未启用' }}
                </Badge>
              </div>

              <!-- 同步操作按钮 -->
              <Separator />
              <div class="grid grid-cols-3 gap-2">
                <Button
                  :disabled="!cloudSyncStore.canSync || cloudSyncStore.syncStatus.status === 'syncing'"
                  variant="outline"
                  class="flex-1"
                  @click="handleSync('upload')"
                >
                  <Upload class="mr-2 h-4 w-4" />
                  上传
                </Button>
                <Button
                  :disabled="!cloudSyncStore.canSync || cloudSyncStore.syncStatus.status === 'syncing'"
                  variant="outline"
                  class="flex-1"
                  @click="handleSync('download')"
                >
                  <Download class="mr-2 h-4 w-4" />
                  下载
                </Button>
                <Button
                  :disabled="!cloudSyncStore.canSync || cloudSyncStore.syncStatus.status === 'syncing'"
                  class="flex-1"
                  @click="handleSync('sync')"
                >
                  <Sync class="mr-2 h-4 w-4" />
                  同步
                </Button>
              </div>

              <!-- 冲突处理 -->
              <div v-if="cloudSyncStore.conflicts.length > 0" class="space-y-3">
                <Alert variant="destructive">
                  <AlertTriangle class="h-4 w-4" />
                  <AlertDescription>
                    检测到 {{ cloudSyncStore.conflicts.length }} 个数据冲突，请选择解决方案
                  </AlertDescription>
                </Alert>
                <div class="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="handleConflictResolution('local')"
                  >
                    使用本地
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="handleConflictResolution('remote')"
                  >
                    使用云端
                  </Button>
                  <Button
                    size="sm"
                    @click="handleConflictResolution('merge')"
                  >
                    智能合并
                  </Button>
                </div>
              </div>

              <!-- 主密码提示 -->
              <Alert v-if="needsMasterPassword">
                <Key class="h-4 w-4" />
                <AlertDescription>
                  数据加密已启用，需要设置主密码才能同步
                  <Button
                    variant="link"
                    size="sm"
                    class="ml-2 h-auto p-0"
                    @click="masterPasswordDialogVisible = true; masterPasswordMode = cloudSyncStore.hasMasterPassword ? 'verify' : 'setup'"
                  >
                    {{ cloudSyncStore.hasMasterPassword ? '输入密码' : '设置密码' }}
                  </Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- 配置设置 -->
        <TabsContent value="config" class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supabase 配置</CardTitle>
              <CardDescription>
                配置 Supabase 数据库连接信息
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <Alert>
                <Info class="h-4 w-4" />
                <AlertDescription>
                  需要创建 Supabase 项目并获取 URL 和 API Key。
                  <a href="https://supabase.com" target="_blank" class="text-blue-500 hover:underline">
                    点击这里注册 Supabase
                  </a>
                </AlertDescription>
              </Alert>

              <div class="space-y-2">
                <Label>项目 URL</Label>
                <Input
                  v-model="cloudSyncStore.config.supabaseUrl"
                  placeholder="https://your-project.supabase.co"
                />
              </div>

              <div class="space-y-2">
                <Label>API Key (anon public)</Label>
                <Input
                  v-model="cloudSyncStore.config.supabaseKey"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>

              <div class="space-y-2">
                <Label>用户 ID</Label>
                <Input
                  v-model="cloudSyncStore.config.userId"
                  placeholder="your-unique-user-id"
                />
                <p class="text-muted-foreground text-xs">
                  可以使用邮箱或任何唯一标识符
                </p>
              </div>

              <div class="space-y-2">
                <Label>设备名称</Label>
                <Input
                  v-model="cloudSyncStore.config.deviceName"
                  placeholder="我的设备"
                />
              </div>

              <Separator />

              <div class="flex items-center justify-between">
                <div>
                  <Label>自动同步</Label>
                  <p class="text-muted-foreground text-xs">
                    定期自动同步数据
                  </p>
                </div>
                <Switch
                  :checked="cloudSyncStore.config.autoSync"
                  @update:checked="(checked) => cloudSyncStore.config.autoSync = checked"
                />
              </div>

              <div v-if="cloudSyncStore.config.autoSync" class="space-y-2">
                <Label>同步间隔 (分钟)</Label>
                <Input
                  v-model.number="cloudSyncStore.config.syncInterval"
                  type="number"
                  min="5"
                  max="1440"
                  placeholder="30"
                />
              </div>

              <div class="flex gap-2 pt-4">
                <Button
                  :disabled="!cloudSyncStore.isConfigured || isTestingConnection"
                  variant="outline"
                  @click="testConnection"
                >
                  <RefreshCw class="mr-2 h-4 w-4" :class="[{ 'animate-spin': isTestingConnection }]" />
                  测试连接
                </Button>
                <Button
                  :disabled="!cloudSyncStore.isConfigured"
                  :variant="cloudSyncStore.isEnabled ? 'destructive' : 'default'"
                  @click="toggleSync"
                >
                  {{ cloudSyncStore.isEnabled ? '禁用同步' : '启用同步' }}
                </Button>
              </div>

              <!-- 测试结果 -->
              <Alert v-if="testResult" :variant="testResult.success ? 'default' : 'destructive'">
                <Check v-if="testResult.success" class="h-4 w-4" />
                <X v-else class="h-4 w-4" />
                <AlertDescription>{{ testResult.message }}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- 安全设置 -->
        <TabsContent value="security" class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Shield class="h-5 w-5" />
                数据加密
              </CardTitle>
              <CardDescription>
                保护您的敏感数据安全
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <Label>启用数据加密</Label>
                  <p class="text-muted-foreground text-xs">
                    加密 API 密钥等敏感信息
                  </p>
                </div>
                <Switch
                  :checked="cloudSyncStore.config.encryptData"
                  @update:checked="(checked) => cloudSyncStore.config.encryptData = checked"
                />
              </div>

              <div v-if="cloudSyncStore.config.encryptData" class="space-y-4">
                <Separator />

                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">主密码状态</span>
                    <Badge :variant="cloudSyncStore.hasMasterPassword ? 'default' : 'secondary'">
                      {{ cloudSyncStore.hasMasterPassword ? '已设置' : '未设置' }}
                    </Badge>
                  </div>

                  <div class="flex gap-2">
                    <Button
                      v-if="!cloudSyncStore.hasMasterPassword"
                      variant="outline"
                      size="sm"
                      @click="masterPasswordDialogVisible = true; masterPasswordMode = 'setup'"
                    >
                      <Key class="mr-2 h-4 w-4" />
                      设置主密码
                    </Button>
                    <template v-else>
                      <Button
                        variant="outline"
                        size="sm"
                        @click="masterPasswordDialogVisible = true; masterPasswordMode = 'verify'"
                      >
                        <Unlock class="mr-2 h-4 w-4" />
                        验证密码
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        @click="masterPasswordDialogVisible = true; masterPasswordMode = 'change'"
                      >
                        <Key class="mr-2 h-4 w-4" />
                        修改密码
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        @click="cloudSyncStore.clearMasterPassword"
                      >
                        清除密码
                      </Button>
                    </template>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle class="h-4 w-4" />
                  <AlertDescription>
                    <strong>重要提示：</strong>主密码无法找回，请务必记住或安全保存。
                    丢失主密码将导致加密数据无法解密。
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- 高级选项 -->
        <TabsContent value="advanced" class="space-y-4">
          <!-- 设备管理 -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Monitor class="h-5 w-5" />
                设备管理
              </CardTitle>
              <CardDescription>
                管理同步的设备信息
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <Label class="text-muted-foreground text-xs">设备 ID</Label>
                  <p class="text-sm font-mono">
                    {{ cloudSyncStore.config.deviceId }}
                  </p>
                </div>
                <div>
                  <Label class="text-muted-foreground text-xs">设备名称</Label>
                  <p class="text-sm">
                    {{ cloudSyncStore.config.deviceName }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- 数据管理 -->
          <Card>
            <CardHeader>
              <CardTitle>数据管理</CardTitle>
              <CardDescription>
                导出、导入和清理数据
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" @click="store.exportAllData">
                  <Download class="mr-2 h-4 w-4" />
                  导出本地数据
                </Button>
                <Button variant="outline" size="sm" @click="store.importAllData">
                  <Upload class="mr-2 h-4 w-4" />
                  导入本地数据
                </Button>
              </div>

              <Separator />

              <div class="space-y-2">
                <Label class="text-destructive text-sm font-medium">危险操作</Label>
                <p class="text-muted-foreground text-xs">
                  以下操作不可逆，请谨慎使用
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  @click="cloudSyncStore.clearMasterPassword"
                >
                  清除所有同步数据
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- 调试信息 -->
          <Card v-if="showAdvancedSettings">
            <CardHeader>
              <CardTitle>调试信息</CardTitle>
            </CardHeader>
            <CardContent>
              <pre class="bg-muted max-h-40 overflow-auto rounded p-3 text-xs">{{ JSON.stringify({
                isConfigured: cloudSyncStore.isConfigured,
                isEnabled: cloudSyncStore.isEnabled,
                canSync: cloudSyncStore.canSync,
                isOnline: cloudSyncStore.isOnline,
                syncStatus: cloudSyncStore.syncStatus,
                config: cloudSyncStore.config,
              }, null, 2) }}</pre>
            </CardContent>
          </Card>

          <div class="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              @click="showAdvancedSettings = !showAdvancedSettings"
            >
              {{ showAdvancedSettings ? '隐藏' : '显示' }}调试信息
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>

  <!-- 主密码对话框 -->
  <MasterPasswordDialog
    :visible="masterPasswordDialogVisible"
    :mode="masterPasswordMode"
    @close="masterPasswordDialogVisible = false"
    @success="handleMasterPasswordSuccess"
  />
</template>
