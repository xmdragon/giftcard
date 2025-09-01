#!/bin/bash
# Docker 清理脚本 - 定期运行以防止磁盘空间耗尽

echo "=== Docker 清理开始 ==="
echo "清理前磁盘使用情况："
df -h /

# 1. 清理停止的容器
echo "清理停止的容器..."
docker container prune -f

# 2. 清理未使用的镜像（保留正在使用的）
echo "清理未使用的镜像..."
docker image prune -a -f

# 3. 清理未使用的网络
echo "清理未使用的网络..."
docker network prune -f

# 4. 清理未使用的卷（谨慎使用，会删除数据）
# docker volume prune -f

# 5. 清理构建缓存
echo "清理构建缓存..."
docker builder prune -f

# 6. 显示清理后的状态
echo ""
echo "清理后磁盘使用情况："
df -h /
echo ""
echo "Docker 空间使用情况："
docker system df

echo "=== 清理完成 ==="