#!/bin/bash

# Show admin banned IPs status script

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  管理员禁止登录IP状态查看${NC}"
echo -e "${BLUE}================================${NC}"
echo

# Get MySQL container name
MYSQL_CONTAINER="gift_card_mysql"

if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
    echo -e "${RED}错误: 未找到MySQL容器: $MYSQL_CONTAINER，请确保项目已启动${NC}"
    exit 1
fi

echo -e "${GREEN}找到MySQL容器: $MYSQL_CONTAINER${NC}"
echo

# Show admin IP restrictions table status
echo -e "${YELLOW}=== 管理员IP限制表状态 ===${NC}"
docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
    USE gift_card_system;
    SELECT 
        ip_address as 'IP地址',
        restriction_type as '限制类型',
        status as '状态',
        reason as '原因',
        start_time as '开始时间',
        end_time as '结束时间'
    FROM admin_ip_restrictions 
    WHERE status = 'active'
    ORDER BY start_time DESC;
"

echo
echo -e "${YELLOW}=== IP黑名单表状态 ===${NC}"
docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
    USE gift_card_system;
    SELECT 
        ip_address as 'IP地址',
        reason as '原因',
        status as '状态',
        banned_at as '禁止时间'
    FROM ip_blacklist 
    WHERE status = 'active'
    ORDER BY banned_at DESC;
"

echo
echo -e "${YELLOW}=== 管理员登录失败记录统计 ===${NC}"
docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
    USE gift_card_system;
    SELECT 
        COUNT(*) as '总失败次数',
        COUNT(DISTINCT ip_address) as '唯一IP数',
        COUNT(DISTINCT username) as '唯一用户名数'
    FROM admin_login_failures;
"

echo
echo -e "${YELLOW}=== 最近10条登录失败记录 ===${NC}"
docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
    USE gift_card_system;
    SELECT 
        ip_address as 'IP地址',
        username as '用户名',
        failure_type as '失败类型',
        attempted_at as '尝试时间'
    FROM admin_login_failures 
    ORDER BY attempted_at DESC 
    LIMIT 10;
"

echo
echo -e "${GREEN}状态查看完成${NC}" 