#!/bin/bash

# 数据库重建脚本（推荐：直接删除数据库再重建，彻底解决外键和编码问题）
# 适用于docker compose环境

DB_NAME="gift_card_system"
DB_USER="giftcard_user"
DB_PASS="GiftCard_User_2024!"

# 等待数据库启动
sleep 15

echo "🔄 正在重建数据库..."

# 检查数据库连接
for i in {1..20}; do
    if docker compose exec mysql mysqladmin ping -h localhost -u $DB_USER -p"$DB_PASS" --silent 2>/dev/null; then
        echo "✅ 数据库连接成功"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "❌ 数据库连接失败"
        exit 1
    fi
    sleep 2
done

# 删除并重建数据库，确保utf8mb4编码
cat > /tmp/recreate_db.sql << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

echo "⚠️  正在删除并重建数据库..."
docker compose exec -T mysql mysql -u $DB_USER -p"$DB_PASS" < /tmp/recreate_db.sql

# 导入init.sql（init.sql已包含SET NAMES和USE语句）
echo "🚀 正在执行init.sql初始化数据库..."
docker compose exec -T mysql mysql -u $DB_USER -p"$DB_PASS" < init.sql

# 验证表结构和编码
cat > /tmp/check_encoding.sql << EOF
USE $DB_NAME;
SHOW TABLE STATUS;
SHOW VARIABLES LIKE 'character_set_database';
SHOW VARIABLES LIKE 'collation_database';
EOF
docker compose exec -T mysql mysql -u $DB_USER -p"$DB_PASS" < /tmp/check_encoding.sql

# 清理临时文件
rm -f /tmp/recreate_db.sql /tmp/check_encoding.sql

echo "✅ 数据库重建完成！请刷新页面查看效果。" 