#!/bin/bash

# 生产环境清理脚本
# 删除开发环境文件、文档、脚本等，只保留生产环境必需的文件
# 注意：此脚本执行后会删除自己

echo "=== 生产环境清理脚本 ==="
echo "警告：此操作将删除所有开发文件，仅保留生产环境必需文件"
echo "请确认您在正确的目录中：$(pwd)"
echo ""

# 确认操作
read -p "确认执行清理操作？(输入 'YES' 确认): " confirm
if [ "$confirm" != "YES" ]; then
    echo "操作已取消"
    exit 1
fi

echo ""
echo "开始清理..."

# 删除文档文件
echo "删除文档文件..."
rm -f README.md
rm -f README_FIX.md
rm -f ADMIN-SECURITY.md
rm -f USER_TRACKING_PERMISSIONS.md
rm -f DEV_SSL_GUIDE.md
rm -f CLAUDE.md
rm -f CLEARUP_GUIDE.md

# 删除开发脚本
echo "删除开发脚本..."
rm -f dev-start.sh
rm -f dev-ssl-setup.sh
rm -f get-ssl-cert.sh
rm -f update-domain.sh
rm -f admin_login.sh
rm -f fix-db-encoding-simple.sh
rm -f install-docker.sh
rm -f rebuild-db.sh

# 删除开发配置文件
echo "删除开发配置文件..."
rm -f .env

# 删除备份文件
echo "删除备份文件..."
find . -name "*.bak" -type f -delete
find . -name "*.backup" -type f -delete
find . -name "*.old" -type f -delete

# 删除CSS备份和开发文件
echo "删除CSS开发文件..."
rm -f public/css/combined.bak
rm -f public/css/login-fix.css

# 删除JS开发文件
echo "删除JS开发文件..."
rm -f public/js/README-MODULES.md
rm -f public/js/admin-core.js.backup
rm -f public/js/app.js.bak
rm -f public/js/i18n_updated.js

# 删除日志文件
echo "删除日志文件..."
rm -f server.log
rm -f *.log
rm -f logs/*.log 2>/dev/null || true

# 删除临时文件
echo "删除临时文件..."
rm -f .DS_Store
find . -name ".DS_Store" -type f -delete
rm -f Thumbs.db
find . -name "Thumbs.db" -type f -delete

# 删除node_modules中的开发依赖（可选，如果需要减少体积）
# echo "清理node_modules开发依赖..."
# npm prune --production

# 删除git相关文件（如果存在）
echo "删除版本控制文件..."
rm -rf .git
rm -f .gitignore
rm -f .gitattributes

# 删除编辑器配置文件
echo "删除编辑器配置文件..."
rm -f .vscode/
rm -f .idea/
rm -f *.sublime-*
rm -f .editorconfig

# 删除包管理器锁文件（保留package.json，删除锁文件减少体积）
echo "删除包管理器锁文件..."
rm -f package-lock.json
rm -f yarn.lock
rm -f pnpm-lock.yaml

# 删除测试文件
echo "删除测试文件..."
rm -rf test/
rm -rf tests/
rm -rf spec/
rm -f *.test.js
rm -f *.spec.js

# 创建生产环境标识文件
echo "创建生产环境标识..."
echo "PRODUCTION=true" > .production
echo "# 此文件标识当前环境为生产环境" >> .production
echo "# 清理时间: $(date)" >> .production

# 显示剩余的重要文件
echo ""
echo "=== 清理完成 ==="
echo "保留的主要文件："
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
echo "- ssl/ (SSL证书)"
echo ""

# 显示目录大小
echo "当前目录大小："
du -sh . 2>/dev/null || echo "无法计算目录大小"

echo ""
echo "清理完成！现在删除此脚本文件..."

# 删除自己
rm -f "$0"

echo "生产环境准备就绪！"
