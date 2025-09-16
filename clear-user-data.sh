#!/bin/bash

# Clear user and gift card data script
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
    echo -e "${BLUE}  用户数据和礼品卡清理脚本${NC}"
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

# Clear gift cards (but keep categories)
clear_gift_cards() {
    print_message "正在清空礼品卡表 (gift_cards)..."

    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        DELETE FROM gift_cards;
        ALTER TABLE gift_cards AUTO_INCREMENT = 1;
    "

    if [ $? -eq 0 ]; then
        print_message "✓ 礼品卡表已清空（分类保留）"
    else
        print_error "✗ 清空礼品卡表失败"
        return 1
    fi
}

# Clear user page tracking
clear_user_page_tracking() {
    print_message "正在清空用户页面跟踪表 (user_page_tracking)..."

    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        DELETE FROM user_page_tracking;
        ALTER TABLE user_page_tracking AUTO_INCREMENT = 1;
    "

    if [ $? -eq 0 ]; then
        print_message "✓ 用户页面跟踪表已清空"
    else
        print_error "✗ 清空用户页面跟踪表失败"
        return 1
    fi
}

# Clear checkin records (has FK to gift_cards and members)
clear_checkin_records() {
    print_message "正在清空签到记录表 (checkin_records)..."

    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        DELETE FROM checkin_records;
        ALTER TABLE checkin_records AUTO_INCREMENT = 1;
    "

    if [ $? -eq 0 ]; then
        print_message "✓ 签到记录表已清空"
    else
        print_error "✗ 清空签到记录表失败"
        return 1
    fi
}

# Clear second verifications (has FK to members and login_logs)
clear_second_verifications() {
    print_message "正在清空二次验证表 (second_verifications)..."

    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        DELETE FROM second_verifications;
        ALTER TABLE second_verifications AUTO_INCREMENT = 1;
    "

    if [ $? -eq 0 ]; then
        print_message "✓ 二次验证表已清空"
    else
        print_error "✗ 清空二次验证表失败"
        return 1
    fi
}

# Clear login logs (has FK to members)
clear_login_logs() {
    print_message "正在清空登录日志表 (login_logs)..."

    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        DELETE FROM login_logs;
        ALTER TABLE login_logs AUTO_INCREMENT = 1;
    "

    if [ $? -eq 0 ]; then
        print_message "✓ 登录日志表已清空"
    else
        print_error "✗ 清空登录日志表失败"
        return 1
    fi
}

# Clear members table
clear_members() {
    print_message "正在清空会员表 (members)..."

    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        DELETE FROM members;
        ALTER TABLE members AUTO_INCREMENT = 1;
    "

    if [ $? -eq 0 ]; then
        print_message "✓ 会员表已清空"
    else
        print_error "✗ 清空会员表失败"
        return 1
    fi
}

# Show current status before clearing
show_current_status() {
    print_message "显示当前数据状态..."

    echo
    echo "=== 当前数据统计 ==="
    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        SELECT
            'members' as table_name,
            COUNT(*) as record_count
        FROM members
        UNION ALL
        SELECT
            'gift_cards' as table_name,
            COUNT(*) as record_count
        FROM gift_cards
        UNION ALL
        SELECT
            'login_logs' as table_name,
            COUNT(*) as record_count
        FROM login_logs
        UNION ALL
        SELECT
            'second_verifications' as table_name,
            COUNT(*) as record_count
        FROM second_verifications
        UNION ALL
        SELECT
            'checkin_records' as table_name,
            COUNT(*) as record_count
        FROM checkin_records
        UNION ALL
        SELECT
            'user_page_tracking' as table_name,
            COUNT(*) as record_count
        FROM user_page_tracking
        UNION ALL
        SELECT
            'gift_card_categories' as table_name,
            COUNT(*) as record_count
        FROM gift_card_categories;
    "

    echo
    echo "=== 礼品卡分类（将保留） ==="
    docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
        USE gift_card_system;
        SELECT
            id,
            name,
            description,
            created_at
        FROM gift_card_categories
        ORDER BY id;
    "
}

# Main function
main() {
    print_header

    print_warning "此脚本将清空以下用户相关数据："
    print_warning "  - gift_cards (礼品卡数据，但保留分类)"
    print_warning "  - members (用户数据)"
    print_warning "  - login_logs (登录记录)"
    print_warning "  - second_verifications (二次验证记录)"
    print_warning "  - checkin_records (签到记录)"
    print_warning "  - user_page_tracking (用户行为跟踪)"
    echo
    print_message "保留的数据："
    print_message "  - gift_card_categories (礼品卡分类)"
    print_message "  - admins (管理员数据)"
    print_message "  - 其他系统设置"
    echo

    read -p "确认要清空这些数据吗？(y/N): " -n 1 -r
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
    print_warning "开始清空数据..."
    echo

    # Execute clearing operations in correct order (child tables first)
    # 1. Clear user behavior data first
    clear_user_page_tracking
    clear_checkin_records
    clear_second_verifications
    clear_login_logs

    # 2. Clear user data
    clear_members

    # 3. Clear gift cards (independent, but after checkin_records)
    clear_gift_cards

    echo
    print_message "所有数据清空完成！"
    echo

    # Show status after clearing
    show_current_status

    print_message "脚本执行完成"
}

# Execute main function
main "$@"