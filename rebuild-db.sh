#!/bin/bash

# 数据库重建脚本
# 删除所有数据表后，按init.sql内容重建数据库，确保utf8mb4编码
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

# 生成删除所有表的SQL
cat > /tmp/drop_all_tables.sql << EOF
USE $DB_NAME;
SET FOREIGN_KEY_CHECKS = 0;
EOF
docker compose exec mysql mysql -u $DB_USER -p"$DB_PASS" -N -e "SELECT CONCAT('DROP TABLE IF EXISTS `', table_name, '`;') FROM information_schema.tables WHERE table_schema = '$DB_NAME';" >> /tmp/drop_all_tables.sql
echo "SET FOREIGN_KEY_CHECKS = 1;" >> /tmp/drop_all_tables.sql

echo "⚠️  正在删除所有数据表..."
docker compose exec -T mysql mysql -u $DB_USER -p"$DB_PASS" < /tmp/drop_all_tables.sql

# 执行init.sql重建数据库结构和初始数据
# 确保init.sql首行有: CREATE DATABASE IF NOT EXISTS ... DEFAULT CHARACTER SET utf8mb4;

echo "🚀 正在执行init.sql初始化数据库..."
# 使用与fix-db-encoding-simple.sh相同的方式处理编码
cat > /tmp/init_temp.sql << 'EOF'
SET NAMES utf8mb4;
EOF
cat init.sql >> /tmp/init_temp.sql
docker compose exec -T mysql mysql -u $DB_USER -p"$DB_PASS" < /tmp/init_temp.sql

# 验证表结构和编码
cat > /tmp/check_encoding.sql << EOF
USE $DB_NAME;
SHOW TABLE STATUS;
SHOW VARIABLES LIKE 'character_set_database';
SHOW VARIABLES LIKE 'collation_database';
EOF
docker compose exec -T mysql mysql -u $DB_USER -p"$DB_PASS" < /tmp/check_encoding.sql

# 清理临时文件
rm -f /tmp/drop_all_tables.sql /tmp/check_encoding.sql /tmp/init_temp.sql

echo "✅ 数据库重建完成！请刷新页面查看效果。" 