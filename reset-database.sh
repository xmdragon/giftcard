#!/bin/bash

# 数据库重置脚本 - 用于远程环境
# 此脚本将完全删除并重新创建数据库

set -e  # 遇到错误时退出

echo "🚀 开始重置数据库..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
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
print_warning "此操作将完全删除所有数据库数据！"
print_warning "包括：会员数据、礼品卡、管理员账号等所有数据"
echo ""
read -p "确认要继续吗？(输入 'yes' 确认): " confirm

if [ "$confirm" != "yes" ]; then
    print_info "操作已取消"
    exit 0
fi

print_info "停止所有容器..."
docker compose down

print_info "删除 MySQL 数据卷..."
docker volume rm giftcard_mysql_data 2>/dev/null || print_warning "数据卷不存在或已被删除"

print_info "删除 Redis 数据卷..."
docker volume rm giftcard_redis_data 2>/dev/null || print_warning "数据卷不存在或已被删除"

print_info "删除 Nginx 缓存和日志卷..."
docker volume rm giftcard_nginx_cache 2>/dev/null || print_warning "缓存卷不存在或已被删除"
docker volume rm giftcard_nginx_logs 2>/dev/null || print_warning "日志卷不存在或已被删除"

print_info "重新构建并启动服务..."
docker compose up -d --build --force-recreate

print_info "等待服务启动..."
sleep 15

# 检查服务状态
print_info "检查服务状态..."
if docker compose ps | grep -q "Up"; then
    print_success "所有服务已启动"
else
    print_error "服务启动失败，请检查日志"
    docker compose logs
    exit 1
fi

# 等待数据库完全初始化
print_info "等待数据库初始化完成..."
for i in {1..30}; do
    if docker compose exec mysql mysqladmin ping -h localhost -u giftcard_user -p'GiftCard_User_2024!' --silent 2>/dev/null; then
        print_success "数据库连接成功"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "数据库连接超时"
        exit 1
    fi
    sleep 2
done

# 验证数据库表是否正确创建
print_info "验证数据库表..."
if docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "USE gift_card_system; SHOW TABLES;" 2>/dev/null | grep -q "members"; then
    print_success "数据库表创建成功"
else
    print_error "数据库表创建失败"
    exit 1
fi

# 验证中文编码
print_info "验证中文编码..."
if docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "USE gift_card_system; SELECT name FROM gift_card_categories WHERE id = 1;" 2>/dev/null | grep -q "新手礼包"; then
    print_success "中文编码正常"
else
    print_warning "中文编码可能有问题，请检查"
fi

# 测试 API
print_info "测试 API 连接..."
sleep 5
if curl -k -s https://localhost/api/health >/dev/null 2>&1; then
    print_success "API 服务正常"
else
    print_warning "API 服务可能还在启动中"
fi

echo ""
print_success "🎉 数据库重置完成！"
echo ""
print_info "默认管理员账号："
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
print_info "访问地址："
echo "  管理后台: https://localhost/admin.html"
echo "  会员前台: https://localhost/"
echo ""
print_warning "请及时修改默认管理员密码！" 