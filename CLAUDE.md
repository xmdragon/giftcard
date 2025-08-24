# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

### 开发环境
```bash
# 安装依赖
npm install

# 开发模式启动（热重载）
npm run dev

# 生产模式启动
npm start

# 构建 Tailwind CSS
npx tailwindcss -i tailwind-input.css -o public/css/gc-tailwind.css --watch
```

### Docker 开发
```bash
# 启动所有服务（推荐开发方式）
docker compose up -d

# 仅启动数据库用于本地开发
docker compose up -d mysql

# 查看日志
docker compose logs -f app
docker compose logs -f mysql  
docker compose logs -f nginx

# 停止所有服务
docker compose down
```

### 数据库管理
```bash
# 测试数据库连接
./test-db-connection.sh

# 重建数据库（危险操作）
./rebuild-db.sh

# Docker 数据库初始化
docker compose up -d mysql
# 数据库会自动通过 init.sql 初始化
```

### SSL 开发
```bash
# 设置开发环境 SSL 证书
./dev-ssl-setup.sh

# 生产环境申请 SSL 证书
./get-ssl-cert.sh your-domain.com your-email@example.com
```

### 生产环境脚本
```bash
# 更新域名配置
./update-domain.sh

# 安装 Docker（如需要）
sudo ./install-docker.sh

# 诊断和修复工具
./debug-and-fix.sh
```

## 核心架构

### 主要组件
- **Node.js/Express** - 主应用服务器，使用 EJS 模板引擎
- **MySQL 8.0** - 主数据库，使用 UTF8MB4 字符集
- **Socket.IO** - 实时 WebSocket 通信，用于管理员通知
- **Nginx** - 反向代理和静态文件服务
- **i18next** - 国际化系统，支持文件后端加载

### 关键目录结构
- `routes/` - Express 路由处理器，按功能分离
  - `member-auth.js` - 会员认证和注册
  - `admin-auth.js` - 管理员认证
  - `member.js` - 会员操作（签到、礼品卡）
  - `admin.js` - 管理员管理操作
  - `admin-security.js` - IP 管理和安全控制
  - `tracking.js` - 用户活动追踪
- `utils/` - 数据库工具和初始化
- `views/` - EJS 模板，包含组件化的 partial
- `public/` - 静态资源（CSS、JS、图片、字体）

### 数据库设计
核心表：`members`、`login_logs`、`second_verifications`、`gift_cards`、`gift_card_categories`、`checkin_records`、`admins`、`ip_blacklist`

## 开发工作流

### 认证系统
系统使用**双重验证流程**：
1. 会员登录创建 `login_logs` 记录（等待管理员审核）
2. 管理员通过 WebSocket 实时界面审核登录
3. 会员输入验证码，创建 `second_verifications` 记录
4. 管理员审核验证码
5. 系统签发 JWT 令牌并发放礼品卡

### 实时通信
Socket.IO 处理：
- 管理员的待审核登录/验证通知
- 实时审核状态更新
- 声音通知（`public/snd/notice.mp3`）

### 国际化
- 文件应采用 `locales/{lang}/translation.json` 格式（当前缺失）
- 所有 UI 文本使用 `data-i18n` 属性
- 地理 IP 检测自动选择语言
- 前端：`public/js/i18n.js` 处理客户端翻译

### 安全特性
- IP 黑名单系统（`ip_blacklist` 表）
- JWT 认证，30天过期时间
- 管理员角色层次（超级管理员 vs 普通管理员权限）
- HTTPS/SSL 集成，支持 Let's Encrypt

### 前端架构
- **模块化 JS**：管理员功能分布在多个文件（`admin-*.js`）
- **Tailwind CSS**：自定义配置在 `tailwind.config.js`
- **EJS Partials**：`views/partials/` 中的组件化视图结构
- **响应式设计**：`iphone-adaptation.css` 适配 iPhone

## 重要注意事项

### 环境配置
系统读取 `.env` 文件，但会回退到 Docker Compose 环境变量。关键变量：
- `DB_HOST`、`DB_USER`、`DB_PASSWORD`、`DB_NAME` - 数据库连接
- `JWT_SECRET` - 令牌签名密钥
- `NODE_ENV` - 环境模式
- `PORT` - 应用端口（默认 3000）

### Docker 开发设置
docker-compose.yml 配置了绑定挂载（`.:/app`）以支持开发时的实时代码变更。`/app/node_modules` 卷防止本地 node_modules 冲突。

### 数据库初始化
MySQL 容器在首次启动时会自动运行 `init.sql` 创建表和初始管理员用户（admin/admin123）。

### 多语言支持
当前配置中文（`zh`）为回退语言。i18next 系统期望翻译文件在 `locales/` 目录中，该目录可能需要创建。

### 管理员功能
- 带 WebSocket 更新的实时审核仪表板
- 礼品卡批量管理和分类
- 会员追踪和 IP 管理
- 系统安全控制（IP 封禁、管理员管理）