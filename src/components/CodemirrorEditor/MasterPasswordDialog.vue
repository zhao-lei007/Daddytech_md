<script setup lang="ts">
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Info,
  Key,
  Lock,
  RefreshCw,
  Shield,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useCloudSyncStore } from '@/stores/cloudSync'
import { EncryptionService } from '@/utils/encryption'

const props = defineProps<{
  visible: boolean
  mode: `setup` | `verify` | `change`
}>()

const emit = defineEmits<{
  close: []
  success: [password: string]
}>()

const cloudSyncStore = useCloudSyncStore()

// 表单状态
const currentPassword = ref(``)
const newPassword = ref(``)
const confirmPassword = ref(``)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)
const error = ref(``)

// 密码强度
const passwordStrength = computed(() => {
  if (!newPassword.value)
    return { score: 0, text: ``, color: `` }

  let score = 0
  const password = newPassword.value

  // 长度检查
  if (password.length >= 8)
    score += 20
  if (password.length >= 12)
    score += 10

  // 字符类型检查
  if (/[a-z]/.test(password))
    score += 20
  if (/[A-Z]/.test(password))
    score += 20
  if (/\d/.test(password))
    score += 20
  if (/[^a-z0-9]/i.test(password))
    score += 10

  let text = ``
  let color = ``

  if (score < 40) {
    text = `弱`
    color = `bg-red-500`
  }
  else if (score < 70) {
    text = `中等`
    color = `bg-yellow-500`
  }
  else {
    text = `强`
    color = `bg-green-500`
  }

  return { score, text, color }
})

// 表单验证
const isFormValid = computed(() => {
  if (props.mode === `verify`) {
    return currentPassword.value.length > 0
  }

  if (props.mode === `setup`) {
    return newPassword.value.length >= 8
      && newPassword.value === confirmPassword.value
  }

  if (props.mode === `change`) {
    return currentPassword.value.length > 0
      && newPassword.value.length >= 8
      && newPassword.value === confirmPassword.value
  }

  return false
})

// 密码匹配检查
const passwordsMatch = computed(() => {
  if (!confirmPassword.value)
    return true
  return newPassword.value === confirmPassword.value
})

// 生成随机密码
function generateRandomPassword(): void {
  newPassword.value = EncryptionService.generatePassword(16)
  confirmPassword.value = newPassword.value
}

// 提交表单
async function handleSubmit(): Promise<void> {
  if (!isFormValid.value)
    return

  isLoading.value = true
  error.value = ``

  try {
    if (props.mode === `verify`) {
      const isValid = await cloudSyncStore.verifyMasterPassword(currentPassword.value)
      if (!isValid) {
        error.value = `密码错误，请重试`
        return
      }
      emit(`success`, currentPassword.value)
    }
    else if (props.mode === `setup`) {
      const validation = EncryptionService.validatePassword(newPassword.value)
      if (!validation.valid) {
        error.value = validation.message
        return
      }
      cloudSyncStore.setMasterPassword(newPassword.value)
      emit(`success`, newPassword.value)
    }
    else if (props.mode === `change`) {
      const isValid = await cloudSyncStore.verifyMasterPassword(currentPassword.value)
      if (!isValid) {
        error.value = `当前密码错误`
        return
      }
      const validation = EncryptionService.validatePassword(newPassword.value)
      if (!validation.valid) {
        error.value = validation.message
        return
      }
      cloudSyncStore.setMasterPassword(newPassword.value)
      emit(`success`, newPassword.value)
    }

    emit(`close`)
  }
  catch (err: any) {
    error.value = err.message || `操作失败`
  }
  finally {
    isLoading.value = false
  }
}

// 重置表单
function resetForm(): void {
  currentPassword.value = ``
  newPassword.value = ``
  confirmPassword.value = ``
  error.value = ``
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
}

// 监听对话框关闭
watch(() => props.visible, (visible) => {
  if (!visible) {
    resetForm()
  }
})
</script>

<template>
  <Dialog :open="visible" @update:open="(open) => !open && emit('close')">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Lock class="h-5 w-5" />
          <span v-if="mode === 'setup'">设置主密码</span>
          <span v-else-if="mode === 'verify'">验证主密码</span>
          <span v-else>修改主密码</span>
        </DialogTitle>
        <DialogDescription>
          <span v-if="mode === 'setup'">
            主密码用于加密您的敏感数据，请妥善保管
          </span>
          <span v-else-if="mode === 'verify'">
            请输入主密码以解锁加密数据
          </span>
          <span v-else>
            请输入当前密码并设置新的主密码
          </span>
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <!-- 安全提示 -->
        <Alert v-if="mode === 'setup'">
          <Shield class="h-4 w-4" />
          <AlertDescription>
            <strong>重要提示：</strong>主密码无法找回，请务必记住或安全保存。
            丢失主密码将导致加密数据无法解密。
          </AlertDescription>
        </Alert>

        <!-- 当前密码输入 -->
        <div v-if="mode === 'verify' || mode === 'change'" class="space-y-2">
          <Label for="current-password">
            {{ mode === 'verify' ? '主密码' : '当前密码' }}
          </Label>
          <div class="relative">
            <Input
              id="current-password"
              v-model="currentPassword"
              :type="showCurrentPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              class="pr-10"
              @keyup.enter="handleSubmit"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-full px-3"
              @click="showCurrentPassword = !showCurrentPassword"
            >
              <Eye v-if="showCurrentPassword" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <!-- 新密码输入 -->
        <div v-if="mode === 'setup' || mode === 'change'" class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="new-password">
              {{ mode === 'setup' ? '主密码' : '新密码' }}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="text-xs"
              @click="generateRandomPassword"
            >
              <RefreshCw class="mr-1 h-3 w-3" />
              生成
            </Button>
          </div>
          <div class="relative">
            <Input
              id="new-password"
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              class="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-full px-3"
              @click="showNewPassword = !showNewPassword"
            >
              <Eye v-if="showNewPassword" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </Button>
          </div>

          <!-- 密码强度指示器 -->
          <div v-if="newPassword" class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span>密码强度</span>
              <Badge :variant="passwordStrength.score >= 70 ? 'default' : 'secondary'">
                {{ passwordStrength.text }}
              </Badge>
            </div>
            <Progress
              :value="passwordStrength.score"
              :class="passwordStrength.color"
              class="h-2"
            />
          </div>
        </div>

        <!-- 确认密码输入 -->
        <div v-if="mode === 'setup' || mode === 'change'" class="space-y-2">
          <Label for="confirm-password">确认密码</Label>
          <div class="relative">
            <Input
              id="confirm-password"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="请再次输入密码"
              class="pr-10"
              :class="{ 'border-red-500': confirmPassword && !passwordsMatch }"
              @keyup.enter="handleSubmit"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-full px-3"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <Eye v-if="showConfirmPassword" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </Button>
          </div>
          <p v-if="confirmPassword && !passwordsMatch" class="text-sm text-red-500">
            密码不匹配
          </p>
        </div>

        <!-- 密码要求说明 -->
        <Card v-if="mode === 'setup' || mode === 'change'" class="bg-muted/30">
          <CardHeader class="pb-2">
            <CardTitle class="flex items-center gap-2 text-sm">
              <Info class="h-4 w-4" />
              密码要求
            </CardTitle>
          </CardHeader>
          <CardContent class="pt-0">
            <ul class="space-y-1 text-muted-foreground text-xs">
              <li class="flex items-center gap-2">
                <CheckCircle
                  :class="newPassword.length >= 8 ? 'text-green-500' : 'text-gray-400'"
                  class="h-3 w-3"
                />
                至少8个字符
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle
                  :class="/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'"
                  class="h-3 w-3"
                />
                包含大写字母
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle
                  :class="/[a-z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'"
                  class="h-3 w-3"
                />
                包含小写字母
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle
                  :class="/[0-9]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'"
                  class="h-3 w-3"
                />
                包含数字
              </li>
            </ul>
          </CardContent>
        </Card>

        <!-- 错误提示 -->
        <Alert v-if="error" variant="destructive">
          <AlertTriangle class="h-4 w-4" />
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 pt-4">
          <Button variant="outline" :disabled="isLoading" @click="emit('close')">
            取消
          </Button>
          <Button
            :disabled="!isFormValid || isLoading"
            class="min-w-20"
            @click="handleSubmit"
          >
            <Key v-if="!isLoading" class="mr-2 h-4 w-4" />
            <div v-else class="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            <span v-if="mode === 'setup'">设置</span>
            <span v-else-if="mode === 'verify'">验证</span>
            <span v-else>修改</span>
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
