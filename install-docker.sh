#!/bin/bash

# 礼品卡发放系统 - Docker 自动安装脚本
# 支持 Ubuntu/Debian/CentOS/RHEL 系统

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

# 检测操作系统
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

# 检查是否为 root 用户或有 sudo 权限
check_privileges() {
    if [[ $EUID -eq 0 ]]; then
        SUDO=""
        log_info "以 root 用户运行"
    elif sudo -n true 2>/dev/null; then
        SUDO="sudo"
        log_info "检测到 sudo 权限"
    else
        log_error "需要 root 权限或 sudo 权限来安装 Docker"
        log_info "请运行: sudo $0"
        exit 1
    fi
}

# 检查 Docker 是否已安装
check_docker() {
    if command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        log_success "Docker 已安装: $DOCKER_VERSION"
        return 0
    else
        log_warning "Docker 未安装"
        return 1
    fi
}

# 检查 Docker Compose 是否已安装
check_docker_compose() {
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "unknown")
        log_success "Docker Compose 已安装: $COMPOSE_VERSION"
        return 0
    else
        log_warning "Docker Compose 未安装"
        return 1
    fi
}

# 安装 Docker - Ubuntu/Debian
install_docker_ubuntu() {
    log_info "在 Ubuntu/Debian 系统上安装 Docker..."
    
    # 更新包索引
    $SUDO apt-get update
    
    # 安装必要的包
    $SUDO apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # 添加 Docker 官方 GPG 密钥
    $SUDO mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 设置稳定版仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 更新包索引
    $SUDO apt-get update
    
    # 安装 Docker Engine
    $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    log_success "Docker 安装完成"
}

# 安装 Docker - CentOS/RHEL
install_docker_centos() {
    log_info "在 CentOS/RHEL 系统上安装 Docker..."
    
    # 安装必要的包
    $SUDO yum install -y yum-utils
    
    # 添加 Docker 仓库
    $SUDO yum-config-manager \
        --add-repo \
        https://download.docker.com/linux/centos/docker-ce.repo
    
    # 安装 Docker Engine
    $SUDO yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    log_success "Docker 安装完成"
}

# 安装 Docker - 通用方法（备用）
install_docker_generic() {
    log_info "使用通用安装脚本安装 Docker..."
    
    # 下载并运行 Docker 官方安装脚本
    curl -fsSL https://get.docker.com -o get-docker.sh
    $SUDO sh get-docker.sh
    rm get-docker.sh
    
    log_success "Docker 安装完成"
}

# 配置 Docker 服务
configure_docker() {
    log_info "配置 Docker 服务..."
    
    # 启动 Docker 服务
    $SUDO systemctl start docker
    
    # 设置开机自启
    $SUDO systemctl enable docker
    
    # 将当前用户添加到 docker 组
    if [[ $EUID -ne 0 ]]; then
        $SUDO usermod -aG docker $USER
        log_info "已将用户 $USER 添加到 docker 组"
        log_warning "请重新登录或运行 'newgrp docker' 以使组权限生效"
    fi
    
    log_success "Docker 服务配置完成"
}

# 验证安装
verify_installation() {
    log_info "验证 Docker 安装..."
    
    # 检查 Docker 版本
    if docker --version >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version)
        log_success "Docker 版本: $DOCKER_VERSION"
    else
        log_error "Docker 安装验证失败"
        return 1
    fi
    
    # 检查 Docker Compose 版本
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version)
        log_success "Docker Compose 版本: $COMPOSE_VERSION"
    else
        log_error "Docker Compose 安装验证失败"
        return 1
    fi
    
    # 测试 Docker 运行
    if $SUDO docker run --rm hello-world >/dev/null 2>&1; then
        log_success "Docker 运行测试通过"
    else
        log_warning "Docker 运行测试失败，可能需要重新登录"
    fi
    
    return 0
}

# 显示安装后说明
show_post_install_info() {
    echo ""
    log_success "=== Docker 安装完成 ==="
    echo ""
    log_info "接下来的步骤："
    echo "1. 如果你不是 root 用户，请重新登录或运行: newgrp docker"
    echo "2. 验证安装: docker --version"
    echo "3. 启动项目: docker compose up -d"
    echo ""
    log_info "项目相关命令："
    echo "• 启动服务: docker compose up -d"
    echo "• 查看状态: docker compose ps"
    echo "• 查看日志: docker compose logs -f app"
    echo "• 停止服务: docker compose down"
    echo ""
    log_info "管理员后台访问:"
    echo "• 地址: http://your-server-ip:3000/admin"
    echo "• 用户名: admin"
    echo "• 密码: admin123"
    echo ""
}

# 主函数
main() {
    echo ""
    log_info "=== 礼品卡发放系统 - Docker 自动安装脚本 ==="
    echo ""
    
    # 检测系统环境
    detect_os
    check_privileges
    
    # 检查现有安装
    DOCKER_INSTALLED=false
    COMPOSE_INSTALLED=false
    
    if check_docker; then
        DOCKER_INSTALLED=true
    fi
    
    if check_docker_compose; then
        COMPOSE_INSTALLED=true
    fi
    
    # 如果都已安装，询问是否继续
    if [[ "$DOCKER_INSTALLED" == true && "$COMPOSE_INSTALLED" == true ]]; then
        echo ""
        log_success "Docker 和 Docker Compose 都已安装！"
        read -p "是否要重新安装？(y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "跳过安装，直接显示使用说明"
            show_post_install_info
            exit 0
        fi
    fi
    
    # 安装 Docker
    if [[ "$DOCKER_INSTALLED" == false ]]; then
        echo ""
        log_info "开始安装 Docker..."
        
        case "$OS" in
            "Ubuntu"*|"Debian"*)
                install_docker_ubuntu
                ;;
            "CentOS"*|"Red Hat"*|"Rocky"*|"AlmaLinux"*)
                install_docker_centos
                ;;
            *)
                log_warning "未识别的操作系统，尝试通用安装方法"
                install_docker_generic
                ;;
        esac
        
        # 配置 Docker 服务
        configure_docker
    fi
    
    # 验证安装
    echo ""
    if verify_installation; then
        show_post_install_info
    else
        log_error "安装验证失败，请检查错误信息"
        exit 1
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi