<script setup lang="ts">
import {
  ArrowRight,
  CheckCircle,
  Cloud,
  Database,
  FileText,
  Laptop,
  Settings,
  Shield,
  Smartphone,
  Sync,
  Users,
  Zap,
} from 'lucide-vue-next'
import { ref } from 'vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  openCloudSync: []
}>()

const currentStep = ref(1)
const totalSteps = 4

const steps = [
  {
    id: 1,
    title: `创建 Supabase 项目`,
    description: `免费注册并创建数据库项目`,
    icon: Database,
    time: `2分钟`,
    tasks: [
      `访问 supabase.com 注册账号`,
      `创建新项目并设置密码`,
      `等待项目初始化完成`,
    ],
  },
  {
    id: 2,
    title: `配置数据库`,
    description: `执行 SQL 脚本创建数据表`,
    icon: Settings,
    time: `1分钟`,
    tasks: [
      `打开 SQL 编辑器`,
      `执行提供的建表脚本`,
      `确认表创建成功`,
    ],
  },
  {
    id: 3,
    title: `连接编辑器`,
    description: `在编辑器中配置连接信息`,
    icon: Cloud,
    time: `1分钟`,
    tasks: [
      `获取项目 URL 和 API Key`,
      `在编辑器中填写配置`,
      `测试连接并启用同步`,
    ],
  },
  {
    id: 4,
    title: `开始同步`,
    description: `上传数据并在多设备使用`,
    icon: Sync,
    time: `30秒`,
    tasks: [
      `首次上传本地数据`,
      `在其他设备配置相同连接`,
      `享受多设备无缝同步`,
    ],
  },
]

const features = [
  {
    title: `实时同步`,
    description: `数据变更立即同步到云端`,
    icon: Zap,
    color: `text-blue-500`,
  },
  {
    title: `数据加密`,
    description: `敏感信息端到端加密保护`,
    icon: Shield,
    color: `text-green-500`,
  },
  {
    title: `多设备支持`,
    description: `手机、平板、电脑无缝切换`,
    icon: Users,
    color: `text-purple-500`,
  },
  {
    title: `冲突解决`,
    description: `智能检测并解决数据冲突`,
    icon: CheckCircle,
    color: `text-orange-500`,
  },
]

const devices = [
  { name: `笔记本电脑`, icon: Laptop, action: `编辑文章` },
  { name: `手机`, icon: Smartphone, action: `查看同步` },
  { name: `平板`, icon: Smartphone, action: `继续编辑` },
]

function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function startSetup() {
  emit(`openCloudSync`)
  emit(`close`)
}
</script>

<template>
  <Dialog :open="visible" @update:open="(open) => !open && emit('close')">
    <DialogContent class="max-h-[90vh] max-w-4xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-3">
          <div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
            <Cloud class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 class="text-2xl font-bold">
              云同步功能演示
            </h2>
            <p class="text-muted-foreground font-normal">
              让您的数据在多个设备间无缝同步
            </p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <!-- 功能特色 -->
      <div class="grid grid-cols-2 mb-6 gap-4 md:grid-cols-4">
        <div v-for="feature in features" :key="feature.title" class="text-center">
          <div class="bg-muted/30 mb-2 rounded-lg p-3">
            <component :is="feature.icon" class="mx-auto h-6 w-6" :class="[feature.color]" />
          </div>
          <h4 class="text-sm font-medium">
            {{ feature.title }}
          </h4>
          <p class="text-muted-foreground text-xs">
            {{ feature.description }}
          </p>
        </div>
      </div>

      <!-- 使用场景演示 -->
      <Card class="mb-6">
        <CardHeader>
          <CardTitle class="text-lg">
            使用场景
          </CardTitle>
          <CardDescription>在不同设备间无缝切换，数据实时同步</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex items-center justify-between">
            <div v-for="(device, index) in devices" :key="device.name" class="flex flex-col items-center">
              <div class="bg-muted/30 mb-2 rounded-lg p-4">
                <component :is="device.icon" class="h-8 w-8" />
              </div>
              <h4 class="text-sm font-medium">
                {{ device.name }}
              </h4>
              <p class="text-muted-foreground text-xs">
                {{ device.action }}
              </p>
              <ArrowRight v-if="index < devices.length - 1" class="text-muted-foreground mt-2 h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 配置步骤 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>配置步骤</span>
            <Badge variant="outline">
              {{ currentStep }}/{{ totalSteps }}
            </Badge>
          </CardTitle>
          <CardDescription>
            只需 {{ steps.reduce((total, step) => total + parseInt(step.time), 0) }} 分钟完成配置
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- 步骤指示器 -->
          <div class="flex items-center justify-between">
            <div v-for="step in steps" :key="step.id" class="flex flex-1 flex-col items-center">
              <div
                class="h-8 w-8 flex items-center justify-center rounded-full text-sm font-medium" :class="[
                  currentStep >= step.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                ]"
              >
                {{ step.id }}
              </div>
              <div class="mt-1 text-center text-xs">
                <div class="font-medium">
                  {{ step.title }}
                </div>
                <div class="text-muted-foreground">
                  {{ step.time }}
                </div>
              </div>
            </div>
          </div>

          <!-- 当前步骤详情 -->
          <div class="border rounded-lg p-4">
            <div class="flex items-start gap-3">
              <div class="bg-primary/10 rounded-lg p-2">
                <component :is="steps[currentStep - 1].icon" class="text-primary h-5 w-5" />
              </div>
              <div class="flex-1">
                <h3 class="font-semibold">
                  {{ steps[currentStep - 1].title }}
                </h3>
                <p class="text-muted-foreground mb-3 text-sm">
                  {{ steps[currentStep - 1].description }}
                </p>
                <ul class="space-y-1">
                  <li v-for="task in steps[currentStep - 1].tasks" :key="task" class="flex items-center gap-2 text-sm">
                    <div class="bg-primary h-1.5 w-1.5 rounded-full" />
                    {{ task }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- 步骤导航 -->
          <div class="flex justify-between">
            <Button
              :disabled="currentStep === 1"
              variant="outline"
              @click="prevStep"
            >
              上一步
            </Button>
            <Button
              v-if="currentStep < totalSteps"
              @click="nextStep"
            >
              下一步
            </Button>
            <Button
              v-else
              class="bg-primary"
              @click="startSetup"
            >
              开始配置
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- 重要提示 -->
      <Alert class="mt-6">
        <FileText class="h-4 w-4" />
        <AlertDescription>
          <strong>温馨提示：</strong>
          配置完成后，建议先阅读
          <a href="/docs/quick-start-cloud-sync.md" target="_blank" class="text-blue-500 hover:underline">
            快速开始指南
          </a>
          了解详细的使用方法和注意事项。
        </AlertDescription>
      </Alert>

      <!-- 底部操作 -->
      <div class="flex justify-between border-t pt-4">
        <Button variant="outline" @click="emit('close')">
          稍后配置
        </Button>
        <div class="flex gap-2">
          <Button variant="outline" @click="window.open('/docs/cloud-sync.md', '_blank')">
            查看文档
          </Button>
          <Button @click="startSetup">
            <Cloud class="mr-2 h-4 w-4" />
            立即配置
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
