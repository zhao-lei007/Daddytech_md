<script setup lang="ts">
import { Cloud, Download, FileCode, FileCog, Settings, Upload } from 'lucide-vue-next'
import { useStore } from '@/stores'

const store = useStore()

const {
  isDark,
  isEditOnLeft,
} = storeToRefs(store)

const {
  exportEditorContent2HTML,
  exportEditorContent2MD,
  importMarkdownContent,
  downloadAsCardImage,
  exportAllData,
  importAllData,
} = store

const editorStateDialogVisible = ref(false)
const cloudSyncDialogVisible = ref(false)
const cloudSyncDemoVisible = ref(false)
</script>

<template>
  <MenubarMenu>
    <MenubarTrigger>
      文件
    </MenubarTrigger>
    <MenubarContent align="start">
      <MenubarItem @click="importMarkdownContent()">
        <Upload class="mr-2 size-4" />
        导入 .md
      </MenubarItem>
      <MenubarItem @click="exportEditorContent2MD()">
        <Download class="mr-2 size-4" />
        导出 .md
      </MenubarItem>
      <MenubarItem @click="exportEditorContent2HTML()">
        <FileCode class="mr-2 size-4" />
        导出 .html
      </MenubarItem>
      <MenubarItem @click="downloadAsCardImage()">
        <Download class="mr-2 size-4" />
        导出 .png
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem @click="exportAllData()">
        <Download class="mr-2 size-4" />
        导出所有数据
      </MenubarItem>
      <MenubarItem @click="importAllData()">
        <Upload class="mr-2 size-4" />
        导入所有数据
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem @click="cloudSyncDemoVisible = true">
        <Cloud class="mr-2 size-4" />
        云同步功能
      </MenubarItem>
      <MenubarItem @click="cloudSyncDialogVisible = true">
        <Settings class="mr-2 size-4" />
        云同步管理
      </MenubarItem>
      <MenubarItem @click="editorStateDialogVisible = true">
        <FileCog class="mr-2 size-4" />
        导入/导出项目配置
      </MenubarItem>
      <MenubarSeparator />
      <MenubarCheckboxItem v-model:checked="isDark">
        深色模式
      </MenubarCheckboxItem>
      <MenubarSeparator />
      <MenubarCheckboxItem v-model:checked="isEditOnLeft">
        左侧编辑
      </MenubarCheckboxItem>
    </MenubarContent>
  </MenubarMenu>

  <!-- 各弹窗挂载 -->
  <EditorStateDialog :visible="editorStateDialogVisible" @close="editorStateDialogVisible = false" />
  <CloudSyncDialog :visible="cloudSyncDialogVisible" @close="cloudSyncDialogVisible = false" />
  <CloudSyncDemo
    :visible="cloudSyncDemoVisible"
    @close="cloudSyncDemoVisible = false"
    @open-cloud-sync="() => { cloudSyncDemoVisible = false; cloudSyncDialogVisible = true }"
  />
</template>
