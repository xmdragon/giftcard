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
        # 在listen 80;后插入301跳转
        sed -i "/listen 80;/a \\        return 301 https://\$host\$request_uri;" "$nginx_conf"
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
    if [[ -f "ssl/fullchain.pem" && -f "ssl/privkey.pem" ]]; then
      if ! is_cert_expired; then
        log_info "检测到已存在且有效的SSL证书，跳过证书申请"
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
    local tmp_conf="${nginx_conf}.tmp"
    # 生成443 server配置
    local https_block="\n    # HTTPS 服务器\n    server {\n        listen 443 ssl http2;\n        server_name $server_names;\n\n        ssl_certificate /etc/nginx/ssl/fullchain.pem;\n        ssl_certificate_key /etc/nginx/ssl/privkey.pem;\n        ssl_session_timeout 1d;\n        ssl_session_cache off;\n        ssl_session_tickets off;\n\n        ssl_protocols TLSv1.2 TLSv1.3;\n        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;\n        ssl_prefer_server_ciphers off;\n\n        # 其它安全头部、反向代理、静态资源等配置\n        location = /favicon.ico {\n            alias /public/favicon.ico;\n            expires 30d;\n        }\n        location ~* \\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {\n            proxy_pass http://app:3000;\n            proxy_cache STATIC;\n            proxy_cache_valid 200 30d;\n            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;\n            proxy_cache_lock on;\n            expires off;\n            add_header Cache-Control \"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0\";\n            add_header X-Proxy-Cache $upstream_cache_status;\n        }\n        location ~* \\.(css|js)$ {\n            proxy_pass http://app:3000;\n            add_header Cache-Control \"no-cache, no-store, must-revalidate\";\n            add_header Pragma \"no-cache\";\n            add_header Expires \"0\";\n        }\n        location /health {\n            access_log off;\n            proxy_pass http://app:3000/health;\n            proxy_http_version 1.1;\n            proxy_set_header Upgrade $http_upgrade;\n            proxy_set_header Connection 'upgrade';\n            proxy_set_header Host $host;\n            proxy_set_header X-Real-IP $remote_addr;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            proxy_set_header X-Forwarded-Proto $scheme;\n        }\n        location / {\n            proxy_pass http://app:3000;\n            proxy_http_version 1.1;\n            proxy_set_header Upgrade $http_upgrade;\n            proxy_set_header Connection 'upgrade';\n            proxy_set_header Host $host;\n            proxy_set_header X-Real-IP $remote_addr;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            proxy_set_header X-Forwarded-Proto $scheme;\n            proxy_connect_timeout 60s;\n            proxy_send_timeout 60s;\n            proxy_read_timeout 60s;\n            proxy_buffer_size 4k;\n            proxy_buffers 4 32k;\n            proxy_busy_buffers_size 64k;\n            proxy_temp_file_write_size 64k;\n        }\n    }\n"
    awk -v block="$https_block" '
      BEGIN{c=0}
      /http[ ]*{/ {c++; http_start=NR}
      {lines[NR]=$0}
      /}/ {if (c>0) {c--; if (c==0) {http_end=NR}}}
      END{
        for(i=1;i<=http_end-1;i++) print lines[i]
        print block
        for(i=http_end;i<=NR;i++) print lines[i]
      }
    ' "$nginx_conf" > "$tmp_conf" && mv "$tmp_conf" "$nginx_conf"
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