#!/bin/bash

# 解决中文乱码问题的专用脚本
# 此脚本会强制重新构建所有镜像并重置数据库

set -e

echo "🔧 开始解决中文乱码问题..."

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
print_warning "此操作将完全重新构建所有镜像并重置数据库！"
print_warning "这可能需要较长时间，请耐心等待..."
echo ""
read -p "确认要继续吗？(输入 'yes' 确认): " confirm

if [ "$confirm" != "yes" ]; then
    print_info "操作已取消"
    exit 0
fi

print_info "停止所有容器..."
docker compose down

print_info "删除所有相关镜像..."
docker rmi $(docker images | grep giftcard | awk '{print $3}') 2>/dev/null || print_warning "没有找到相关镜像"

print_info "删除所有数据卷..."
docker volume rm giftcard_mysql_data 2>/dev/null || print_warning "MySQL 数据卷已删除"
docker volume rm giftcard_redis_data 2>/dev/null || print_warning "Redis 数据卷已删除"
docker volume rm giftcard_nginx_cache 2>/dev/null || print_warning "Nginx 缓存卷已删除"
docker volume rm giftcard_nginx_logs 2>/dev/null || print_warning "Nginx 日志卷已删除"

print_info "清理 Docker 缓存..."
docker system prune -f

print_info "强制重新构建所有镜像..."
docker compose build --no-cache

print_info "启动服务..."
docker compose up -d --force-recreate

print_info "等待服务启动..."
sleep 20

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
for i in {1..40}; do
    if docker compose exec mysql mysqladmin ping -h localhost -u giftcard_user -p'GiftCard_User_2024!' --silent 2>/dev/null; then
        print_success "数据库连接成功"
        break
    fi
    if [ $i -eq 40 ]; then
        print_error "数据库连接超时"
        exit 1
    fi
    sleep 2
done

# 验证字符集设置
print_info "验证 MySQL 字符集设置..."
docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "SHOW VARIABLES LIKE 'character_set%';" 2>/dev/null

# 验证中文数据
print_info "验证中文数据..."
docker compose exec mysql mysql -u giftcard_user -p'GiftCard_User_2024!' -e "USE gift_card_system; SELECT id, name, description FROM gift_card_categories;" 2>/dev/null

# 测试 API
print_info "测试 API 连接..."
sleep 10
if curl -k -s https://localhost/api/health >/dev/null 2>&1; then
    print_success "API 服务正常"
else
    print_warning "API 服务可能还在启动中"
fi

# 测试中文 API
print_info "测试中文 API 响应..."
sleep 5
curl -k -H "Authorization: Bearer $(curl -k -s -X POST https://localhost/api/auth/admin/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | jq -r '.token')" https://localhost/api/admin/gift-card-categories | jq .

echo ""
print_success "🎉 中文乱码问题修复完成！"
echo ""
print_info "如果问题仍然存在，请检查："
echo "  1. 浏览器缓存 - 请强制刷新页面 (Ctrl+F5)"
echo "  2. 前端文件编码 - 确保所有 JS 文件都是 UTF-8 编码"
echo "  3. 数据库连接 - 检查应用日志"
echo ""
print_info "默认管理员账号："
echo "  用户名: admin"
echo "  密码: admin123" 