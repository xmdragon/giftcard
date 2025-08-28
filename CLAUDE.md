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

## 项目结构

### 核心文件
- `server.js` - 主服务器文件
- `package.json` - 项目依赖和脚本
- `docker-compose.yml` - Docker 编排配置
- `Dockerfile` - Docker 镜像构建
- `nginx.conf` - Nginx 反向代理配置

### 目录结构
```
├── public/          # 前端静态文件
│   ├── css/         # 样式文件
│   ├── js/          # JavaScript 文件
│   └── vendor/      # 第三方库
├── routes/          # API 路由
├── utils/           # 工具函数
├── views/           # EJS 模板
│   ├── admin/       # 管理员页面
│   ├── member/      # 会员页面
│   └── partials/    # 页面组件
└── locales/         # 多语言文件
```

## 数据库

### 主要数据表
- `members` - 会员信息
- `admins` - 管理员账号
- `gift_cards` - 礼品卡信息
- `gift_card_categories` - 礼品卡分类
- `login_logs` - 登录记录
- `second_verifications` - 二次验证记录
- `checkin_records` - 签到记录
- `ip_blacklist` - IP黑名单
- `system_settings` - 系统设置

## 技术栈

### 后端
- **Node.js** + **Express** - Web 框架
- **Socket.IO** - 实时通信
- **MySQL 2** - 数据库驱动
- **JWT** - 身份认证
- **bcryptjs** - 密码加密
- **i18next** - 国际化

### 前端
- **EJS** - 模板引擎
- **Tailwind CSS** - 样式框架
- **Socket.IO Client** - 实时通信
- **Font Awesome** - 图标库

### 部署
- **Docker** + **Docker Compose** - 容器化
- **Nginx** - 反向代理
- **Let's Encrypt** - SSL 证书

## 开发指南

### 启动开发环境
```bash
# 1. 安装依赖
npm install

# 2. 启动 MySQL (Docker)
docker compose up -d mysql

# 3. 复制环境配置
cp .env.example .env

# 4. 启动开发服务器
npm run dev
```

### 生产部署
```bash
# 完整 Docker 部署
docker compose up -d

# 查看日志
docker compose logs -f app
```

## API 接口

### 认证相关
- `POST /api/auth/member/login` - 会员登录
- `POST /api/auth/member/verify` - 二次验证
- `POST /api/auth/admin/login` - 管理员登录

### 管理员接口
- `GET /api/admin/login-requests` - 获取登录请求
- `POST /api/admin/approve-login/:id` - 审核登录
- `GET /api/admin/verification-requests` - 获取验证请求
- `POST /api/admin/approve-verification/:id` - 审核验证
- `GET /api/admin/members` - 获取会员列表
- `POST /api/admin/gift-cards/batch` - 批量添加礼品卡

### 会员接口
- `POST /api/member/checkin` - 签到
- `GET /api/member/checkin-history/:id` - 签到历史
- `GET /api/member/gift-cards/:id` - 礼品卡历史

## 前端架构

### 模块化 JS
- 管理员功能分布在多个文件（`admin-*.js`）
- 会员功能在 `member.js` 中
- 实时通信在 `socket-client.js` 中

### EJS Partials
- `views/partials/` 中的组件化视图结构
- 头部、导航、脚部等可复用组件

### 响应式设计
- 基于 Tailwind CSS 的响应式布局
- 移动端适配优化

## 国际化

### 语言支持
- 中文 (`zh`)
- 英文 (`en`) 
- 日文 (`ja`)

### 语言文件
- `locales/zh/translation.json` - 中文
- `locales/en/translation.json` - 英文
- `locales/ja/translation.json` - 日文

### 使用方式
```javascript
// 后端
req.t('key')

// 前端
data-i18n="key"
```

## 常见问题

### 数据库连接问题
```bash
# 检查 MySQL 容器状态
docker compose ps mysql

# 查看 MySQL 日志
docker compose logs mysql

# 测试数据库连接
./test-db-connection.sh
```

### 静态资源 404
- 确保 `docker-compose.yml` 中的挂载路径为绝对路径
- 检查 Nginx 配置中的静态资源路径

### 国际化不生效
- 检查页面元素是否有 `data-i18n` 属性
- 确认语言包文件内容完整
- 检查浏览器语言设置

## 安全注意事项

### 密码安全
- 管理员密码使用 bcrypt 加密
- JWT 密钥要足够复杂
- 定期更新密码

### IP 安全
- 启用 IP 黑名单功能
- 监控异常登录行为
- 配置防火墙规则

### HTTPS
- 生产环境必须启用 HTTPS
- 使用 Let's Encrypt 免费证书
- 配置 HTTP 到 HTTPS 重定向