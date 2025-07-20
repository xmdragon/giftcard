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

### 4. `fix-encoding.sh` - 中文乱码修复脚本
**功能**：专门解决中文乱码问题，强制重新构建所有镜像
**适用场景**：重置后仍然出现中文乱码的情况

**特点**：
- 🔧 强制重新构建所有镜像
- 🗑️ 清理所有缓存和数据
- ✅ 完整的字符集验证
- 🧪 自动测试中文 API

**使用方法**：
```bash
./fix-encoding.sh
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

## 🔧 中文乱码问题解决

### 问题原因
中文乱码通常由以下原因造成：
1. **Docker 镜像缓存**：旧镜像没有包含最新的字符集配置
2. **数据库编码**：数据以错误编码存储
3. **前端文件编码**：JS 文件不是 UTF-8 编码
4. **浏览器缓存**：浏览器缓存了错误的响应

### 解决步骤
1. **使用专用修复脚本**：
   ```bash
   ./fix-encoding.sh
   ```

2. **手动解决**：
   ```bash
   # 停止服务
   docker compose down
   
   # 删除镜像和数据
   docker rmi $(docker images | grep giftcard | awk '{print $3}')
   docker volume rm giftcard_mysql_data
   
   # 重新构建
   docker compose build --no-cache
   docker compose up -d --force-recreate
   ```

3. **验证修复**：
   ```bash
   # 检查字符集
   docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "SHOW VARIABLES LIKE 'character_set%';"
   
   # 测试中文 API
   curl -k -H "Authorization: Bearer $(curl -k -s -X POST https://localhost/api/auth/admin/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | jq -r '.token')" https://localhost/api/admin/gift-card-categories
   ```

### 预防措施
- 确保所有脚本都使用 `--build --force-recreate` 参数
- 定期清理 Docker 缓存：`docker system prune -f`
- 检查前端文件编码：确保所有 JS 文件都是 UTF-8

## 📞 技术支持

如果遇到问题，请检查：
1. Docker 和 Docker Compose 是否正确安装
2. 端口 80、443、3306 是否被占用
3. 磁盘空间是否充足
4. 网络连接是否正常
5. 文件编码是否为 UTF-8 