#!/usr/bin/env bash
# 礼品卡发放系统 - Docker 自动安装脚本 v2
# 适配：Ubuntu/Debian、CentOS/RHEL/Rocky/AlmaLinux
# 变更要点：
# - 即使 Docker 已安装，也会自动补装 Compose v2（docker-compose-plugin）
# - 安装/验证输出更清晰；保留原有彩色日志与使用提示

set -euo pipefail

# ===== 颜色定义 =====
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ===== 检测操作系统 =====
OS=""; VER=""
detect_os() {
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS=$NAME; VER=$VERSION_ID
  elif command -v lsb_release >/dev/null 2>&1; then
    OS=$(lsb_release -si); VER=$(lsb_release -sr)
  elif [[ -f /etc/redhat-release ]]; then
    OS="CentOS"; VER=$(rpm -q --qf "%{VERSION}" "$(rpm -q --whatprovides redhat-release)")
  else
    log_error "无法检测操作系统"; exit 1
  fi
  log_info "检测到操作系统: $OS $VER"
}

# ===== 权限检测 =====
SUDO=""
check_privileges() {
  if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
    SUDO=""; log_info "以 root 用户运行"
  elif sudo -n true 2>/dev/null; then
    SUDO="sudo"; log_info "检测到 sudo 权限"
  else
    log_error "需要 root 或 sudo 权限"; log_info "请运行: sudo $0"; exit 1
  fi
}

# ===== 现状检测 =====
docker_installed=false
compose_installed=false

check_docker() {
  if command -v docker >/dev/null 2>&1; then
    docker_installed=true
    log_success "Docker 已安装: $(docker --version | awk '{print $3}' | tr -d ',')"
  else
    log_warning "Docker 未安装"
  fi
}

check_compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    compose_installed=true
    log_success "Docker Compose 已安装: $(docker compose version --short 2>/dev/null || echo unknown)"
  else
    log_warning "Docker Compose 未安装"
  fi
}

# ===== 安装 Docker（Ubuntu/Debian） =====
install_docker_ubuntu() {
  log_info "在 Ubuntu/Debian 上安装 Docker..."
  $SUDO apt-get update -y
  $SUDO apt-get install -y ca-certificates curl gnupg lsb-release

  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  $SUDO chmod a+r /etc/apt/keyrings/docker.gpg

  # 发行版代号：Ubuntu 用 lsb_release -cs，Debian 同理可工作
  echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null

  $SUDO apt-get update -y
  # 同步安装 Compose/Buildx 插件
  $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  log_success "Docker（含 Buildx/Compose 插件）安装完成"
}

# ===== 安装 Docker（CentOS/RHEL/Rocky/AlmaLinux） =====
install_docker_centos() {
  log_info "在 CentOS/RHEL 系上安装 Docker..."
  $SUDO yum install -y yum-utils
  $SUDO yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  $SUDO yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  log_success "Docker（含 Buildx/Compose 插件）安装完成"
}

# ===== 通用安装（备用） =====
install_docker_generic() {
  log_info "使用 get.docker.com 脚本安装 Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  $SUDO sh get-docker.sh
  rm -f get-docker.sh
  log_success "Docker 安装完成（通用脚本）"
}

# ===== 单独安装 Compose（用于 Docker 已装但缺 Compose 的情况） =====
install_compose_ubuntu() {
  log_info "安装 Docker Compose 插件（Ubuntu/Debian）..."
  $SUDO apt-get update -y
  $SUDO apt-get install -y docker-compose-plugin
  log_success "Compose 插件安装完成"
}

install_compose_centos() {
  log_info "安装 Docker Compose 插件（CentOS/RHEL）..."
  $SUDO yum makecache -y || true
  $SUDO yum install -y docker-compose-plugin
  log_success "Compose 插件安装完成"
}

install_compose_manual() {
  # 官方手动方式：放置到 ~/.docker/cli-plugins/docker-compose，适合无法用包管理器时
  # 注意：手动安装不自动更新
  log_info "手动安装 Compose 插件（通用）..."
  local ver="v2.39.2"
  local arch="$(uname -m)"
  local os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  local bin="docker-compose"
  local url="https://github.com/docker/compose/releases/download/${ver}/docker-compose-${os}-${arch}"

  mkdir -p "${HOME}/.docker/cli-plugins"
  curl -fSL "$url" -o "${HOME}/.docker/cli-plugins/${bin}"
  chmod +x "${HOME}/.docker/cli-plugins/${bin}"
  log_success "Compose 手动安装完成（${ver} ${os}/${arch}）"
}

# ===== 配置与启用服务 =====
configure_docker() {
  log_info "配置 Docker 服务..."
  $SUDO systemctl enable --now docker
  if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
    $SUDO usermod -aG docker "$USER"
    log_info "已将用户 $USER 加入 docker 组；需要重新登录或执行 'newgrp docker'"
  fi
  log_success "Docker 服务就绪"
}

# ===== 验证 =====
verify_installation() {
  log_info "验证 Docker/Compose..."
  if ! docker --version >/dev/null 2>&1; then
    log_error "Docker 未就绪"; return 1
  fi
  log_success "Docker 版本: $(docker --version)"

  if docker compose version >/dev/null 2>&1; then
    log_success "Compose 版本: $(docker compose version --short 2>/dev/null || docker compose version)"
  else
    log_error "Compose 未安装或不可用"; return 1
  fi

  # 运行简单容器测试
  if docker run --rm hello-world >/dev/null 2>&1; then
    log_success "Hello-World 运行测试通过"
  else
    log_warning "Hello-World 测试未通过（可能需要重新登录或网络受限）"
  fi
}

# ===== 使用说明 =====
show_post_install_info() {
  echo ""
  log_success "=== Docker & Compose 安装完成 ==="
  echo ""
  log_info "后续建议："
  echo "1) 非 root 用户：重新登录或运行 'newgrp docker' 使组权限生效"
  echo "2) 验证版本：docker --version && docker compose version"
  echo "3) 启动你的项目：docker compose up -d"
  echo ""
}

main() {
  echo ""; log_info "=== 礼品卡发放系统 - Docker 自动安装脚本 v2 ==="; echo ""
  detect_os
  check_privileges
  check_docker
  check_compose

  # 已装 Docker，但缺 Compose -> 单独补装
  if $docker_installed && ! $compose_installed; then
    case "$OS" in
      "Ubuntu"*|"Debian"*) install_compose_ubuntu ;;
      "CentOS"*|"Red Hat"*|"Rocky"*|"AlmaLinux"*) install_compose_centos ;;
      *) log_warning "未识别系统，将尝试手动安装 Compose"; install_compose_manual ;;
    esac
    check_compose
  fi

  # 未装 Docker -> 安装（顺带装 buildx/compose 插件）
  if ! $docker_installed; then
    case "$OS" in
      "Ubuntu"*|"Debian"*) install_docker_ubuntu ;;
      "CentOS"*|"Red Hat"*|"Rocky"*|"AlmaLinux"*) install_docker_centos ;;
      *) log_warning "未识别系统，尝试通用安装方法"; install_docker_generic ;;
    esac
    configure_docker
    check_docker
    check_compose
    if ! $compose_installed; then
      case "$OS" in
        "Ubuntu"*|"Debian"*) install_compose_ubuntu ;;
        "CentOS"*|"Red Hat"*|"Rocky"*|"AlmaLinux"*) install_compose_centos ;;
        *) log_warning "未识别系统，将尝试手动安装 Compose"; install_compose_manual ;;
      esac
    fi
  fi

  echo ""
  if verify_installation; then
    show_post_install_info
  else
    log_error "安装验证失败，请根据日志排查"
    exit 1
  fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
