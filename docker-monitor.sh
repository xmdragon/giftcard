#!/bin/bash
#
# Docker 空间监控脚本
# 功能：实时监控 Docker 空间使用情况
#

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 清屏
clear

# 显示标题
show_header() {
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}       Docker 空间使用监控工具${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""
}

# 显示磁盘使用情况
show_disk_usage() {
    echo -e "${BLUE}[磁盘使用情况]${NC}"
    df -h / | head -2
    echo ""
}

# 显示 Docker 空间使用
show_docker_usage() {
    echo -e "${BLUE}[Docker 空间使用]${NC}"
    docker system df
    echo ""
}

# 显示容器大小
show_container_sizes() {
    echo -e "${BLUE}[容器文件系统大小]${NC}"
    docker ps -s --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
    echo ""
}

# 显示最大的镜像
show_largest_images() {
    echo -e "${BLUE}[最大的 10 个镜像]${NC}"
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | head -11
    echo ""
}

# 显示日志文件大小
show_log_sizes() {
    echo -e "${BLUE}[容器日志大小]${NC}"
    for container in $(docker ps -q); do
        name=$(docker inspect -f '{{.Name}}' $container | sed 's/\///')
        log_file="/var/lib/docker/containers/$container/$container-json.log"
        if [ -f "$log_file" ]; then
            size=$(ls -lh "$log_file" 2>/dev/null | awk '{print $5}')
            echo -e "  $name: $size"
        fi
    done
    echo ""
}

# 显示清理建议
show_cleanup_suggestions() {
    echo -e "${YELLOW}[清理建议]${NC}"
    
    # 检查停止的容器
    stopped=$(docker ps -aq -f status=exited | wc -l)
    if [ "$stopped" -gt 0 ]; then
        echo -e "  ${YELLOW}•${NC} 发现 $stopped 个停止的容器可以清理"
    fi
    
    # 检查悬空镜像
    dangling=$(docker images -f "dangling=true" -q | wc -l)
    if [ "$dangling" -gt 0 ]; then
        echo -e "  ${YELLOW}•${NC} 发现 $dangling 个悬空镜像可以清理"
    fi
    
    # 检查悬空卷
    volumes=$(docker volume ls -qf dangling=true | wc -l)
    if [ "$volumes" -gt 0 ]; then
        echo -e "  ${YELLOW}•${NC} 发现 $volumes 个悬空卷可以清理"
    fi
    
    if [ "$stopped" -eq 0 ] && [ "$dangling" -eq 0 ] && [ "$volumes" -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} 系统清洁，无需清理"
    fi
    echo ""
}

# 实时监控模式
monitor_mode() {
    while true; do
        clear
        show_header
        echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} 刷新中..."
        echo ""
        show_disk_usage
        show_docker_usage
        show_container_sizes
        show_largest_images
        show_log_sizes
        show_cleanup_suggestions
        
        echo -e "${CYAN}按 Ctrl+C 退出监控${NC}"
        sleep 5
    done
}

# 单次检查模式
check_once() {
    show_header
    show_disk_usage
    show_docker_usage
    show_container_sizes
    show_largest_images
    show_log_sizes
    show_cleanup_suggestions
    
    echo -e "${GREEN}[检查完成]${NC}"
}

# 主函数
main() {
    case "$1" in
        -m|--monitor)
            monitor_mode
            ;;
        -h|--help)
            echo "使用方法:"
            echo "  $0          # 单次检查"
            echo "  $0 -m       # 实时监控模式（5秒刷新）"
            echo "  $0 -h       # 显示帮助"
            ;;
        *)
            check_once
            ;;
    esac
}

# 执行主函数
main "$@"