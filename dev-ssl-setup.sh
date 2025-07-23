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

# 6. 自动插入443 server配置到nginx.conf
add_https_server_block() {
    local nginx_conf="nginx.conf"
    local server_names="localhost"
    local tmp_conf="${nginx_conf}.tmp"
    local https_block="\n    # HTTPS 服务器\n    server {\n        listen 443 ssl http2;\n        server_name $server_names;\n\n        ssl_certificate /etc/nginx/ssl/fullchain.pem;\n        ssl_certificate_key /etc/nginx/ssl/privkey.pem;\n        ssl_session_timeout 1d;\n        ssl_session_cache off;\n        ssl_session_tickets off;\n\n        ssl_protocols TLSv1.2 TLSv1.3;\n        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;\n        ssl_prefer_server_ciphers off;\n\n        # 其它安全头部、反向代理、静态资源等配置\n        location = /favicon.ico {\n            alias /public/favicon.ico;\n            expires 30d;\n        }\n        location ~* \\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {\n            proxy_pass http://app:3000;\n            proxy_cache STATIC;\n            proxy_cache_valid 200 30d;\n            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;\n            proxy_cache_lock on;\n            expires off;\n            add_header Cache-Control \"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0\";\n            add_header X-Proxy-Cache $upstream_cache_status;\n        }\n        location ~* \\.(css|js)$ {\n            proxy_pass http://app:3000;\n            add_header Cache-Control \"no-cache, no-store, must-revalidate\";\n            add_header Pragma \"no-cache\";\n            add_header Expires \"0\";\n        }\n        location /health {\n            access_log off;\n            proxy_pass http://app:3000/health;\n            proxy_http_version 1.1;\n            proxy_set_header Upgrade $http_upgrade;\n            proxy_set_header Connection 'upgrade';\n            proxy_set_header Host $host;\n            proxy_set_header X-Real-IP $remote_addr;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            proxy_set_header X-Forwarded-Proto $scheme;\n        }\n        location / {\n            proxy_pass http://app:3000;\n            proxy_http_version 1.1;\n            proxy_set_header Upgrade $http_upgrade;\n            proxy_set_header Connection 'upgrade';\n            proxy_set_header Host $host;\n            proxy_set_header X-Real-IP $remote_addr;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            proxy_set_header X-Forwarded-Proto $scheme;\n            proxy_connect_timeout 60s;\n            proxy_send_timeout 60s;\n            proxy_read_timeout 60s;\n            proxy_buffer_size 4k;\n            proxy_buffers 4 32k;\n            proxy_busy_buffers_size 64k;\n            proxy_temp_file_write_size 64k;\n        }\n    }\n"
    awk -v block="$https_block" 'BEGIN{c=0} /http[ ]*{/ {c++} /}/ {if (c>0) {c--; if (c==0) {print block}}} {print}' "$nginx_conf" > "$tmp_conf" && mv "$tmp_conf" "$nginx_conf"
    echo "✅ 已自动插入HTTPS 443端口server配置到nginx.conf的http{}内部"
}

# 证书生成后插入443 server配置
add_https_server_block

echo ""
echo "🎉 开发环境 SSL 设置完成！"
echo ""
echo "📋 下一步操作："
echo "1. 启动服务: docker compose up -d"
echo "2. 访问: https://localhost"
echo "3. 浏览器会显示证书警告，点击'高级' -> '继续访问'"
echo ""
echo "💡 提示: 这是自签名证书，浏览器会显示安全警告，这是正常的开发环境行为" 