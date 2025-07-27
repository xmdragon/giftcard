#!/bin/bash

# 预览清理脚本 - 只显示将要删除的文件，不实际删除

echo "=== 生产环境清理预览 ==="
echo "当前目录：$(pwd)"
echo "此脚本只显示将要删除的文件，不会实际删除"
echo ""

# 显示目录大小
echo "当前目录大小："
du -sh . 2>/dev/null || echo "无法计算目录大小"
echo ""

echo "=== 将要删除的文件类型 ==="
echo ""

# 1. 文档文件
echo "📄 文档文件："
ls -la README.md README_FIX.md ADMIN-SECURITY.md USER_TRACKING_PERMISSIONS.md DEV_SSL_GUIDE.md CLAUDE.md CLEARUP_GUIDE.md 2>/dev/null || echo "  无文档文件"
echo ""

# 2. 开发脚本
echo "⚙️  开发脚本："
find . -name "*.sh" -not -name "cleanup-production*.sh" -not -name "preview-cleanup.sh" -type f 2>/dev/null || echo "  无开发脚本"
echo ""

# 3. 开发配置文件
echo "🔧 开发配置文件："
ls -la .env .gitignore .gitattributes .editorconfig 2>/dev/null || echo "  无开发配置文件"
if [ -d ".git" ]; then echo "  .git/ (版本控制目录)"; fi
if [ -d ".vscode" ]; then echo "  .vscode/ (VS Code配置)"; fi
if [ -d ".idea" ]; then echo "  .idea/ (IDE配置)"; fi
echo ""

# 4. 备份文件
echo "💾 备份文件："
find . -name "*.bak" -o -name "*.backup" -o -name "*.old" -type f 2>/dev/null || echo "  无备份文件"
echo ""

# 5. 日志文件
echo "📋 日志文件："
find . -name "*.log" -type f 2>/dev/null || echo "  无日志文件"
echo ""

# 6. 临时文件
echo "🗑️  临时文件："
find . -name ".DS_Store" -o -name "Thumbs.db" -o -name "*.tmp" -type f 2>/dev/null || echo "  无临时文件"
echo ""

# 7. 测试文件
echo "🧪 测试文件："
if [ -d "test" ] || [ -d "tests" ] || [ -d "spec" ]; then
    ls -la test/ tests/ spec/ 2>/dev/null
fi
find . -name "*.test.js" -o -name "*.spec.js" -type f 2>/dev/null || echo "  无测试文件"
echo ""

# 8. 包管理器锁文件
echo "📦 包管理器锁文件："
ls -la package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null || echo "  无锁文件"
echo ""

# 9. JS开发文件
echo "📝 JS开发文件："
ls -la public/js/README-MODULES.md public/js/admin-core.js.backup public/js/app.js.bak public/js/i18n_updated.js 2>/dev/null || echo "  无JS开发文件"
echo ""

# 10. CSS开发文件
echo "🎨 CSS开发文件："
ls -la public/css/combined.bak public/css/login-fix.css 2>/dev/null || echo "  无CSS开发文件"
echo ""

echo "=== 将保留的核心文件 ==="
echo ""
echo "✅ 保留文件："
echo "  - server.js (主应用)"
echo "  - package.json (依赖配置)"
echo "  - docker-compose.yml (容器配置)"
echo "  - Dockerfile (镜像配置)"
echo "  - nginx.conf (Web服务器配置)"
echo "  - init.sql (数据库初始化)"
echo "  - healthcheck.js (健康检查)"
echo "  - routes/ (API路由)"
echo "  - utils/ (工具函数)" 
echo "  - views/ (页面模板)"
echo "  - public/ (静态资源，除开发文件)"
echo "  - ssl/ (SSL证书，如果存在)"
echo "  - node_modules/ (运行时依赖)"
echo ""

# 计算可能节省的空间
echo "=== 空间分析 ==="
total_size=0

# 计算node_modules大小
if [ -d "node_modules" ]; then
    node_modules_size=$(du -sh node_modules/ 2>/dev/null | cut -f1)
    echo "node_modules/ 大小: $node_modules_size"
fi

# 计算开发文件大小
dev_files_size=$(find . -name "*.md" -o -name "*.bak" -o -name "*.backup" -o -name "*.old" -o -name "*.log" -type f -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1)
if [ -n "$dev_files_size" ] && [ "$dev_files_size" != "0" ]; then
    echo "开发文件预计大小: $dev_files_size"
fi

echo ""
echo "要执行实际清理，请运行："
echo "  ./cleanup-production.sh (全自动清理)"
echo "  或"  
echo "  ./cleanup-production-safe.sh (交互式清理)"
