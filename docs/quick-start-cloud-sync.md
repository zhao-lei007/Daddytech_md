# 云同步快速开始指南

## 🚀 5分钟快速配置

### 第一步：创建 Supabase 项目 (2分钟)

1. **注册账号**

   - 访问 [supabase.com](https://supabase.com)
   - 点击 "Start your project" 注册账号

2. **创建项目**

   - 点击 "New Project"
   - 选择组织（个人账号）
   - 填写项目名称：`md-editor-sync`
   - 设置数据库密码（请记住）
   - 选择地区：`Southeast Asia (Singapore)` 或 `Northeast Asia (Tokyo)`
   - 点击 "Create new project"

3. **等待项目创建**
   - 大约需要2分钟
   - 创建完成后会自动跳转到项目仪表板

### 第二步：获取连接信息 (30秒)

1. **获取 API 信息**
   - 在项目仪表板左侧点击 "Settings"
   - 点击 "API"
   - 复制以下信息：
     - **Project URL**: `https://xxx.supabase.co`
     - **anon public key**: 长字符串，以 `eyJhbGci...` 开头

### 第三步：设置数据库 (1分钟)

1. **打开 SQL 编辑器**

   - 点击左侧 "SQL Editor"
   - 点击 "New query"

2. **执行建表脚本**
   - 复制以下 SQL 代码并粘贴：

```sql
-- 创建同步数据表
CREATE TABLE IF NOT EXISTS md_editor_sync (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('full', 'posts', 'settings')),
    data JSONB NOT NULL,
    encrypted BOOLEAN DEFAULT FALSE,
    version TEXT NOT NULL,
    checksum TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, device_id, data_type)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_md_editor_sync_user_id ON md_editor_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_md_editor_sync_updated_at ON md_editor_sync(updated_at);

-- 启用 RLS（行级安全）
ALTER TABLE md_editor_sync ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略（简化版，适合个人使用）
CREATE POLICY "Allow all access to md_editor_sync" ON md_editor_sync FOR ALL USING (true);
```

3. **执行脚本**
   - 点击 "Run" 按钮
   - 确认显示 "Success. No rows returned"

### 第四步：配置编辑器 (1分钟)

1. **打开云同步设置**

   - 在编辑器中点击 `文件` → `云同步管理`

2. **填写配置信息**

   - 切换到 "配置设置" 标签页
   - 填写以下信息：
     - **项目 URL**: 粘贴第二步获取的 URL
     - **API Key**: 粘贴第二步获取的 anon public key
     - **用户 ID**: 输入您的邮箱或任何唯一标识符
     - **设备名称**: 给当前设备起个名字（如：我的笔记本）

3. **测试连接**

   - 点击 "测试连接" 按钮
   - 确认显示 "连接成功"

4. **启用同步**
   - 点击 "启用同步" 按钮
   - 同步状态变为 "已启用"

### 第五步：开始使用 (30秒)

1. **首次同步**

   - 切换到 "同步状态" 标签页
   - 点击 "上传" 按钮将本地数据上传到云端
   - 确认显示 "同步成功"

2. **设置自动同步（可选）**
   - 在 "配置设置" 中开启 "自动同步"
   - 设置同步间隔（推荐30分钟）

## 🔐 安全设置（推荐）

### 启用数据加密

1. **开启加密**

   - 切换到 "安全设置" 标签页
   - 开启 "启用数据加密"

2. **设置主密码**

   - 点击 "设置主密码"
   - 输入强密码（至少8位，包含大小写字母和数字）
   - 确认密码
   - **重要：请务必记住密码，无法找回！**

3. **重新同步**
   - 返回 "同步状态" 标签页
   - 点击 "上传" 重新上传加密后的数据

## 📱 多设备配置

### 在新设备上配置

1. **重复配置步骤**

   - 在新设备上打开编辑器
   - 使用相同的 Supabase 连接信息
   - 使用相同的用户 ID
   - 设置不同的设备名称

2. **输入主密码**

   - 如果启用了加密，需要输入相同的主密码

3. **下载数据**
   - 点击 "下载" 按钮获取云端数据
   - 确认数据同步成功

## ✅ 验证同步效果

1. **创建测试文章**

   - 在设备 A 上创建一篇新文章
   - 点击 "上传" 同步到云端

2. **在设备 B 验证**

   - 在设备 B 上点击 "下载"
   - 确认新文章出现在文章列表中

3. **测试自动同步**
   - 如果启用了自动同步，等待设定的时间间隔
   - 确认数据自动同步

## 🎉 完成！

现在您已经成功配置了云同步功能，可以在多个设备间无缝使用微信 Markdown 编辑器了！

## 📞 需要帮助？

- 📖 查看 [详细使用指南](./cloud-sync.md)
- 🐛 遇到问题？查看 [故障排除](./cloud-sync.md#故障排除)
- 💡 有建议？欢迎提交 Issue

## 🔗 相关链接

- [Supabase 官网](https://supabase.com)
- [Supabase 文档](https://supabase.com/docs)
- [项目 GitHub](https://github.com/doocs/md)
