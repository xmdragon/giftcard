#!/bin/bash

# 开发环境 SSL 设置脚本
# 用于生成自签名证书并配置开发环境

set -e

echo "🔧 开发环境 SSL 设置开始..."

# 1. 创建 ssl 目录
echo "📁 创建 ssl 目录..."
mkdir -p ssl

# 2. 检查是否已有证书
if [ -f "ssl/fullchain.pem" ] && [ -f "ssl/privkey.pem" ]; then
    echo "✅ 证书文件已存在，跳过生成步骤"
else
    echo "🔐 生成自签名证书..."
    
    # 生成自签名证书
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/privkey.pem \
        -out ssl/fullchain.pem \
        -subj "/C=CN/ST=State/L=City/O=Development/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1,IP:::1"
    
    echo "✅ 自签名证书生成完成"
fi

# 3. 设置权限
echo "🔒 设置证书文件权限..."
chmod 644 ssl/fullchain.pem ssl/privkey.pem

# 4. 验证证书
echo "🔍 验证证书信息..."
openssl x509 -in ssl/fullchain.pem -text -noout | grep -E "(Subject:|DNS:|IP Address:)"

# 5. 检查 docker-compose.yml 中的端口映射
echo "🐳 检查 Docker Compose 配置..."
if grep -q "443:443" docker-compose.yml; then
    echo "✅ Docker Compose 已配置 443 端口映射"
else
    echo "⚠️  警告: Docker Compose 中缺少 443 端口映射"
    echo "   请确保 nginx 服务包含: - '443:443'"
fi

echo ""
echo "🎉 开发环境 SSL 设置完成！"
echo ""
echo "📋 下一步操作："
echo "1. 启动服务: docker compose up -d"
echo "2. 访问: https://localhost"
echo "3. 浏览器会显示证书警告，点击'高级' -> '继续访问'"
echo ""
echo "💡 提示: 这是自签名证书，浏览器会显示安全警告，这是正常的开发环境行为" 