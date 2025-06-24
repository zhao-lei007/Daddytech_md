<script setup lang="ts">
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  Lock,
  RefreshCw,
  Unlock,
  WifiOff,
  X,
} from 'lucide-vue-next'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCloudSyncStore } from '@/stores/cloudSync'

const cloudSyncStore = useCloudSyncStore()

// 计算同步状态图标
const syncIcon = computed(() => {
  if (!cloudSyncStore.isEnabled)
    return CloudOff
  if (!cloudSyncStore.isOnline)
    return WifiOff

  switch (cloudSyncStore.syncStatus.status) {
    case `syncing`:
      return RefreshCw
    case `success`:
      return Check
    case `error`:
      return X
    case `conflict`:
      return AlertTriangle
    default:
      return Cloud
  }
})

// 计算状态颜色
const statusColor = computed(() => {
  if (!cloudSyncStore.isEnabled)
    return `text-gray-400`
  if (!cloudSyncStore.isOnline)
    return `text-red-500`

  switch (cloudSyncStore.syncStatus.status) {
    case `syncing`:
      return `text-blue-500`
    case `success`:
      return `text-green-500`
    case `error`:
      return `text-red-500`
    case `conflict`:
      return `text-yellow-500`
    default:
      return `text-gray-500`
  }
})

// 快速同步
async function quickSync() {
  try {
    await cloudSyncStore.syncData(`full`)
  }
  catch (error) {
    console.error(`Quick sync failed:`, error)
  }
}
</script>

<template>
  <div class="flex items-center gap-2 text-sm">
    <!-- 同步状态图标 -->
    <component
      :is="syncIcon"
      class="h-4 w-4" :class="[
        statusColor,
        { 'animate-spin': cloudSyncStore.syncStatus.status === 'syncing' },
      ]"
    />

    <!-- 状态文本 -->
    <span :class="statusColor">
      {{ cloudSyncStore.syncStatusText }}
    </span>

    <!-- 网络状态 -->
    <Badge
      v-if="!cloudSyncStore.isOnline"
      variant="destructive"
      class="text-xs"
    >
      离线
    </Badge>

    <!-- 加密状态 -->
    <component
      :is="cloudSyncStore.config.encryptData ? Lock : Unlock"
      class="text-muted-foreground h-3 w-3"
      :title="cloudSyncStore.config.encryptData ? '数据已加密' : '数据未加密'"
    />

    <!-- 快速同步按钮 -->
    <Button
      v-if="cloudSyncStore.canSync"
      size="sm"
      variant="ghost"
      class="h-6 px-2 text-xs"
      :disabled="cloudSyncStore.syncStatus.status === 'syncing'"
      @click="quickSync"
    >
      <RefreshCw
        class="mr-1 h-3 w-3" :class="[
          { 'animate-spin': cloudSyncStore.syncStatus.status === 'syncing' },
        ]"
      />
      同步
    </Button>
  </div>
</template>
