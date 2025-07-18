#!/bin/bash

# 礼品卡发放系统本地开发启动脚本
echo "🎁 礼品卡发放系统本地开发启动脚本"
echo "================================"

# 检查并停止之前运行的Node.js进程
echo "🔍 检查之前运行的实例..."
NODE_PID=$(lsof -i:3000 -t 2>/dev/null)
if [ ! -z "$NODE_PID" ]; then
    echo "🛑 发现端口3000上运行的进程 (PID: $NODE_PID)，正在停止..."
    kill -15 $NODE_PID 2>/dev/null || kill -9 $NODE_PID 2>/dev/null
    sleep 2
    echo "✅ 已停止之前的实例"
else
    echo "✅ 未发现之前运行的实例"
fi

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    echo "安装指南: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查Docker Compose是否可用
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose未安装或版本过低"
    echo "请确保使用Docker Desktop或安装最新版本的Docker Compose"
    exit 1
fi

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    echo "安装指南: https://nodejs.org/"
    exit 1
fi

# 创建本地环境配置文件（如果不存在）
if [ ! -f .env.local ]; then
    echo "📝 创建本地环境配置文件..."
    cp .env.example .env.local
    echo "✅ 已创建 .env.local 文件，请根据需要修改配置"
fi

# 复制本地环境配置到.env文件
echo "📝 复制本地环境配置到.env文件..."
cp .env.local .env

# 检查并重启MySQL容器
echo "🔍 检查MySQL容器状态..."
if docker ps -q --filter "name=gift_card_mysql" | grep -q .; then
    echo "🔄 MySQL容器已存在，正在重启..."
    docker restart gift_card_mysql
else
    echo "🚀 启动MySQL容器..."
    docker compose up -d mysql
fi

# 等待MySQL启动
echo "⏳ 等待MySQL启动..."
sleep 5

# 检查MySQL连接
echo "📊 检查MySQL连接..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec gift_card_mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "SELECT 1;" &> /dev/null; then
        echo "✅ MySQL连接成功"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT+1))
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            echo "❌ 无法连接到MySQL，请检查配置"
            exit 1
        fi
        echo "⏳ 尝试 $RETRY_COUNT/$MAX_RETRIES - 等待MySQL启动..."
        sleep 3
    fi
done

# 安装依赖
echo "📦 安装依赖..."
npm install

# 启动应用
echo "🚀 启动应用..."
echo "================================"
npm start