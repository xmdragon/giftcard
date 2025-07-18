#!/bin/bash

# 礼品卡发放系统本地开发启动脚本
echo "🎁 礼品卡发放系统本地开发启动脚本"
echo "================================"

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

# 启动MySQL容器
echo "🚀 启动MySQL容器..."
docker compose up -d mysql

# 等待MySQL启动
echo "⏳ 等待MySQL启动..."
sleep 5

# 检查MySQL连接
echo "📊 检查MySQL连接..."
if ! docker exec gift_card_mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "SELECT 1;" &> /dev/null; then
    echo "❌ 无法连接到MySQL，请检查配置"
    exit 1
fi

echo "✅ MySQL连接成功"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 启动应用
echo "🚀 启动应用..."
echo "================================"
npm start