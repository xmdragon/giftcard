#!/bin/bash

# 生产服务器添加语言设置脚本
# 用于在现有的生产数据库中添加 default_language 设置项

echo "=== 生产服务器语言设置添加脚本 ==="
echo "此脚本将在系统设置表中添加 default_language 设置项"
echo ""

# 数据库配置
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-giftcard_user}"
DB_PASSWORD="${DB_PASSWORD:-GiftCard_User_2024!}"
DB_NAME="${DB_NAME:-gift_card_system}"

echo "数据库配置:"
echo "  主机: $DB_HOST"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"
echo ""

# 检查是否在Docker环境中，或者检查Docker容器是否可用
if [ -f /proc/1/cgroup ] && grep -q docker /proc/1/cgroup; then
    DOCKER_ENV=true
elif docker ps | grep -q gift_card_mysql; then
    DOCKER_ENV=true
else
    DOCKER_ENV=false
fi

if [ "$DOCKER_ENV" = true ]; then
    echo "检测到Docker环境，使用Docker命令连接数据库..."
    DOCKER_CONTAINER="gift_card_mysql"
    
    # 检查MySQL容器是否运行
    if ! docker ps | grep -q $DOCKER_CONTAINER; then
        echo "错误: MySQL容器 $DOCKER_CONTAINER 未运行"
        echo "请先启动Docker容器: docker compose up -d"
        exit 1
    fi
    
    echo "使用Docker连接到MySQL容器..."
    
    # 检查设置项是否已存在
    echo "检查 default_language 设置项是否已存在..."
    EXISTING_SETTING=$(docker exec -i $DOCKER_CONTAINER mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "SET NAMES utf8mb4; SELECT COUNT(*) as count FROM system_settings WHERE setting_key = 'default_language';" 2>/dev/null | tail -n 1)
    
    if [ "$EXISTING_SETTING" = "0" ]; then
        echo "设置项不存在，正在添加..."
        
        # 添加语言设置
        docker exec -i $DOCKER_CONTAINER mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "
        SET NAMES utf8mb4;
        INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
        ('default_language', 'auto', '默认语言设置（auto=自动检测，zh=中文，en=英文，ja=日文，ko=韩文）';
        "
        
        if [ $? -eq 0 ]; then
            echo "✅ 语言设置添加成功！"
        else
            echo "❌ 语言设置添加失败！"
            exit 1
        fi
    else
        echo "⚠️  设置项已存在，跳过添加"
    fi
    
    # 显示当前设置
    echo ""
    echo "当前系统设置:"
    docker exec -i $DOCKER_CONTAINER mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "SET NAMES utf8mb4; SELECT setting_key, setting_value, description FROM system_settings WHERE setting_key = 'default_language';" 2>/dev/null
    
else
    echo "使用本地MySQL连接..."
    
    # 检查MySQL客户端是否可用
    if ! command -v mysql &> /dev/null; then
        echo "错误: MySQL客户端未安装"
        echo "请安装MySQL客户端或使用Docker环境"
        exit 1
    fi
    
    # 检查设置项是否已存在
    echo "检查 default_language 设置项是否已存在..."
    EXISTING_SETTING=$(mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "SET NAMES utf8mb4; SELECT COUNT(*) as count FROM system_settings WHERE setting_key = 'default_language';" 2>/dev/null | tail -n 1)
    
    if [ "$EXISTING_SETTING" = "0" ]; then
        echo "设置项不存在，正在添加..."
        
        # 添加语言设置
        mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "
        SET NAMES utf8mb4;
        INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
        ('default_language', 'auto', '默认语言设置（auto=自动检测，zh=中文，en=英文，ja=日文，ko=韩文）';
        "
        
        if [ $? -eq 0 ]; then
            echo "✅ 语言设置添加成功！"
        else
            echo "❌ 语言设置添加失败！"
            exit 1
        fi
    else
        echo "⚠️  设置项已存在，跳过添加"
    fi
    
    # 显示当前设置
    echo ""
    echo "当前系统设置:"
    mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "SET NAMES utf8mb4; SELECT setting_key, setting_value, description FROM system_settings WHERE setting_key = 'default_language';" 2>/dev/null
fi

echo ""
echo "=== 脚本执行完成 ==="
echo ""
echo "说明:"
echo "1. 如果设置项已存在，脚本会跳过添加"
echo "2. 默认值设置为 'auto'（自动检测）"
echo "3. 管理员可以在后台系统设置中修改此值"
echo "4. 支持的值: auto, zh, en, ja, ko"
echo ""
echo "下一步操作:"
echo "1. 重启应用服务器以应用新设置"
echo "2. 登录管理员后台检查系统设置"
echo "3. 测试会员端语言显示功能" 