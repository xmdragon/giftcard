#!/bin/bash

# 快速数据库重置脚本
# 适用于开发环境快速重置

echo "🔄 快速重置数据库..."

# 停止服务
echo "停止服务..."
docker compose down

# 删除数据卷
echo "删除数据卷..."
docker volume rm giftcard_mysql_data 2>/dev/null || echo "MySQL 数据卷已删除"
docker volume rm giftcard_redis_data 2>/dev/null || echo "Redis 数据卷已删除"

# 重新启动
echo "重新启动服务..."
docker compose up -d --build --force-recreate

echo "✅ 数据库重置完成！"
echo "等待 30 秒后服务将完全启动..."
echo "默认管理员: admin / admin123" 