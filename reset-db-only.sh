#!/bin/bash

# 仅重置数据库脚本
# 保留 Nginx 缓存和日志

echo "🗄️ 重置数据库..."

# 停止服务
echo "停止服务..."
docker compose down

# 只删除 MySQL 数据卷
echo "删除 MySQL 数据卷..."
docker volume rm giftcard_mysql_data 2>/dev/null || echo "MySQL 数据卷已删除"

# 重新启动
echo "重新启动服务..."
docker compose up -d

echo "✅ 数据库重置完成！"
echo "Nginx 缓存和日志已保留"
echo "等待 30 秒后服务将完全启动..." 