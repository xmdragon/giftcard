# 生产环境清理指南

本目录包含三个清理脚本，用于准备生产环境部署。

## 脚本说明

### 1. `preview-cleanup.sh` - 预览清理
**推荐首先运行此脚本**
```bash
./preview-cleanup.sh
```
- ✅ 安全：只显示文件，不删除任何内容
- 📊 显示当前目录大小和将要删除的文件
- 📋 列出所有要保留的核心文件
- 💡 帮助您了解清理的影响

### 2. `cleanup-production-safe.sh` - 交互式清理
**推荐用于生产环境**
```bash
./cleanup-production-safe.sh
```
- ✅ 安全：每个操作都会询问确认
- 🔧 可选择性删除不同类型的文件
- 📝 详细的操作日志
- 🛡️ 避免误删重要文件

### 3. `cleanup-production.sh` - 全自动清理
**仅在确认安全的情况下使用**
```bash
./cleanup-production.sh
```
- ⚠️  警告：自动删除所有开发文件
- 🚀 快速：一次性清理所有内容
- 💀 危险：需要输入 'YES' 确认

## 清理内容

### 将要删除的文件类型：
- 📄 **文档文件**: `*.md` (README, CLAUDE.md等)
- ⚙️  **开发脚本**: `*.sh` (除清理脚本外)
- 🔧 **开发配置**: `.env`, `.git/`, `.vscode/`等
- 💾 **备份文件**: `*.bak`, `*.backup`, `*.old`
- 📋 **日志文件**: `*.log`
- 🗑️  **临时文件**: `.DS_Store`, `Thumbs.db`
- 🧪 **测试文件**: `test/`, `*.test.js`
- 📦 **锁文件**: `package-lock.json`, `yarn.lock`
- 📝 **JS开发文件**: 备份和开发用JS文件
- 🎨 **CSS开发文件**: 备份和开发用CSS文件

### 保留的核心文件：
- ✅ `server.js` - 主应用程序
- ✅ `package.json` - 依赖配置
- ✅ `docker-compose.yml` - 容器编排
- ✅ `Dockerfile` - 镜像构建
- ✅ `nginx.conf` - 反向代理配置
- ✅ `init.sql` - 数据库初始化
- ✅ `healthcheck.js` - 健康检查
- ✅ `routes/` - API路由
- ✅ `utils/` - 工具函数
- ✅ `views/` - 页面模板
- ✅ `public/` - 静态资源（除开发文件）
- ✅ `ssl/` - SSL证书
- ✅ `node_modules/` - 运行时依赖

## 使用建议

### 1. 开发环境 → 生产环境的完整流程：

```bash
# 1. 预览将要删除的文件
./preview-cleanup.sh

# 2. 交互式清理（推荐）
./cleanup-production-safe.sh

# 3. 确认结果
ls -la
du -sh .
```

### 2. 快速清理（适合CI/CD）：
```bash
# 自动清理（需要确认输入 'YES'）
echo "YES" | ./cleanup-production.sh
```

### 3. 清理后的验证：
```bash
# 检查应用是否正常启动
npm start

# 或使用Docker
docker compose up -d
```

## 注意事项

⚠️  **重要警告**：
- 清理脚本执行后会删除自身
- 建议在Git提交后再执行清理
- 清理前请备份重要的开发文件
- 清理后无法恢复删除的文件

🔒 **安全提示**：
- 首次使用请先运行 `preview-cleanup.sh`
- 生产环境推荐使用 `cleanup-production-safe.sh`
- 确保在正确的项目目录中执行

📊 **空间节省**：
- 清理后可节省约50M+ 的开发文件
- 主要节省来自文档、备份和日志文件
- `node_modules/` 保持不变（可选择是否运行 `npm prune --production`）

## 清理后的目录结构

```
/
├── server.js                 # 主应用
├── package.json              # 生产依赖
├── docker-compose.yml        # 容器配置
├── Dockerfile               # 镜像构建
├── nginx.conf               # Web服务器
├── init.sql                 # 数据库脚本
├── healthcheck.js           # 健康检查
├── routes/                  # API路由
├── utils/                   # 工具函数
├── views/                   # 页面模板
├── public/                  # 静态资源
├── ssl/                     # SSL证书
├── node_modules/            # 运行依赖
└── .production              # 生产环境标识
```

这样的结构最适合生产环境部署，体积小、文件少、安全性高。