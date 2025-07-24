#!/bin/bash

# 礼品卡系统 - 自动申请 Let's Encrypt SSL 证书脚本
# 作者: Kiro AI Assistant
# 版本: 1.0

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

# 检查是否为 root 用户或有 sudo 权限
check_privileges() {
    if [[ $EUID -eq 0 ]]; then
        SUDO=""
        log_info "以 root 用户运行"
    elif sudo -n true 2>/dev/null; then
        SUDO="sudo"
        log_info "检测到 sudo 权限"
    else
        log_error "需要 root 权限或 sudo 权限来安装 Certbot"
        log_info "请运行: sudo $0"
        exit 1
    fi
}

# 检查操作系统
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    elif [[ -f /etc/redhat-release ]]; then
        OS="CentOS"
        VER=$(rpm -q --qf "%{VERSION}" $(rpm -q --whatprovides redhat-release))
    else
        log_error "无法检测操作系统"
        exit 1
    fi
    
    log_info "检测到操作系统: $OS $VER"
}

# 安装 Certbot
install_certbot() {
    log_info "安装 Certbot..."
    
    case "$OS" in
        "Ubuntu"*|"Debian"*)
            $SUDO apt-get update
            $SUDO apt-get install -y certbot python3-certbot-nginx
            ;;
        "CentOS"*|"Red Hat"*|"Rocky"*|"AlmaLinux"*)
            $SUDO yum install -y epel-release
            $SUDO yum install -y certbot python3-certbot-nginx
            ;;
        *)
            log_warning "未识别的操作系统，尝试通用安装方法"
            if command -v snap >/dev/null 2>&1; then
                $SUDO snap install --classic certbot
                $SUDO ln -sf /snap/bin/certbot /usr/bin/certbot
            else
                log_error "无法安装 Certbot，请手动安装"
                exit 1
            fi
            ;;
    esac
    
    log_success "Certbot 安装完成"
}

# 检查 Certbot 是否已安装
check_certbot() {
    if command -v certbot >/dev/null 2>&1; then
        log_success "Certbot 已安装"
        return 0
    else
        log_warning "Certbot 未安装"
        return 1
    fi
}

# 检查域名是否有效
validate_domain() {
    local domain=$1
    
    # 简单的域名格式验证
    if [[ ! $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        log_error "无效的域名格式: $domain"
        return 1
    fi
    
    # 检查域名是否可解析
    if ! host $domain >/dev/null 2>&1; then
        log_warning "域名 $domain 无法解析，请确保域名已正确配置 DNS 记录"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    return 0
}

# 检查 Nginx 是否已安装
check_nginx() {
    if command -v nginx >/dev/null 2>&1; then
        log_success "Nginx 已安装"
        return 0
    else
        log_warning "Nginx 未安装"
        return 1
    fi
}

# 检查 Docker 是否运行
check_docker() {
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        log_success "Docker 正在运行"
        DOCKER_RUNNING=true
        return 0
    else
        log_warning "Docker 未运行或未安装"
        DOCKER_RUNNING=false
        return 1
    fi
}

# 创建 SSL 证书目录
create_ssl_dir() {
    log_info "创建 SSL 证书目录..."
    
    if [[ ! -d "./ssl" ]]; then
        mkdir -p ./ssl
        log_success "SSL 目录已创建"
    else
        log_info "SSL 目录已存在"
    fi
}

# 检查80端口占用并处理
ensure_port_80_free() {
    # 检查80端口是否被占用
    local port_80_pid
    port_80_pid=$(lsof -t -i :80 || true)
    if [[ -n "$port_80_pid" ]]; then
        # 检查是否docker nginx容器占用
        if docker compose ps | grep -q "gift_card_nginx"; then
            log_info "检测到80端口被docker nginx容器占用，自动停止..."
            docker compose stop nginx
            sleep 2
            # 再次检查
            port_80_pid=$(lsof -t -i :80 || true)
            if [[ -n "$port_80_pid" ]]; then
                log_error "80端口仍被其它进程占用(PID: $port_80_pid)，请手动释放后重试。"
                exit 1
            fi
        else
            log_error "80端口被其它进程占用(PID: $port_80_pid)，请手动释放后重试。"
            exit 1
        fi
    fi
}

# 申请证书 - 独立模式
get_cert_standalone() {
    local domain=$1
    local email=$2
    
    log_info "使用独立模式申请证书..."
    
    # 停止 Nginx 以释放 80 端口
    if [[ "$DOCKER_RUNNING" == true ]]; then
        log_info "暂时停止 Docker 中的 Nginx 服务..."
        docker compose stop nginx || true
    elif systemctl is-active --quiet nginx; then
        log_info "暂时停止系统 Nginx 服务..."
        $SUDO systemctl stop nginx
    fi
    
    # 申请证书
    if [[ -z "$email" ]]; then
        $SUDO certbot certonly --standalone --preferred-challenges http -d $domain --agree-tos --non-interactive --register-unsafely-without-email
    else
        $SUDO certbot certonly --standalone --preferred-challenges http -d $domain --agree-tos --non-interactive --email $email
    fi
    
    # 重启 Nginx
    if [[ "$DOCKER_RUNNING" == true ]]; then
        log_info "重启 Docker 中的 Nginx 服务..."
        docker compose start nginx || true
    elif systemctl is-active --quiet nginx; then
        log_info "重启系统 Nginx 服务..."
        $SUDO systemctl start nginx
    fi
}

# 申请证书 - Nginx 模式
get_cert_nginx() {
    local domain=$1
    local email=$2
    
    log_info "使用 Nginx 模式申请证书..."
    
    if [[ -z "$email" ]]; then
        $SUDO certbot --nginx -d $domain --agree-tos --non-interactive --register-unsafely-without-email
    else
        $SUDO certbot --nginx -d $domain --agree-tos --non-interactive --email $email
    fi
}

# 复制证书到项目目录
copy_certs() {
    local domain=$1
    
    log_info "复制证书到项目 SSL 目录..."
    
    # 证书路径
    local cert_path="/etc/letsencrypt/live/$domain"
    
    if [[ ! -d "$cert_path" ]]; then
        log_error "证书目录不存在: $cert_path"
        return 1
    fi
    
    # 复制证书
    $SUDO cp "$cert_path/fullchain.pem" ./ssl/
    $SUDO cp "$cert_path/privkey.pem" ./ssl/
    
    # 修改权限
    $SUDO chmod 644 ./ssl/fullchain.pem
    $SUDO chmod 644 ./ssl/privkey.pem
    
    log_success "证书已复制到 ./ssl/ 目录"
}

# 配置 Nginx 使用 SSL
configure_nginx() {
    local domain=$1
    
    log_info "更新 Nginx 配置以使用 SSL..."
    
    # 备份当前配置
    cp nginx.conf nginx.conf.bak
    
    # 取消注释 HTTPS 服务器配置
    sed -i 's/# server {/server {/' nginx.conf
    sed -i 's/#     listen 443 ssl http2;/    listen 443 ssl http2;/' nginx.conf
    sed -i "s/#     server_name localhost;/    server_name $domain;/" nginx.conf
    sed -i 's/#     ssl_certificate/    ssl_certificate/' nginx.conf
    sed -i 's/#     ssl_certificate_key/    ssl_certificate_key/' nginx.conf
    sed -i 's/#     ssl_session_timeout/    ssl_session_timeout/' nginx.conf
    sed -i 's/#     ssl_session_cache/    ssl_session_cache/' nginx.conf
    sed -i 's/#     ssl_session_tickets/    ssl_session_tickets/' nginx.conf
    sed -i 's/#     ssl_protocols/    ssl_protocols/' nginx.conf
    sed -i 's/#     ssl_ciphers/    ssl_ciphers/' nginx.conf
    sed -i 's/#     ssl_prefer_server_ciphers/    ssl_prefer_server_ciphers/' nginx.conf
    sed -i 's/#     ssl_stapling/    ssl_stapling/' nginx.conf
    sed -i 's/#     ssl_stapling_verify/    ssl_stapling_verify/' nginx.conf
    sed -i 's/#     resolver/    resolver/' nginx.conf
    sed -i 's/#     resolver_timeout/    resolver_timeout/' nginx.conf
    
    # 添加 HTTP 到 HTTPS 重定向
    sed -i "/server_name localhost;/a \\\n    # 重定向 HTTP 到 HTTPS\n    if (\$scheme = http) {\n        return 301 https://\$host\$request_uri;\n    }" nginx.conf
    
    # 更新 server_name
    sed -i "s/server_name localhost;/server_name $domain;/" nginx.conf
    
    log_success "Nginx 配置已更新"
}

# 设置自动续期
setup_renewal() {
    log_info "设置证书自动续期..."
    
    # 检查 crontab 是否已存在续期任务
    if ! $SUDO crontab -l | grep -q "certbot renew"; then
        # 添加每天两次检查续期的 cron 任务
        (crontab -l 2>/dev/null; echo "0 0,12 * * * $SUDO certbot renew --quiet") | $SUDO crontab -
        log_success "已添加自动续期 cron 任务"
    else
        log_info "自动续期任务已存在"
    fi
}

# 显示证书信息
show_cert_info() {
    local domain=$1
    
    log_info "证书信息:"
    $SUDO certbot certificates --cert-name $domain
}

# 显示使用说明
show_instructions() {
    local domain=$1
    
    echo ""
    log_success "=== SSL 证书申请完成 ==="
    echo ""
    log_info "证书文件位置:"
    echo "• 完整证书链: ./ssl/fullchain.pem"
    echo "• 私钥: ./ssl/privkey.pem"
    echo ""
    log_info "Nginx 已配置使用 HTTPS"
    echo "• 网站现在可通过 https://$domain 访问"
    echo ""
    log_info "证书自动续期已设置"
    echo "• 证书有效期为 90 天"
    echo "• 系统将自动在到期前续期"
    echo ""
    log_info "重启 Docker 服务以应用更改:"
    echo "• docker compose down"
    echo "• docker compose up -d"
    echo ""
}

# 主函数
main() {
    echo ""
    log_info "=== Let's Encrypt SSL 证书自动申请脚本 ==="
    echo ""
    
    # 检查权限
    check_privileges
    
    # 检测操作系统
    detect_os
    
    # 检查 Docker
    check_docker
    
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
    
    # 获取邮箱（可选）
    if [[ -z "$2" ]]; then
        read -p "请输入您的邮箱 (可选，用于证书过期通知): " EMAIL
    else
        EMAIL=$2
    fi
    
    # 创建 SSL 目录
    create_ssl_dir

    # 检查并释放80端口
    ensure_port_80_free

    # 检查并安装 Certbot
    if ! check_certbot; then
        install_certbot
    fi
    
    # 申请证书
    if check_nginx; then
        get_cert_nginx "$DOMAIN" "$EMAIL"
    else
        get_cert_standalone "$DOMAIN" "$EMAIL"
    fi
    
    # 复制证书
    copy_certs "$DOMAIN"

    # 恢复docker nginx
    if docker compose ps | grep -q "Exit" | grep -q "nginx"; then
        log_info "自动重启docker nginx容器..."
        docker compose start nginx
    fi
    
    # 配置 Nginx
    configure_nginx "$DOMAIN"
    
    # 设置自动续期
    setup_renewal
    
    # 显示证书信息
    show_cert_info "$DOMAIN"
    
    # 显示使用说明
    show_instructions "$DOMAIN"
}

# 如果直接运行脚本，执行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi