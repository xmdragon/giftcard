#!/bin/bash

# 管理员登陆防御
# 适用于远程环境快速修复

echo "🔧 添加管理员登陆防御表..."

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

# 创建管理员登陆防御 SQL
echo "增加管理员登陆防御..."
cat > /tmp/fix_db.sql << 'EOF'
USE gift_card_system;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS admin_login_failures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  username VARCHAR(50),
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  failure_type ENUM('wrong_password', 'wrong_captcha', 'wrong_username') DEFAULT 'wrong_password',
  user_agent TEXT,
  INDEX idx_ip_date (ip_address, attempted_at),
  INDEX idx_date (attempted_at)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS admin_ip_restrictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  restriction_type ENUM('temporary', 'permanent') NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  failure_count INT DEFAULT 0,
  reason VARCHAR(255) DEFAULT '',
  status ENUM('active', 'expired', 'removed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_active_ip (ip_address, status),
  INDEX idx_ip_status (ip_address, status),
  INDEX idx_end_time (end_time),
  INDEX idx_type (restriction_type)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF

docker compose exec -T mysql mysql -u giftcard_user -p'GiftCard_User_2024!' < /tmp/fix_db.sql

# 清理临时文件
rm -f /tmp/fix_db.sql

echo "✅ 管理员登陆防御增加完成！"