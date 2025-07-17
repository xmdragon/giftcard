#!/bin/bash

# 礼品卡系统 - 域名更新脚本
# 此脚本用于更新 nginx.conf 中的域名配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 nginx.conf 文件是否存在
check_nginx_conf() {
    if [[ ! -f "nginx.conf" ]]; then
        log_error "nginx.conf 文件不存在！"
        return 1
    fi
    
    log_info "找到 nginx.conf 文件"
    return 0
}

# 验证域名格式
validate_domain() {
    local domain=$1
    
    # 简单的域名格式验证
    if [[ ! $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        log_error "无效的域名格式: $domain"
        return 1
    fi
    
    log_success "域名格式有效: $domain"
    return 0
}

# 更新 nginx.conf 中的域名
update_domain() {
    local domain=$1
    local nginx_conf="nginx.conf"
    local backup_file="nginx.conf.bak.$(date +%Y%m%d%H%M%S)"
    
    # 创建备份
    cp "$nginx_conf" "$backup_file"
    log_info "已创建配置文件备份: $backup_file"
    
    # 更新 HTTP 服务器的 server_name
    sed -i "s/server_name localhost;/server_name $domain;/g" "$nginx_conf"
    
    # 更新 HTTPS 服务器的 server_name
    sed -i "s/server_name localhost;/server_name $domain;/g" "$nginx_conf"
    
    log_success "已将域名更新为: $domain"
}

# 检查是否需要重启 Nginx
check_restart_nginx() {
    if command -v docker &> /dev/null; then
        if docker compose ps | grep -q "gift_card_nginx"; then
            log_info "检测到 Docker 环境中的 Nginx 容器"
            
            read -p "是否要重启 Nginx 容器以应用更改？(y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log_info "重启 Nginx 容器..."
                docker compose restart nginx
                log_success "Nginx 容器已重启"
            else
                log_info "跳过重启 Nginx 容器"
                log_warning "请记得稍后手动重启 Nginx 以应用更改: docker compose restart nginx"
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

# 检查是否需要更新 SSL 证书
check_ssl_cert() {
    local domain=$1
    
    if [[ -f "get-ssl-cert.sh" ]]; then
        log_info "检测到 SSL 证书申请脚本"
        
        read -p "是否要为新域名 $domain 申请 SSL 证书？(y/N): " -n 1 -r
        echo
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
    else
        log_warning "未检测到 SSL 证书申请脚本"
        log_info "请确保已有有效的 SSL 证书，或使用其他方式申请"
    fi
}

# 显示完成信息
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

# 主函数
main() {
    echo ""
    log_info "=== 礼品卡系统 - 域名更新脚本 ==="
    echo ""
    
    # 检查 nginx.conf 文件
    if ! check_nginx_conf; then
        exit 1
    fi
    
    # 获取域名
    if [[ -z "$1" ]]; then
        read -p "请输入您的域名 (例如: example.com): " DOMAIN
    else
        DOMAIN=$1
    fi
    
    # 验证域名
    if ! validate_domain "$DOMAIN"; then
        exit 1
    fi
    
    # 更新域名
    update_domain "$DOMAIN"
    
    # 检查是否需要申请 SSL 证书
    check_ssl_cert "$DOMAIN"
    
    # 检查是否需要重启 Nginx
    check_restart_nginx
    
    # 显示完成信息
    show_completion_info "$DOMAIN"
}

# 如果直接运行脚本，执行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi