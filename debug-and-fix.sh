#!/bin/bash

# 礼品卡系统 - 故障诊断和修复脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查 Docker 服务
check_docker() {
    log_info "检查 Docker 服务状态..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行"
        return 1
    fi
    
    log_success "Docker 服务正常"
    return 0
}

# 检查容器状态
check_containers() {
    log_info "检查容器状态..."
    
    echo "容器状态:"
    docker compose ps
    
    # 检查关键容器
    local mysql_status=$(docker compose ps mysql --format "{{.State}}")
    local app_status=$(docker compose ps app --format "{{.State}}")
    
    if [[ "$mysql_status" != "running" ]]; then
        log_error "MySQL 容器未运行: $mysql_status"
        return 1
    fi
    
    if [[ "$app_status" != "running" ]]; then
        log_error "应用容器未运行: $app_status"
        return 1
    fi
    
    log_success "所有容器正常运行"
    return 0
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    # 等待数据库启动
    log_info "等待数据库启动..."
    sleep 10
    
    # 测试数据库连接
    if docker compose exec -T mysql mysql -u giftcard_user -pGiftCard_User_2024! -e "SELECT 1;" &> /dev/null; then
        log_success "数据库连接正常"
        return 0
    else
        log_error "数据库连接失败"
        return 1
    fi
}

# 检查应用健康状态
check_app_health() {
    log_info "检查应用健康状态..."
    
    # 等待应用启动
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:3000/health &> /dev/null; then
            log_success "应用健康检查通过"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo ""
    log_error "应用健康检查失败"
    return 1
}

# 显示日志
show_logs() {
    log_info "显示最近的错误日志..."
    
    echo ""
    echo "=== 应用日志 ==="
    docker compose logs --tail=20 app
    
    echo ""
    echo "=== 数据库日志 ==="
    docker compose logs --tail=10 mysql
}

# 重启服务
restart_services() {
    log_info "重启所有服务..."
    
    # 停止服务
    docker compose down
    
    # 等待完全停止
    sleep 5
    
    # 启动服务
    docker compose up -d
    
    log_success "服务已重启"
}

# 重建应用
rebuild_app() {
    log_info "重建应用容器..."
    
    # 停止应用容器
    docker compose stop app
    
    # 重建应用镜像
    docker compose build --no-cache app
    
    # 启动应用容器
    docker compose up -d app
    
    log_success "应用容器已重建"
}

# 清理并重新部署
clean_deploy() {
    log_warning "执行清理并重新部署..."
    
    # 停止并删除所有容器
    docker compose down -v
    
    # 清理镜像（可选）
    read -p "是否要清理 Docker 镜像？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose build --no-cache
    fi
    
    # 重新启动
    docker compose up -d
    
    log_success "清理部署完成"
}

# 主菜单
show_menu() {
    echo ""
    log_info "=== 礼品卡系统故障诊断工具 ==="
    echo ""
    echo "1. 快速诊断"
    echo "2. 查看日志"
    echo "3. 重启服务"
    echo "4. 重建应用"
    echo "5. 清理重新部署"
    echo "6. 退出"
    echo ""
}

# 快速诊断
quick_diagnosis() {
    log_info "开始快速诊断..."
    
    # 检查 Docker
    if ! check_docker; then
        log_error "请先安装并启动 Docker"
        return 1
    fi
    
    # 检查容器状态
    if ! check_containers; then
        log_warning "容器状态异常，建议重启服务"
        return 1
    fi
    
    # 检查数据库
    if ! check_database; then
        log_warning "数据库连接异常"
        return 1
    fi
    
    # 检查应用健康
    if ! check_app_health; then
        log_warning "应用健康检查失败"
        show_logs
        return 1
    fi
    
    log_success "所有检查通过！系统运行正常"
    
    echo ""
    log_info "访问地址:"
    echo "• 会员端: http://localhost:3000"
    echo "• 管理端: http://localhost:3000/admin"
    echo "• 健康检查: http://localhost:3000/health"
    
    return 0
}

# 主函数
main() {
    while true; do
        show_menu
        read -p "请选择操作 (1-6): " choice
        
        case $choice in
            1)
                quick_diagnosis
                ;;
            2)
                show_logs
                ;;
            3)
                restart_services
                ;;
            4)
                rebuild_app
                ;;
            5)
                clean_deploy
                ;;
            6)
                log_info "退出诊断工具"
                exit 0
                ;;
            *)
                log_error "无效选择，请输入 1-6"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
    done
}

# 如果直接运行脚本，显示菜单
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi