#!/bin/bash
#
# Docker 生产环境自动清理脚本
# 功能：清理废弃镜像、停止的容器、悬空卷和构建缓存
# 作者：System Admin
# 版本：1.0
#

# 配置区
LOG_DIR="/var/log/docker-cleanup"
LOG_FILE="$LOG_DIR/cleanup-$(date +%Y%m%d).log"
KEEP_LOGS_DAYS=30
DISK_WARNING_THRESHOLD=80  # 磁盘使用率警告阈值
MIN_FREE_SPACE_GB=5        # 最小剩余空间（GB）

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 创建日志目录
mkdir -p "$LOG_DIR"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# 检查是否以 root 运行
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本必须以 root 权限运行"
        exit 1
    fi
}

# 获取磁盘使用情况
get_disk_usage() {
    df -h / | awk 'NR==2 {print $5}' | sed 's/%//'
}

# 获取剩余空间（GB）
get_free_space_gb() {
    df -BG / | awk 'NR==2 {print $4}' | sed 's/G//'
}

# 检查 Docker 服务状态
check_docker_service() {
    if ! systemctl is-active --quiet docker; then
        log_error "Docker 服务未运行"
        exit 1
    fi
}

# 备份重要信息
backup_info() {
    log "备份当前 Docker 状态信息..."
    {
        echo "=== 清理前 Docker 镜像列表 ==="
        docker images
        echo ""
        echo "=== 清理前运行中的容器 ==="
        docker ps
        echo ""
        echo "=== 清理前所有容器 ==="
        docker ps -a
        echo ""
        echo "=== 清理前 Docker 卷 ==="
        docker volume ls
        echo ""
        echo "=== 清理前 Docker 空间使用 ==="
        docker system df
    } >> "$LOG_FILE" 2>&1
}

# 清理停止的容器
cleanup_stopped_containers() {
    log "开始清理停止的容器..."
    
    # 获取停止的容器数量
    stopped_count=$(docker ps -aq -f status=exited -f status=created | wc -l)
    
    if [ "$stopped_count" -gt 0 ]; then
        log "发现 $stopped_count 个停止的容器"
        
        # 保留最近停止的容器（可选）
        # 这里保留 7 天内停止的容器，避免误删刚停止的容器
        docker container prune -f --filter "until=168h" >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            log_success "成功清理停止的容器"
        else
            log_error "清理停止的容器失败"
        fi
    else
        log "没有需要清理的停止容器"
    fi
}

# 清理悬空镜像
cleanup_dangling_images() {
    log "开始清理悬空镜像..."
    
    dangling_count=$(docker images -f "dangling=true" -q | wc -l)
    
    if [ "$dangling_count" -gt 0 ]; then
        log "发现 $dangling_count 个悬空镜像"
        docker image prune -f >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            log_success "成功清理悬空镜像"
        else
            log_error "清理悬空镜像失败"
        fi
    else
        log "没有需要清理的悬空镜像"
    fi
}

# 清理未使用的镜像（谨慎）
cleanup_unused_images() {
    log "开始清理未使用的镜像..."
    
    # 只清理超过 30 天未使用的镜像
    docker image prune -a -f --filter "until=720h" >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "成功清理未使用的镜像"
    else
        log_error "清理未使用的镜像失败"
    fi
}

# 清理悬空卷
cleanup_dangling_volumes() {
    log "开始清理悬空卷..."
    
    # 列出悬空卷
    dangling_volumes=$(docker volume ls -qf dangling=true | wc -l)
    
    if [ "$dangling_volumes" -gt 0 ]; then
        log "发现 $dangling_volumes 个悬空卷"
        
        # 保存悬空卷列表到日志
        echo "悬空卷列表：" >> "$LOG_FILE"
        docker volume ls -qf dangling=true >> "$LOG_FILE"
        
        # 清理悬空卷
        docker volume prune -f >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            log_success "成功清理悬空卷"
        else
            log_error "清理悬空卷失败"
        fi
    else
        log "没有需要清理的悬空卷"
    fi
}

# 清理构建缓存
cleanup_build_cache() {
    log "开始清理构建缓存..."
    
    # 只清理超过 7 天的构建缓存
    docker builder prune -f --filter "until=168h" >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "成功清理构建缓存"
    else
        log_error "清理构建缓存失败"
    fi
}

# 清理未使用的网络
cleanup_unused_networks() {
    log "开始清理未使用的网络..."
    
    docker network prune -f >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "成功清理未使用的网络"
    else
        log_error "清理未使用的网络失败"
    fi
}

# 清理旧日志文件
cleanup_old_logs() {
    log "清理超过 $KEEP_LOGS_DAYS 天的日志文件..."
    find "$LOG_DIR" -name "cleanup-*.log" -type f -mtime +$KEEP_LOGS_DAYS -delete
}

# 生成清理报告
generate_report() {
    log "生成清理报告..."
    {
        echo ""
        echo "=== 清理后 Docker 空间使用 ==="
        docker system df
        echo ""
        echo "=== 清理后磁盘使用情况 ==="
        df -h /
        echo ""
        echo "=== 清理后运行中的容器 ==="
        docker ps
    } >> "$LOG_FILE" 2>&1
}

# 发送警告（可以集成邮件或钉钉通知）
send_alert() {
    local message=$1
    log_warning "$message"
    
    # 这里可以添加邮件或其他通知方式
    # echo "$message" | mail -s "Docker Cleanup Alert" admin@example.com
}

# 主函数
main() {
    log "========================================="
    log "Docker 自动清理脚本开始执行"
    log "========================================="
    
    # 检查权限
    check_root
    
    # 检查 Docker 服务
    check_docker_service
    
    # 记录清理前状态
    DISK_USAGE_BEFORE=$(get_disk_usage)
    FREE_SPACE_BEFORE=$(get_free_space_gb)
    
    log "清理前磁盘使用率: ${DISK_USAGE_BEFORE}%"
    log "清理前剩余空间: ${FREE_SPACE_BEFORE}GB"
    
    # 检查磁盘空间
    if [ "$DISK_USAGE_BEFORE" -gt "$DISK_WARNING_THRESHOLD" ]; then
        send_alert "警告：磁盘使用率已达 ${DISK_USAGE_BEFORE}%，超过警告阈值 ${DISK_WARNING_THRESHOLD}%"
    fi
    
    if [ "$FREE_SPACE_BEFORE" -lt "$MIN_FREE_SPACE_GB" ]; then
        send_alert "警告：剩余磁盘空间仅 ${FREE_SPACE_BEFORE}GB，低于最小要求 ${MIN_FREE_SPACE_GB}GB"
    fi
    
    # 备份信息
    backup_info
    
    # 执行清理操作
    cleanup_stopped_containers
    cleanup_dangling_images
    cleanup_unused_images
    cleanup_dangling_volumes
    cleanup_build_cache
    cleanup_unused_networks
    cleanup_old_logs
    
    # 记录清理后状态
    DISK_USAGE_AFTER=$(get_disk_usage)
    FREE_SPACE_AFTER=$(get_free_space_gb)
    
    log "清理后磁盘使用率: ${DISK_USAGE_AFTER}%"
    log "清理后剩余空间: ${FREE_SPACE_AFTER}GB"
    
    # 计算释放的空间
    SPACE_FREED=$((FREE_SPACE_AFTER - FREE_SPACE_BEFORE))
    log_success "本次清理释放空间: ${SPACE_FREED}GB"
    
    # 生成报告
    generate_report
    
    log "========================================="
    log "Docker 自动清理脚本执行完成"
    log "========================================="
}

# 执行主函数
main "$@"