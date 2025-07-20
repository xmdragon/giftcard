# 数据库重置脚本使用说明

## 📋 脚本说明

本项目提供了三个数据库重置脚本，适用于不同的使用场景：

### 1. `reset-database.sh` - 完整重置脚本
**功能**：完全重置所有数据，包括数据库、缓存、日志等
**适用场景**：生产环境或需要完全清理的场景

**特点**：
- ✅ 安全确认机制
- ✅ 彩色输出提示
- ✅ 完整的验证流程
- ✅ 详细的错误处理
- ✅ 自动健康检查

**使用方法**：
```bash
./reset-database.sh
```

### 2. `quick-reset.sh` - 快速重置脚本
**功能**：快速重置数据库和 Redis，保留 Nginx 缓存
**适用场景**：开发环境快速重置

**特点**：
- ⚡ 执行速度快
- 🔄 保留 Nginx 缓存
- 📝 简洁的输出

**使用方法**：
```bash
./quick-reset.sh
```

### 3. `reset-db-only.sh` - 仅重置数据库脚本
**功能**：只重置数据库，保留所有其他数据
**适用场景**：只想清理数据库数据的场景

**特点**：
- 🗄️ 只删除数据库数据
- 📊 保留 Redis 数据
- 📝 保留 Nginx 缓存和日志

**使用方法**：
```bash
./reset-db-only.sh
```

## 🚀 在远程环境使用

### 上传脚本到服务器
```bash
# 使用 scp 上传
scp reset-database.sh user@your-server:/path/to/giftcard/
scp quick-reset.sh user@your-server:/path/to/giftcard/
scp reset-db-only.sh user@your-server:/path/to/giftcard/

# 或使用 rsync
rsync -avz *.sh user@your-server:/path/to/giftcard/
```

### 在服务器上执行
```bash
# SSH 连接到服务器
ssh user@your-server

# 进入项目目录
cd /path/to/giftcard

# 给脚本添加执行权限
chmod +x *.sh

# 执行重置脚本
./reset-database.sh
```

## ⚠️ 注意事项

### 数据备份
在执行重置前，建议备份重要数据：
```bash
# 备份数据库
docker compose exec mysql mysqldump -u giftcard_user -p'GiftCard_User_2024!' gift_card_system > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份整个项目
tar -czf giftcard_backup_$(date +%Y%m%d_%H%M%S).tar.gz . --exclude=node_modules
```

### 服务状态检查
重置后检查服务状态：
```bash
# 检查容器状态
docker compose ps

# 查看服务日志
docker compose logs

# 测试 API
curl -k https://localhost/api/health
```

### 默认账号
重置后系统会恢复到初始状态：
- **管理员账号**：admin / admin123
- **访问地址**：https://localhost/admin.html

## 🔧 故障排除

### 脚本执行失败
```bash
# 检查脚本权限
ls -la *.sh

# 手动执行步骤
docker compose down
docker volume ls
docker volume rm giftcard_mysql_data
docker compose up -d
```

### 服务启动失败
```bash
# 查看详细日志
docker compose logs app
docker compose logs mysql

# 检查端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :443
```

### 数据库连接问题
```bash
# 检查数据库状态
docker compose exec mysql mysqladmin ping -h localhost -u giftcard_user -p'GiftCard_User_2024!'

# 查看数据库日志
docker compose logs mysql
```

## 📞 技术支持

如果遇到问题，请检查：
1. Docker 和 Docker Compose 是否正确安装
2. 端口 80、443、3306 是否被占用
3. 磁盘空间是否充足
4. 网络连接是否正常 