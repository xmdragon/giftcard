#!/bin/bash
#
# Docker 清理脚本安装程序
# 功能：自动安装清理脚本并配置 cron 定时任务
#

set -e

# 配置
SCRIPT_DIR="/opt/docker-cleanup"
SCRIPT_NAME="docker-auto-cleanup.sh"
SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT_NAME"
SOURCE_SCRIPT="./docker-auto-cleanup.sh"
CRON_USER="root"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 输出函数
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# 检查 root 权限
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "此脚本必须以 root 权限运行"
    fi
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装，请先安装 Docker"
    fi
    info "Docker 已安装"
}

# 安装清理脚本
install_script() {
    info "开始安装 Docker 清理脚本..."
    
    # 创建目录
    mkdir -p "$SCRIPT_DIR"
    
    # 检查源脚本是否存在
    if [ ! -f "$SOURCE_SCRIPT" ]; then
        error "找不到源脚本文件: $SOURCE_SCRIPT"
    fi
    
    # 复制脚本
    cp "$SOURCE_SCRIPT" "$SCRIPT_PATH"
    chmod +x "$SCRIPT_PATH"
    
    success "清理脚本已安装到: $SCRIPT_PATH"
}

# 显示 cron 时间选项
show_schedule_options() {
    echo ""
    echo "请选择清理计划："
    echo "1) 每天凌晨 2:00 执行"
    echo "2) 每周日凌晨 3:00 执行"
    echo "3) 每月 1 号凌晨 3:00 执行"
    echo "4) 每 6 小时执行一次"
    echo "5) 每天凌晨 2:00 和下午 14:00 执行（一天两次）"
    echo "6) 自定义 cron 表达式"
    echo ""
}

# 获取 cron 表达式
get_cron_expression() {
    local choice=$1
    case $choice in
        1)
            CRON_EXPRESSION="0 2 * * *"
            SCHEDULE_DESC="每天凌晨 2:00"
            ;;
        2)
            CRON_EXPRESSION="0 3 * * 0"
            SCHEDULE_DESC="每周日凌晨 3:00"
            ;;
        3)
            CRON_EXPRESSION="0 3 1 * *"
            SCHEDULE_DESC="每月 1 号凌晨 3:00"
            ;;
        4)
            CRON_EXPRESSION="0 */6 * * *"
            SCHEDULE_DESC="每 6 小时"
            ;;
        5)
            CRON_EXPRESSION="0 2,14 * * *"
            SCHEDULE_DESC="每天凌晨 2:00 和下午 14:00"
            ;;
        6)
            read -p "请输入 cron 表达式 (例如: 0 3 * * *): " CRON_EXPRESSION
            SCHEDULE_DESC="自定义"
            ;;
        *)
            error "无效的选择"
            ;;
    esac
}

# 配置 cron 任务
setup_cron() {
    info "配置定时任务..."
    
    show_schedule_options
    read -p "请选择 (1-6): " choice
    get_cron_expression "$choice"
    
    # 创建 cron 任务
    CRON_JOB="$CRON_EXPRESSION $SCRIPT_PATH >> /var/log/docker-cleanup/cron.log 2>&1"
    
    # 检查是否已存在相同的 cron 任务
    if crontab -u "$CRON_USER" -l 2>/dev/null | grep -q "$SCRIPT_PATH"; then
        warning "检测到已存在的清理任务，是否要替换？"
        read -p "替换现有任务? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # 删除旧任务
            crontab -u "$CRON_USER" -l | grep -v "$SCRIPT_PATH" | crontab -u "$CRON_USER" -
            info "已删除旧的定时任务"
        else
            info "保留现有任务，跳过 cron 配置"
            return
        fi
    fi
    
    # 添加新任务
    (crontab -u "$CRON_USER" -l 2>/dev/null; echo "$CRON_JOB") | crontab -u "$CRON_USER" -
    
    success "定时任务已配置: $SCHEDULE_DESC"
    info "Cron 表达式: $CRON_EXPRESSION"
}

# 创建日志轮转配置
setup_logrotate() {
    info "配置日志轮转..."
    
    cat > /etc/logrotate.d/docker-cleanup << EOF
/var/log/docker-cleanup/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
    
    success "日志轮转已配置"
}

# 测试运行
test_run() {
    read -p "是否要立即执行一次清理测试? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "执行测试清理..."
        "$SCRIPT_PATH"
        success "测试清理完成"
    fi
}

# 显示状态
show_status() {
    echo ""
    echo "========================================="
    echo -e "${GREEN}Docker 清理脚本安装完成！${NC}"
    echo "========================================="
    echo ""
    echo "安装位置: $SCRIPT_PATH"
    echo "日志目录: /var/log/docker-cleanup/"
    echo "执行计划: $SCHEDULE_DESC"
    echo ""
    echo "有用的命令："
    echo "  查看定时任务: crontab -l"
    echo "  手动执行清理: $SCRIPT_PATH"
    echo "  查看清理日志: tail -f /var/log/docker-cleanup/cleanup-\$(date +%Y%m%d).log"
    echo "  编辑定时任务: crontab -e"
    echo ""
}

# 卸载函数
uninstall() {
    warning "即将卸载 Docker 清理脚本"
    read -p "确定要卸载吗? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 删除 cron 任务
        crontab -u "$CRON_USER" -l 2>/dev/null | grep -v "$SCRIPT_PATH" | crontab -u "$CRON_USER" - || true
        
        # 删除脚本
        rm -f "$SCRIPT_PATH"
        
        # 删除 logrotate 配置
        rm -f /etc/logrotate.d/docker-cleanup
        
        success "Docker 清理脚本已卸载"
        
        read -p "是否删除日志文件? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf /var/log/docker-cleanup
            success "日志文件已删除"
        fi
    fi
}

# 主函数
main() {
    echo "========================================="
    echo "   Docker 清理脚本安装程序"
    echo "========================================="
    echo ""
    
    # 检查是否是卸载模式
    if [ "$1" == "uninstall" ]; then
        uninstall
        exit 0
    fi
    
    # 检查权限
    check_root
    
    # 检查 Docker
    check_docker
    
    # 安装脚本
    install_script
    
    # 配置 cron
    setup_cron
    
    # 配置日志轮转
    setup_logrotate
    
    # 测试运行
    test_run
    
    # 显示状态
    show_status
}

# 执行主函数
main "$@"