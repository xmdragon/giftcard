#!/bin/bash

# 增强版：支持多server_name批量替换、自动加HTTP跳转、全自动模式
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_nginx_conf() {
    if [[ ! -f "nginx.conf" ]]; then log_error "nginx.conf 文件不存在！"; return 1; fi
    log_info "找到 nginx.conf 文件"; return 0;
}

validate_domain() {
    local domain=$1
    if [[ ! $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        log_error "无效的域名格式: $domain"; return 1; fi
    log_success "域名格式有效: $domain"; return 0;
}

update_domain() {
    local domains="$@"
    local nginx_conf="nginx.conf"
    local backup_file="nginx.conf.bak.$(date +%Y%m%d%H%M%S)"
    cp "$nginx_conf" "$backup_file"
    log_info "已创建配置文件备份: $backup_file"
    # 批量替换所有server_name行，支持多个域名
    sed -i -E "s/server_name[ ]+[^;]+;/server_name $domains;/g" "$nginx_conf"
    log_success "已将所有server_name批量更新为: $domains"
}

add_http_to_https_redirect() {
    local nginx_conf="nginx.conf"
    # 检查HTTP server块是否有return 301
    if grep -A 10 'listen 80' "$nginx_conf" | grep -q 'return 301'; then
        log_info "HTTP server块已包含301跳转，无需添加"
    else
        # 使用awk在listen 80;后插入301跳转
        local temp_file=$(mktemp)
        awk '
        /listen 80;/ {
            print
            print "        return 301 https://$host$request_uri;"
            next
        }
        { print }
        ' "$nginx_conf" > "$temp_file"
        mv "$temp_file" "$nginx_conf"
        log_success "已为HTTP server块添加301跳转到HTTPS"
    fi
}

check_ssl_cert_path() {
    local nginx_conf="nginx.conf"
    log_info "检测nginx.conf中的SSL证书路径："
    grep -E 'ssl_certificate(_key)?' "$nginx_conf" || log_warning "未检测到SSL证书路径，请手动检查！"
}

check_restart_nginx() {
    if command -v docker &> /dev/null; then
        if docker compose ps | grep -q "gift_card_nginx"; then
            log_info "检测到 Docker 环境中的 Nginx 容器"
            if [[ "$AUTO_MODE" == "1" ]]; then
                log_info "全自动模式：自动重启Nginx容器..."
                docker compose restart nginx
                log_success "Nginx 容器已重启"
            else
                read -p "是否要重启 Nginx 容器以应用更改？(y/N): " -n 1 -r; echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    log_info "重启 Nginx 容器..."
                    docker compose restart nginx
                    log_success "Nginx 容器已重启"
                else
                    log_info "跳过重启 Nginx 容器"
                    log_warning "请记得稍后手动重启 Nginx 以应用更改: docker compose restart nginx"
                fi
            fi
        else
            log_warning "未检测到 Docker 环境中的 Nginx 容器"
            log_info "请手动重启 Nginx 以应用更改"
        fi
    else
        log_warning "未检测到 Docker 命令"
        log_info "请手动重启 Nginx 以应用更改"
    fi
}

is_cert_expired() {
  local cert_file="ssl/fullchain.pem"
  if [[ ! -f "$cert_file" ]]; then
    return 0 # 视为已过期
  fi
  local end_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
  local end_ts=$(date -d "$end_date" +%s)
  local now_ts=$(date +%s)
  local days_left=$(( (end_ts - now_ts) / 86400 ))
  if (( days_left < 7 )); then
    log_warning "SSL证书即将过期（剩余 $days_left 天），将自动申请新证书"
    return 0
  else
    log_info "SSL证书有效，剩余 $days_left 天，跳过证书申请"
    return 1
  fi
}

check_ssl_cert() {
    local domain=$1
    local nginx_conf="nginx.conf"
    
    # 检查nginx.conf中是否有443配置
    local has_https_config=false
    if grep -q "listen 443 ssl" "$nginx_conf"; then
        has_https_config=true
    fi
    
    if [[ -f "ssl/fullchain.pem" && -f "ssl/privkey.pem" ]]; then
      if ! is_cert_expired; then
        if [[ "$has_https_config" == "true" ]]; then
            log_info "检测到已存在且有效的SSL证书和HTTPS配置，跳过证书申请"
        else
            log_info "检测到已存在且有效的SSL证书，但nginx.conf缺少HTTPS配置，跳过证书申请"
        fi
        return 0
      fi
    fi
    if [[ -f "get-ssl-cert.sh" ]]; then
        log_info "检测到 SSL 证书申请脚本"
        if [[ "$AUTO_MODE" == "1" ]]; then
            log_info "全自动模式：自动为 $domain 申请SSL证书（无邮箱）..."
            bash ./get-ssl-cert.sh "$domain"
        else
            read -p "是否要为新域名 $domain 申请 SSL 证书？(y/N): " -n 1 -r; echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log_info "请输入您的邮箱地址（用于 Let's Encrypt 通知）:"
                read -r email
                if [[ -z "$email" ]]; then
                    log_warning "未提供邮箱地址，将使用无邮箱模式申请证书"
                    bash ./get-ssl-cert.sh "$domain"
                else
                    bash ./get-ssl-cert.sh "$domain" "$email"
                fi
            else
                log_info "跳过 SSL 证书申请"
                log_warning "请确保已有有效的 SSL 证书，或稍后手动申请: ./get-ssl-cert.sh $domain your-email@example.com"
            fi
        fi
    else
        log_warning "未检测到 SSL 证书申请脚本"
        log_info "请确保已有有效的 SSL 证书，或使用其他方式申请"
    fi
}

show_completion_info() {
    local domain=$1
    echo ""
    log_success "=== 域名更新完成 ==="
    echo ""
    log_info "您的网站现在配置为使用以下域名:"
    echo "• HTTP: http://$domain (将自动重定向到 HTTPS)"
    echo "• HTTPS: https://$domain"
    echo ""
    log_info "后续步骤:"
    echo "1. 确保您的域名 DNS 记录已正确设置，指向此服务器 IP"
    echo "2. 确保服务器防火墙已开放 80 和 443 端口"
    echo "3. 如果您更新了 SSL 证书，请确保证书文件权限正确"
    echo ""
    log_info "如需手动重启 Nginx，请运行:"
    echo "docker compose restart nginx"
    echo ""
}

fix_ssl_permissions() {
  if [[ -f "ssl/fullchain.pem" && -f "ssl/privkey.pem" ]]; then
    chmod 644 ssl/fullchain.pem ssl/privkey.pem
    log_success "已自动修正证书文件权限"
  fi
}

fix_docker_compose_ssl_mount() {
  if [[ -f "docker-compose.yml" ]]; then
    if ! grep -q './ssl:/etc/nginx/ssl:ro' docker-compose.yml; then
      # 在nginx服务的volumes下插入ssl挂载
      awk '/nginx:/ {print; in_nginx=1; next} in_nginx && /volumes:/ {print; print "      - ./ssl:/etc/nginx/ssl:ro"; in_nginx=0; next} 1' docker-compose.yml > docker-compose.yml.tmp && mv docker-compose.yml.tmp docker-compose.yml
      log_success "已自动为nginx服务添加ssl挂载"
    fi
  fi
}

add_https_server_block() {
    local domains="$@"
    local nginx_conf="nginx.conf"
    local server_names="$domains"
    
    # 检查是否已经存在HTTPS配置
    if grep -q "listen 443 ssl" "$nginx_conf"; then
        log_info "HTTPS 443配置已存在，跳过添加"
        return
    fi
    
    # 检查是否有SSL证书文件
    if [[ ! -f "ssl/fullchain.pem" || ! -f "ssl/privkey.pem" ]]; then
        log_warning "SSL证书文件不存在，但仍将添加HTTPS配置。请确保稍后申请证书。"
    else
        log_info "检测到SSL证书文件，添加HTTPS 443配置"
    fi
    
    # 创建临时文件
    local temp_file=$(mktemp)
    
    # 使用awk在http块的结束大括号前插入HTTPS配置
    awk -v domains="$domains" '
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
            print "        server_name " domains ";"
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
            print "        location ~* ^/public/(.*\\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot))$ {"
            print "            alias /public/$1;"
            print "            expires 30d;"
            print "            access_log off;"
            print "        }"
            print "        # Socket.IO 路径优先处理"
            print "        location ~ ^/socket\\.io/ {"
            print "            proxy_pass http://app:3000;"
            print "            proxy_http_version 1.1;"
            print "            proxy_set_header Upgrade $http_upgrade;"
            print "            proxy_set_header Connection \"upgrade\";"
            print "            proxy_set_header Host $host;"
            print "            proxy_set_header X-Real-IP $remote_addr;"
            print "            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"
            print "            proxy_set_header X-Forwarded-Proto $scheme;"
            print "        }"
            print "        # CSS 和 JS 静态文件"
            print "        location ~* \\.(css|js)$ {"
            print "            alias /public$uri;"
            print "            expires 7d;"
            print "            access_log off;"
            print "            add_header Cache-Control \"public, immutable\";"
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
    
    log_success "已自动插入HTTPS 443端口server配置到nginx.conf的http{}内部"
}

main() {
    echo ""
    log_info "=== 礼品卡系统 - 域名更新脚本（增强版） ==="
    echo ""
    AUTO_MODE=0
    if [[ "$1" == "--auto" ]]; then
        AUTO_MODE=1
        shift
    fi
    if ! check_nginx_conf; then exit 1; fi
    if [[ $# -eq 0 ]]; then
        read -p "请输入您的域名（可用空格分隔多个域名）: " DOMAIN_INPUT
        read -a DOMAINS <<< "$DOMAIN_INPUT"
    else
        DOMAINS=("$@")
    fi
    for d in "${DOMAINS[@]}"; do
        if ! validate_domain "$d"; then exit 1; fi
    done
    update_domain "${DOMAINS[@]}"
    add_http_to_https_redirect
    check_ssl_cert_path
    check_ssl_cert "${DOMAINS[0]}"
    fix_ssl_permissions
    add_https_server_block "${DOMAINS[@]}"
    fix_docker_compose_ssl_mount
    check_restart_nginx
    show_completion_info "${DOMAINS[0]}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi