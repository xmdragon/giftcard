# 数据库中文乱码修复脚本使用说明

## 📋 脚本说明

当强制重构后数据库仍然显示中文乱码时，使用这些专门的修复脚本。

### 1. `fix-db-encoding.sh` - 完整修复脚本
**功能**：完整的数据库乱码修复流程
**特点**：
- ✅ 详细的检查和验证
- ✅ 彩色输出提示
- ✅ API 测试
- ✅ 完整的错误处理

**使用方法**：
```bash
./fix-db-encoding.sh
```

### 2. `fix-db-encoding-simple.sh` - 简化修复脚本
**功能**：快速修复数据库乱码
**特点**：
- ⚡ 执行速度快
- 🔧 专注于核心修复步骤
- 📝 简洁的输出

**使用方法**：
```bash
./fix-db-encoding-simple.sh
```

## 🚀 在远程环境使用

### 上传脚本
```bash
# 上传到远程服务器
scp fix-db-encoding*.sh user@your-server:/path/to/giftcard/
```

### 执行修复
```bash
# SSH 连接到服务器
ssh user@your-server

# 进入项目目录
cd /path/to/giftcard

# 添加执行权限
chmod +x fix-db-encoding*.sh

# 执行修复（推荐使用简化版）
./fix-db-encoding-simple.sh
```

## 🔧 修复原理

### 问题原因
数据库中的中文数据以错误的编码存储，即使字符集配置正确也无法正确显示。

### 修复步骤
1. **删除错误数据**：删除以错误编码存储的分类数据
2. **重新插入数据**：以正确的 UTF-8 编码重新插入中文数据
3. **处理外键约束**：先删除相关的礼品卡数据，再重新插入
4. **验证结果**：检查数据是否正确显示

### 修复的 SQL 操作
```sql
-- 设置正确字符集
SET NAMES utf8mb4;

-- 删除相关数据
DELETE FROM gift_cards WHERE category_id IN (1, 2, 3);
DELETE FROM gift_card_categories WHERE id IN (1, 2, 3);

-- 重新插入正确的中文数据
INSERT INTO gift_card_categories (id, name, description) VALUES 
(1, '新手礼包', '新用户登录奖励礼品卡'),
(2, '签到奖励', '每日签到获得的礼品卡'),
(3, '特殊活动', '特殊活动期间的礼品卡');

-- 重新插入礼品卡数据
INSERT INTO gift_cards (category_id, code, card_type) VALUES 
(1, 'WELCOME001', 'login'),
-- ... 更多数据
```

## ⚠️ 注意事项

### 数据影响
- 会删除现有的分类数据（ID 1, 2, 3）
- 会删除相关的礼品卡数据
- 会重新插入默认的分类和礼品卡数据

### 执行时机
- 在服务完全启动后执行
- 确保数据库连接正常
- 建议在维护时间执行

### 验证修复
执行后检查：
1. 数据库中的中文显示正常
2. API 返回正确的中文
3. 前端页面显示正确

## 🔍 故障排除

### 脚本执行失败
```bash
# 检查服务状态
docker compose ps

# 查看数据库日志
docker compose logs mysql

# 手动连接数据库
docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "USE gift_card_system;"
```

### 修复后仍有问题
1. **浏览器缓存**：强制刷新页面 (Ctrl+F5)
2. **前端编码**：检查 JS 文件是否为 UTF-8
3. **API 响应**：测试 API 是否返回正确中文

### 手动修复
如果脚本失败，可以手动执行：
```bash
# 连接数据库
docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!'

# 在 MySQL 中执行
USE gift_card_system;
SET NAMES utf8mb4;
DELETE FROM gift_cards WHERE category_id IN (1, 2, 3);
DELETE FROM gift_card_categories WHERE id IN (1, 2, 3);
INSERT INTO gift_card_categories (id, name, description) VALUES 
(1, '新手礼包', '新用户登录奖励礼品卡'),
(2, '签到奖励', '每日签到获得的礼品卡'),
(3, '特殊活动', '特殊活动期间的礼品卡');
```

## 📞 技术支持

如果问题仍然存在，请检查：
1. 数据库字符集设置是否正确
2. 应用连接配置是否正确
3. 前端文件编码是否为 UTF-8
4. 浏览器是否正确处理中文 