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
    local domain=$1
    local nginx_conf="nginx.conf"
    local backup_file="nginx.conf.bak.$(date +%Y%m%d%H%M%S)"
    cp "$nginx_conf" "$backup_file"
    log_info "已创建配置文件备份: $backup_file"
    # 批量替换所有server_name行
    sed -i -E "s/server_name[ ]+[^;]+;/server_name $domain;/g" "$nginx_conf"
    log_success "已将所有server_name批量更新为: $domain"
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

check_ssl_cert() {
    local domain=$1
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
    if [[ -z "$1" ]]; then
        read -p "请输入您的域名 (例如: example.com): " DOMAIN
    else
        DOMAIN=$1
    fi
    if ! validate_domain "$DOMAIN"; then exit 1; fi
    update_domain "$DOMAIN"
    add_http_to_https_redirect
    check_ssl_cert_path
    check_ssl_cert "$DOMAIN"
    check_restart_nginx
    show_completion_info "$DOMAIN"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi