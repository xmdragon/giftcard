#!/bin/bash

# Test database connection script

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}测试数据库连接...${NC}"

# Database configuration
MYSQL_CONTAINER="gift_card_mysql"
DB_USER="giftcard_user"
DB_PASSWORD="GiftCard_User_2024!"
DB_NAME="gift_card_system"

# Check if container is running
if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
    echo -e "${RED}错误: 未找到MySQL容器: $MYSQL_CONTAINER${NC}"
    echo "请先启动项目: docker compose up -d"
    exit 1
fi

echo -e "${GREEN}✓ MySQL容器正在运行: $MYSQL_CONTAINER${NC}"

# Test database connection
echo "测试数据库连接..."
if docker exec $MYSQL_CONTAINER mysql -u $DB_USER -p$DB_PASSWORD -e "USE $DB_NAME; SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 数据库连接成功${NC}"
else
    echo -e "${RED}✗ 数据库连接失败${NC}"
    echo "请检查数据库配置:"
    echo "  容器名: $MYSQL_CONTAINER"
    echo "  用户名: $DB_USER"
    echo "  数据库: $DB_NAME"
    exit 1
fi

# Check if related tables exist
echo "检查相关表是否存在..."
TABLES=("admin_ip_restrictions" "ip_blacklist" "admin_login_failures")

for table in "${TABLES[@]}"; do
    if docker exec $MYSQL_CONTAINER mysql -u $DB_USER -p$DB_PASSWORD -e "USE $DB_NAME; DESCRIBE $table;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 表 $table 存在${NC}"
    else
        echo -e "${RED}✗ 表 $table 不存在${NC}"
    fi
done

echo -e "${GREEN}数据库连接测试完成${NC}" 