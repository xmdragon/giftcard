#!/bin/bash

# 数据库中文乱码修复脚本
# 包含之前手动修复的所有步骤

set -e

echo "🔧 开始修复数据库中文乱码..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 确认操作
print_warning "此操作将修复数据库中的中文乱码问题"
print_warning "会删除并重新插入分类数据"
echo ""
read -p "确认要继续吗？(输入 'yes' 确认): " confirm

if [ "$confirm" != "yes" ]; then
    print_info "操作已取消"
    exit 0
fi

# 等待数据库服务启动
print_info "等待数据库服务启动..."
sleep 10

# 检查数据库连接
print_info "检查数据库连接..."
for i in {1..30}; do
    if docker compose exec mysql mysqladmin ping -h localhost -u giftcard_user -p'GiftCard_User_2024!' --silent 2>/dev/null; then
        print_success "数据库连接成功"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "数据库连接失败"
        exit 1
    fi
    sleep 2
done

# 检查当前字符集设置
print_info "检查当前字符集设置..."
docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "SHOW VARIABLES LIKE 'character_set%';"

# 检查当前数据状态
print_info "检查当前数据状态..."
docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "USE gift_card_system; SELECT id, name, description FROM gift_card_categories;"

# 创建修复 SQL 脚本
print_info "创建修复 SQL 脚本..."
cat > /tmp/fix_encoding.sql << 'EOF'
-- 修复中文编码问题
USE gift_card_system;

-- 设置正确的字符集
SET NAMES utf8mb4;

-- 先删除相关的礼品卡数据（因为外键约束）
DELETE FROM gift_cards WHERE category_id IN (1, 2, 3);

-- 删除现有的错误数据
DELETE FROM gift_card_categories WHERE id IN (1, 2, 3);

-- 重新插入正确的中文数据
INSERT INTO gift_card_categories (id, name, description, created_at) VALUES 
(1, '新手礼包', '新用户登录奖励礼品卡', '2025-07-19 10:20:11'),
(2, '签到奖励', '每日签到获得的礼品卡', '2025-07-19 10:20:11'),
(3, '特殊活动', '特殊活动期间的礼品卡', '2025-07-19 10:20:11');

-- 重新插入礼品卡数据
INSERT INTO gift_cards (category_id, code, card_type) VALUES 
(1, 'WELCOME001', 'login'),
(1, 'WELCOME002', 'login'),
(1, 'WELCOME003', 'login'),
(1, 'WELCOME004', 'login'),
(1, 'WELCOME005', 'login'),
(2, 'CHECKIN001', 'checkin'),
(2, 'CHECKIN002', 'checkin'),
(2, 'CHECKIN003', 'checkin'),
(2, 'CHECKIN004', 'checkin'),
(2, 'CHECKIN005', 'checkin'),
(2, 'CHECKIN006', 'checkin'),
(2, 'CHECKIN007', 'checkin'),
(2, 'CHECKIN008', 'checkin'),
(2, 'CHECKIN009', 'checkin'),
(2, 'CHECKIN010', 'checkin');

-- 验证修复结果
SELECT id, name, description FROM gift_card_categories ORDER BY id;
EOF

# 执行修复脚本
print_info "执行数据库修复脚本..."
docker compose exec -T mysql mysql -u giftcard_user -p'GiftCard_User_2024!' < /tmp/fix_encoding.sql

# 验证修复结果
print_info "验证修复结果..."
docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "USE gift_card_system; SET NAMES utf8mb4; SELECT id, name, description FROM gift_card_categories ORDER BY id;"

# 测试 API 响应
print_info "等待应用服务启动..."
sleep 10

print_info "测试 API 中文响应..."
# 获取管理员 token
TOKEN=$(curl -k -s -X POST https://localhost/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    print_success "获取管理员 token 成功"
    
    # 测试分类 API
    print_info "测试分类 API..."
    curl -k -H "Authorization: Bearer $TOKEN" https://localhost/api/admin/gift-card-categories | jq .
else
    print_warning "获取管理员 token 失败，API 可能还在启动中"
fi

# 清理临时文件
rm -f /tmp/fix_encoding.sql

echo ""
print_success "🎉 数据库中文乱码修复完成！"
echo ""
print_info "修复内容："
echo "  ✅ 重新插入了正确的中文分类数据"
echo "  ✅ 重新插入了相关的礼品卡数据"
echo "  ✅ 验证了字符集设置"
echo "  ✅ 测试了 API 响应"
echo ""
print_info "如果前端仍然显示乱码，请："
echo "  1. 强制刷新浏览器页面 (Ctrl+F5)"
echo "  2. 清除浏览器缓存"
echo "  3. 检查前端文件编码是否为 UTF-8"
echo ""
print_info "默认管理员账号："
echo "  用户名: admin"
echo "  密码: admin123" 