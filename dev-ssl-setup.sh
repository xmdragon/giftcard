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
    
    # 检查是否已经存在HTTPS配置
    if grep -q "listen 443 ssl" "$nginx_conf"; then
        echo "✅ HTTPS 配置已存在，跳过添加"
        return
    fi
    
    # 创建临时文件
    local temp_file=$(mktemp)
    
    # 使用awk在http块的结束大括号前插入HTTPS配置
    awk '
    BEGIN { 
        https_added = 0
        in_http_block = 0
        brace_count = 0
    }
    /^http[[:space:]]*{/ {
        in_http_block = 1
        brace_count = 1
        print
        next
    }
    in_http_block && /{/ {
        brace_count++
        print
        next
    }
    in_http_block && /}/ {
        brace_count--
        if (brace_count == 0 && !https_added) {
            print "    # HTTPS 服务器"
            print "    server {"
            print "        listen 443 ssl;"
            print "        http2 on;"
            print "        server_name localhost;"
            print ""
            print "        ssl_certificate /etc/nginx/ssl/fullchain.pem;"
            print "        ssl_certificate_key /etc/nginx/ssl/privkey.pem;"
            print "        ssl_session_timeout 1d;"
            print "        ssl_session_cache off;"
            print "        ssl_session_tickets off;"
            print ""
            print "        ssl_protocols TLSv1.2 TLSv1.3;"
            print "        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;"
            print "        ssl_prefer_server_ciphers off;"
            print ""
            print "        # 其它安全头部、反向代理、静态资源等配置"
            print "        location = /favicon.ico {"
            print "            alias /public/favicon.ico;"
            print "            expires 30d;"
            print "        }"
            print "        location ~* \\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {"
            print "            proxy_pass http://app:3000;"
            print "            proxy_cache STATIC;"
            print "            proxy_cache_valid 200 30d;"
            print "            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;"
            print "            proxy_cache_lock on;"
            print "            expires off;"
            print "            add_header Cache-Control \"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0\";"
            print "            add_header X-Proxy-Cache $upstream_cache_status;"
            print "        }"
            print "        location ~* \\.(css|js)$ {"
            print "            proxy_pass http://app:3000;"
            print "            add_header Cache-Control \"no-cache, no-store, must-revalidate\";"
            print "            add_header Pragma \"no-cache\";"
            print "            add_header Expires \"0\";"
            print "        }"
            print "        location /health {"
            print "            access_log off;"
            print "            proxy_pass http://app:3000/health;"
            print "            proxy_http_version 1.1;"
            print "            proxy_set_header Upgrade $http_upgrade;"
            print "            proxy_set_header Connection \"upgrade\";"
            print "            proxy_set_header Host $host;"
            print "            proxy_set_header X-Real-IP $remote_addr;"
            print "            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"
            print "            proxy_set_header X-Forwarded-Proto $scheme;"
            print "        }"
            print "        location / {"
            print "            proxy_pass http://app:3000;"
            print "            proxy_http_version 1.1;"
            print "            proxy_set_header Upgrade $http_upgrade;"
            print "            proxy_set_header Connection \"upgrade\";"
            print "            proxy_set_header Host $host;"
            print "            proxy_set_header X-Real-IP $remote_addr;"
            print "            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"
            print "            proxy_set_header X-Forwarded-Proto $scheme;"
            print "            proxy_connect_timeout 60s;"
            print "            proxy_send_timeout 60s;"
            print "            proxy_read_timeout 60s;"
            print "            proxy_buffer_size 4k;"
            print "            proxy_buffers 4 32k;"
            print "            proxy_busy_buffers_size 64k;"
            print "            proxy_temp_file_write_size 64k;"
            print "        }"
            print "    }"
            https_added = 1
            in_http_block = 0
        }
        print
        next
    }
    { print }
    ' "$nginx_conf" > "$temp_file"
    
    # 替换原文件
    mv "$temp_file" "$nginx_conf"
    
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