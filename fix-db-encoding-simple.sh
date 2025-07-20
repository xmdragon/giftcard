#!/bin/bash

# 简化版数据库中文乱码修复脚本
# 适用于远程环境快速修复

echo "🔧 修复数据库中文乱码..."

# 等待数据库启动
sleep 15

# 检查数据库连接
echo "检查数据库连接..."
for i in {1..20}; do
    if docker compose exec mysql mysqladmin ping -h localhost -u giftcard_user -p'GiftCard_User_2024!' --silent 2>/dev/null; then
        echo "✅ 数据库连接成功"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "❌ 数据库连接失败"
        exit 1
    fi
    sleep 2
done

# 创建并执行修复 SQL
echo "执行数据库修复..."
cat > /tmp/fix_db.sql << 'EOF'
USE gift_card_system;
SET NAMES utf8mb4;
DELETE FROM gift_cards WHERE category_id IN (1, 2, 3);
DELETE FROM gift_card_categories WHERE id IN (1, 2, 3);
INSERT INTO gift_card_categories (id, name, description, created_at) VALUES 
(1, '新手礼包', '新用户登录奖励礼品卡', '2025-07-19 10:20:11'),
(2, '签到奖励', '每日签到获得的礼品卡', '2025-07-19 10:20:11'),
(3, '特殊活动', '特殊活动期间的礼品卡', '2025-07-19 10:20:11');
INSERT INTO gift_cards (category_id, code, card_type) VALUES 
(1, 'WELCOME001', 'login'), (1, 'WELCOME002', 'login'), (1, 'WELCOME003', 'login'), (1, 'WELCOME004', 'login'), (1, 'WELCOME005', 'login'),
(2, 'CHECKIN001', 'checkin'), (2, 'CHECKIN002', 'checkin'), (2, 'CHECKIN003', 'checkin'), (2, 'CHECKIN004', 'checkin'), (2, 'CHECKIN005', 'checkin'),
(2, 'CHECKIN006', 'checkin'), (2, 'CHECKIN007', 'checkin'), (2, 'CHECKIN008', 'checkin'), (2, 'CHECKIN009', 'checkin'), (2, 'CHECKIN010', 'checkin');
SELECT id, name, description FROM gift_card_categories ORDER BY id;
EOF

docker compose exec -T mysql mysql -u giftcard_user -p'GiftCard_User_2024!' < /tmp/fix_db.sql

# 验证结果
echo "验证修复结果..."
docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "USE gift_card_system; SET NAMES utf8mb4; SELECT id, name, description FROM gift_card_categories;"

# 清理临时文件
rm -f /tmp/fix_db.sql

echo "✅ 数据库中文乱码修复完成！"
echo "请刷新浏览器页面查看效果" 