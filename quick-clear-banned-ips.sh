#!/bin/bash

# Quick clear admin banned IPs script
# Simplified version, no confirmation required

set -e

echo "正在清空管理员禁止登录IP表..."

# Get MySQL container name
MYSQL_CONTAINER="gift_card_mysql"

if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
    echo "错误: 未找到MySQL容器: $MYSQL_CONTAINER，请确保项目已启动"
    exit 1
fi

echo "找到MySQL容器: $MYSQL_CONTAINER"

# Clear all related tables
echo "清空管理员IP限制表..."
docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
    USE gift_card_system;
    DELETE FROM admin_ip_restrictions;
    ALTER TABLE admin_ip_restrictions AUTO_INCREMENT = 1;
"

echo "清空IP黑名单表..."
docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
    USE gift_card_system;
    DELETE FROM ip_blacklist;
    ALTER TABLE ip_blacklist AUTO_INCREMENT = 1;
"

echo "清空管理员登录失败记录表..."
docker exec $MYSQL_CONTAINER mysql -u giftcard_user -pGiftCard_User_2024! -e "
    USE gift_card_system;
    DELETE FROM admin_login_failures;
    ALTER TABLE admin_login_failures AUTO_INCREMENT = 1;
"

echo "✓ 所有管理员禁止登录IP表已清空完成！" 