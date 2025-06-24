-- 微信 Markdown 编辑器云同步数据库表结构
-- 在 Supabase SQL 编辑器中执行此脚本

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
    
    -- 创建唯一约束，确保每个用户每个设备每种数据类型只有一条记录
    UNIQUE(user_id, device_id, data_type)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_md_editor_sync_user_id ON md_editor_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_md_editor_sync_device_id ON md_editor_sync(device_id);
CREATE INDEX IF NOT EXISTS idx_md_editor_sync_updated_at ON md_editor_sync(updated_at);
CREATE INDEX IF NOT EXISTS idx_md_editor_sync_user_device ON md_editor_sync(user_id, device_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器，自动更新 updated_at 字段
DROP TRIGGER IF EXISTS update_md_editor_sync_updated_at ON md_editor_sync;
CREATE TRIGGER update_md_editor_sync_updated_at
    BEFORE UPDATE ON md_editor_sync
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 RLS (Row Level Security) 策略
ALTER TABLE md_editor_sync ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own sync data" ON md_editor_sync;
DROP POLICY IF EXISTS "Users can insert their own sync data" ON md_editor_sync;
DROP POLICY IF EXISTS "Users can update their own sync data" ON md_editor_sync;
DROP POLICY IF EXISTS "Users can delete their own sync data" ON md_editor_sync;

-- 创建 RLS 策略：用户只能访问自己的数据
CREATE POLICY "Users can view their own sync data" ON md_editor_sync
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own sync data" ON md_editor_sync
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own sync data" ON md_editor_sync
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own sync data" ON md_editor_sync
    FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- 注意：如果不使用 Supabase Auth，可以使用以下简化的策略
-- 这些策略允许任何人访问数据，但在生产环境中不推荐使用

-- 创建简化的 RLS 策略（仅用于开发/测试）
-- 取消注释以下行以使用简化策略：

/*
DROP POLICY IF EXISTS "Allow all access to md_editor_sync" ON md_editor_sync;
CREATE POLICY "Allow all access to md_editor_sync" ON md_editor_sync
    FOR ALL USING (true);
*/

-- 创建设备信息视图（可选）
CREATE OR REPLACE VIEW md_editor_devices AS
SELECT 
    user_id,
    device_id,
    device_name,
    MAX(updated_at) as last_sync,
    COUNT(*) as sync_count,
    ARRAY_AGG(DISTINCT data_type) as data_types
FROM md_editor_sync
GROUP BY user_id, device_id, device_name
ORDER BY last_sync DESC;

-- 创建数据统计视图（可选）
CREATE OR REPLACE VIEW md_editor_sync_stats AS
SELECT 
    user_id,
    COUNT(DISTINCT device_id) as device_count,
    COUNT(*) as total_syncs,
    MAX(updated_at) as last_sync,
    MIN(created_at) as first_sync,
    SUM(CASE WHEN encrypted THEN 1 ELSE 0 END) as encrypted_count
FROM md_editor_sync
GROUP BY user_id;

-- 创建清理旧数据的函数
CREATE OR REPLACE FUNCTION cleanup_old_sync_data(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM md_editor_sync 
    WHERE updated_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建数据备份函数
CREATE OR REPLACE FUNCTION backup_user_data(target_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    backup_data JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'device_id', device_id,
            'device_name', device_name,
            'data_type', data_type,
            'data', data,
            'encrypted', encrypted,
            'version', version,
            'checksum', checksum,
            'created_at', created_at,
            'updated_at', updated_at,
            'last_sync_at', last_sync_at
        )
    ) INTO backup_data
    FROM md_editor_sync
    WHERE user_id = target_user_id;
    
    RETURN backup_data;
END;
$$ LANGUAGE plpgsql;

-- 插入示例数据（可选，用于测试）
/*
INSERT INTO md_editor_sync (
    user_id, 
    device_id, 
    device_name, 
    data_type, 
    data, 
    version, 
    checksum
) VALUES (
    'test_user_001',
    'device_001',
    'Test Device',
    'full',
    '{"posts": [], "settings": {}}',
    '2.0.3',
    'test_checksum'
) ON CONFLICT (user_id, device_id, data_type) 
DO UPDATE SET 
    data = EXCLUDED.data,
    checksum = EXCLUDED.checksum,
    updated_at = NOW();
*/

-- 显示表结构信息
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'md_editor_sync'
ORDER BY ordinal_position;
