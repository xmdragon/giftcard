#!/bin/bash

# 生产环境安全清理脚本
# 提供分步清理选项，避免误删重要文件

echo "=== 生产环境安全清理脚本 ==="
echo "当前目录：$(pwd)"
echo ""

# 显示目录大小
echo "清理前目录大小："
du -sh . 2>/dev/null || echo "无法计算目录大小"
echo ""

# 函数：询问是否执行操作
ask_confirm() {
    local message="$1"
    read -p "$message (y/N): " choice
    case "$choice" in 
        y|Y|yes|YES ) return 0;;
        * ) return 1;;
    esac
}

# 1. 删除文档文件
if ask_confirm "删除文档文件 (README.md, CLAUDE.md, *.md)"; then
    echo "删除文档文件..."
    rm -f README.md README_FIX.md ADMIN-SECURITY.md USER_TRACKING_PERMISSIONS.md DEV_SSL_GUIDE.md CLAUDE.md CLEARUP_GRUID.md
    echo "✓ 文档文件已删除"
fi

# 2. 删除开发脚本
if ask_confirm "删除开发脚本 (*.sh 除了本脚本)"; then
    echo "删除开发脚本..."
    find . -name "*.sh" -not -name "cleanup-production*.sh" -type f -delete
    echo "✓ 开发脚本已删除"
fi

# 3. 删除开发配置
if ask_confirm "删除开发配置文件 (.env, .gitignore等)"; then
    echo "删除开发配置文件..."
    rm -f .env .gitignore .gitattributes .editorconfig
    rm -rf .git .vscode .idea
    echo "✓ 开发配置文件已删除"
fi

# 4. 删除备份文件
if ask_confirm "删除备份文件 (*.bak, *.backup, *.old)"; then
    echo "删除备份文件..."
    find . -name "*.bak" -o -name "*.backup" -o -name "*.old" -type f -delete
    echo "✓ 备份文件已删除"
fi

# 5. 删除日志文件
if ask_confirm "删除日志文件 (*.log)"; then
    echo "删除日志文件..."
    find . -name "*.log" -type f -delete
    echo "✓ 日志文件已删除"
fi

# 6. 删除临时文件
if ask_confirm "删除临时文件 (.DS_Store, Thumbs.db等)"; then
    echo "删除临时文件..."
    find . -name ".DS_Store" -o -name "Thumbs.db" -o -name "*.tmp" -type f -delete
    echo "✓ 临时文件已删除"
fi

# 7. 删除测试文件
if ask_confirm "删除测试文件 (test/, *.test.js等)"; then
    echo "删除测试文件..."
    rm -rf test/ tests/ spec/
    find . -name "*.test.js" -o -name "*.spec.js" -type f -delete
    echo "✓ 测试文件已删除"
fi

# 8. 删除包管理器锁文件
if ask_confirm "删除包管理器锁文件 (package-lock.json, yarn.lock等)"; then
    echo "删除包管理器锁文件..."
    rm -f package-lock.json yarn.lock pnpm-lock.yaml
    echo "✓ 锁文件已删除"
fi

# 9. 清理JS开发文件
if ask_confirm "删除JS开发文件 (README-MODULES.md, *.backup等)"; then
    echo "删除JS开发文件..."
    rm -f public/js/README-MODULES.md
    rm -f public/js/admin-core.js.backup
    rm -f public/js/app.js.bak
    rm -f public/js/i18n_updated.js
    echo "✓ JS开发文件已删除"
fi

# 10. 清理CSS开发文件  
if ask_confirm "删除CSS开发文件 (combined.bak, login-fix.css等)"; then
    echo "删除CSS开发文件..."
    rm -f public/css/combined.bak
    rm -f public/css/login-fix.css
    echo "✓ CSS开发文件已删除"
fi

# 11. 运行npm生产环境清理
if ask_confirm "运行 npm prune --production (删除开发依赖)"; then
    echo "清理npm开发依赖..."
    npm prune --production
    echo "✓ npm开发依赖已清理"
fi

# 12. 创建生产环境标识
if ask_confirm "创建生产环境标识文件"; then
    echo "创建生产环境标识..."
    cat > .production << EOF
PRODUCTION=true
# 此文件标识当前环境为生产环境
# 清理时间: $(date)
# 清理脚本: $0
EOF
    echo "✓ 生产环境标识已创建"
fi

echo ""
echo "=== 清理完成 ==="
echo "清理后目录大小："
du -sh . 2>/dev/null || echo "无法计算目录大小"

echo ""
echo "保留的核心文件："
echo "- server.js (主应用)"
echo "- package.json (依赖配置)" 
echo "- docker-compose.yml (容器配置)"
echo "- Dockerfile (镜像配置)"
echo "- nginx.conf (Web服务器配置)"
echo "- init.sql (数据库初始化)"
echo "- healthcheck.js (健康检查)"
echo "- routes/ (API路由)"
echo "- utils/ (工具函数)"
echo "- views/ (页面模板)"
echo "- public/ (静态资源)"
echo "- ssl/ (SSL证书，如果存在)"
echo "- node_modules/ (运行时依赖)"

echo ""
if ask_confirm "删除清理脚本自身"; then
    echo "删除清理脚本..."
    rm -f cleanup-production.sh cleanup-production-safe.sh
    echo "清理脚本已删除，生产环境准备就绪！"
else
    echo "清理脚本已保留"
fi
