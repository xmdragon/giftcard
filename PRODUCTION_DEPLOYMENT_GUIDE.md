# 生产环境语言设置部署指南

## 概述

本指南用于在生产服务器上部署语言设置功能。该功能允许管理员通过系统设置控制会员端显示的语言版本。

## 部署步骤

### 1. 准备部署脚本

确保 `add-language-setting.sh` 脚本在服务器上可用：

```bash
# 给脚本添加执行权限
chmod +x add-language-setting.sh
```

### 2. 执行数据库更新

运行脚本添加语言设置项：

```bash
./add-language-setting.sh
```

脚本会自动检测环境并执行相应的操作：
- 在Docker环境中：使用Docker命令连接MySQL容器
- 在本地环境中：使用本地MySQL客户端

### 3. 验证部署结果

脚本执行完成后，会显示：
- ✅ 语言设置添加成功！ 或
- ⚠️ 设置项已存在，跳过添加

### 4. 重启应用服务器

```bash
# 如果使用Docker
docker compose restart app

# 如果使用PM2
pm2 restart gift-card-system

# 如果使用systemd
sudo systemctl restart gift-card-system
```

### 5. 验证功能

1. **登录管理员后台**
   - 访问管理员登录页面
   - 进入"系统设置"页面
   - 检查是否显示 `default_language` 设置项

2. **测试语言设置**
   - 将语言设置为"中文"
   - 访问会员端首页
   - 检查页面源代码中的 `recommendLang` 值

## 脚本功能说明

### 自动检测环境
- 检测Docker环境或本地MySQL环境
- 自动选择合适的连接方式

### 字符集处理
- 自动设置 `SET NAMES utf8mb4` 确保中文正确显示
- 避免数据库字符集导致的中文乱码问题
- 兼容各种数据库环境

### 安全检查
- 检查设置项是否已存在
- 避免重复添加导致错误

### 详细输出
- 显示数据库配置信息
- 显示操作结果
- 提供后续操作指导

## 环境变量配置

可以通过环境变量自定义数据库连接：

```bash
export DB_HOST="your-db-host"
export DB_USER="your-db-user"
export DB_PASSWORD="your-db-password"
export DB_NAME="your-db-name"

./add-language-setting.sh
```

## 故障排除

### 常见问题

1. **MySQL容器未运行**
   ```bash
   # 启动Docker容器
   docker compose up -d
   ```

2. **数据库连接失败**
   - 检查数据库配置
   - 确认网络连接
   - 验证用户权限

3. **权限不足**
   ```bash
   # 确保脚本有执行权限
   chmod +x add-language-setting.sh
   ```

### 手动验证

如果脚本执行失败，可以手动验证：

```bash
# 检查设置项是否存在
docker exec -it gift_card_mysql mysql -ugiftcard_user -p'GiftCard_User_2024!' gift_card_system -e "SET NAMES utf8mb4; SELECT * FROM system_settings WHERE setting_key = 'default_language';"

# 手动添加设置项（如果不存在）
docker exec -it gift_card_mysql mysql -ugiftcard_user -p'GiftCard_User_2024!' gift_card_system -e "SET NAMES utf8mb4; INSERT INTO system_settings (setting_key, setting_value, description) VALUES ('default_language', 'auto', '默认语言设置（auto=自动检测，zh=中文，en=英文，ja=日文，ko=韩文）');"
```

## 功能验证清单

- [ ] 脚本执行成功
- [ ] 数据库设置项已添加
- [ ] 应用服务器已重启
- [ ] 管理员后台显示语言设置
- [ ] 会员端正确显示设置的语言
- [ ] 语言切换功能正常

## 回滚方案

如果需要回滚，可以删除设置项：

```bash
docker exec -it gift_card_mysql mysql -ugiftcard_user -p'GiftCard_User_2024!' gift_card_system -e "SET NAMES utf8mb4; DELETE FROM system_settings WHERE setting_key = 'default_language';"
```

## 联系支持

如果遇到问题，请检查：
1. 服务器日志
2. 数据库连接状态
3. 应用服务器状态
4. 网络连接

---

**注意**：部署前请确保已备份数据库，以防意外情况发生。 