<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface ProgressProps {
  value?: number
  max?: number
  class?: string
}

const props = withDefaults(defineProps<ProgressProps>(), {
  value: 0,
  max: 100,
})

const percentage = computed(() => {
  return Math.min(Math.max((props.value / props.max) * 100, 0), 100)
})
</script>

<template>
  <div
    :class="cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
      props.class,
    )"
  >
    <div
      class="bg-primary h-full w-full flex-1 transition-all duration-300 ease-in-out"
      :style="{ transform: `translateX(-${100 - percentage}%)` }"
    />
  </div>
</template>
