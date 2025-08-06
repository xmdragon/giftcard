#!/bin/bash

# Clear admin banned IPs script
# Author: AI Assistant
# Date: $(date +%Y-%m-%d)

set -e  # Exit on error

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored messages
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  管理员禁止登录IP表清空脚本${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
}

# Check if Docker is running
check_docker() {
    if ! docker ps > /dev/null 2>&1; then
        print_error "Docker未运行或无法访问"
        exit 1
    fi
}

# Check if MySQL container is running
check_mysql_container() {
    if ! docker ps | grep -q "mysql"; then
        print_error "MySQL容器未运行，请先启动项目: docker compose up -d"
        exit 1
    fi
}

# Get MySQL container name
get_mysql_container() {
    MYSQL_CONTAINER="gift_card_mysql"
    if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
        print_error "未找到MySQL容器: $MYSQL_CONTAINER"
        exit 1
    fi
    print_message "找到MySQL容器: $MYSQL_CONTAINER"
}

# Clear admin IP restrictions table
clear_admin_ip_restrictions() {
    print_message "正在清空管理员IP限制表 (admin_ip_restrictions)..."
    
    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        DELETE FROM admin_ip_restrictions WHERE status IN ('active', 'expired', 'removed');
        ALTER TABLE admin_ip_restrictions AUTO_INCREMENT = 1;
    "
    
    if [ $? -eq 0 ]; then
        print_message "✓ 管理员IP限制表已清空"
    else
        print_error "✗ 清空管理员IP限制表失败"
        return 1
    fi
}

# Clear IP blacklist table
clear_ip_blacklist() {
    print_message "正在清空IP黑名单表 (ip_blacklist)..."
    
    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        DELETE FROM ip_blacklist WHERE status IN ('active', 'inactive');
        ALTER TABLE ip_blacklist AUTO_INCREMENT = 1;
    "
    
    if [ $? -eq 0 ]; then
        print_message "✓ IP黑名单表已清空"
    else
        print_error "✗ 清空IP黑名单表失败"
        return 1
    fi
}

# Clear admin login failures table
clear_admin_login_failures() {
    print_message "正在清空管理员登录失败记录表 (admin_login_failures)..."
    
    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        DELETE FROM admin_login_failures;
        ALTER TABLE admin_login_failures AUTO_INCREMENT = 1;
    "
    
    if [ $? -eq 0 ]; then
        print_message "✓ 管理员登录失败记录表已清空"
    else
        print_error "✗ 清空管理员登录失败记录表失败"
        return 1
    fi
}

# Show current status
show_current_status() {
    print_message "显示当前禁止IP状态..."
    
    echo
    echo "=== 管理员IP限制表状态 ==="
    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        SELECT 
            ip_address,
            restriction_type,
            status,
            reason,
            start_time,
            end_time
        FROM admin_ip_restrictions 
        WHERE status = 'active'
        ORDER BY start_time DESC;
    "
    
    echo
    echo "=== IP黑名单表状态 ==="
    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        SELECT 
            ip_address,
            reason,
            status,
            banned_at
        FROM ip_blacklist 
        WHERE status = 'active'
        ORDER BY banned_at DESC;
    "
    
    echo
    echo "=== 管理员登录失败记录统计 ==="
    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        SELECT 
            COUNT(*) as total_failures,
            COUNT(DISTINCT ip_address) as unique_ips,
            COUNT(DISTINCT username) as unique_usernames
        FROM admin_login_failures;
    "
}

# Main function
main() {
    print_header
    
    print_warning "此脚本将清空所有管理员禁止登录IP相关的表"
    print_warning "包括："
    print_warning "  - admin_ip_restrictions (管理员IP限制表)"
    print_warning "  - ip_blacklist (IP黑名单表)"
    print_warning "  - admin_login_failures (管理员登录失败记录表)"
    echo
    
    read -p "确认要清空这些表吗？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_message "操作已取消"
        exit 0
    fi
    
    # Check environment
    check_docker
    check_mysql_container
    get_mysql_container
    
    # Show status before clearing
    show_current_status
    
    echo
    print_warning "开始清空表..."
    echo
    
    # Execute clearing operations
    clear_admin_ip_restrictions
    clear_ip_blacklist
    clear_admin_login_failures
    
    echo
    print_message "所有表清空完成！"
    echo
    
    # Show status after clearing
    show_current_status
    
    print_message "脚本执行完成"
}

# Execute main function
main "$@" 