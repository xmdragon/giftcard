# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个使用 Node.js、Express、MySQL 和 Docker 构建的礼品卡发放系统。具有双重验证系统、多语言支持和使用 WebSocket 的实时通知功能。

## 开发命令

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器（自动重载）
npm run dev

# 启动生产服务器
npm start
```

### Docker 开发
```bash
# 启动所有服务（MySQL、Redis、Nginx、App）
docker compose up -d

# 查看应用程序日志
docker compose logs -f app

# 重启特定服务
docker compose restart app

# 停止所有服务
docker compose down

# 仅启动 MySQL 用于本地开发
docker compose up -d mysql
```

### SSL 和域名管理
```bash
# 申请 SSL 证书（需要域名指向服务器）
sudo ./get-ssl-cert.sh your-domain.com your-email@example.com

# 更新 nginx.conf 中的域名配置
./update-domain.sh

# 给脚本添加执行权限
chmod +x get-ssl-cert.sh update-domain.sh dev-start.sh
```

## 系统架构

### 技术栈
- **后端**: Node.js + Express + Socket.IO 实时通信
- **数据库**: MySQL 8.0 带连接池
- **前端**: 服务端渲染的 EJS 模板 + 原生 JavaScript
- **国际化**: i18next 基于文件的后端
- **认证**: JWT 令牌 + bcryptjs 密码哈希
- **基础设施**: Docker + Docker Compose + Nginx 反向代理
- **实时通信**: WebSocket 连接用于管理员通知

### 项目结构
```
├── server.js              # 主应用程序入口点
├── routes/                # API 路由处理器
│   ├── admin.js           # 管理面板 API
│   ├── admin-auth.js      # 管理员认证
│   ├── member.js          # 会员 API
│   └── member-auth.js     # 会员认证
├── utils/
│   ├── db.js             # 数据库连接池和查询工具
│   └── db-init.js        # 数据库初始化和配置
├── views/                # EJS 模板
├── public/               # 静态前端资源
│   ├── js/               # 客户端 JavaScript 模块
│   └── css/              # 样式表
├── locales/              # i18n 语言文件（注意：初始可能不存在）
└── init.sql              # 数据库架构初始化
```

### 数据库架构
主要数据表包括：
- `members` - 用户账户和登录跟踪
- `login_logs` - 登录请求审计跟踪
- `second_verifications` - 二次验证请求
- `gift_cards` - 礼品卡库存和分类
- `gift_card_categories` - 礼品卡分类系统
- `checkin_records` - 每日签到奖励跟踪
- `admins` - 管理员用户账户
- `ip_blacklist` - 基于 IP 的访问控制

### 认证流程
1. 会员提交登录凭据
2. 系统创建需要管理员审核的待处理登录请求
3. 管理员审核并批准/拒绝登录尝试
4. 已批准的用户进入二次验证步骤
5. 管理员审核并批准验证码
6. 成功验证的用户获得礼品卡和签到权限

## 核心功能

### 多语言支持
- 使用 i18next 基于 IP 地理位置自动检测语言
- 支持中文（默认）、英文和日文
- 所有 UI 文本使用 `data-i18n` 属性进行动态翻译

### 实时管理员仪表板
- WebSocket 连接为待处理审批提供实时更新
- Socket.IO 处理客户端和服务器之间的实时通知
- 当新请求到达时管理员界面自动更新

### IP 管理系统
- 为所有用户会话自动检测和记录 IP
- 管理员控制的 IP 黑名单功能
- 使用 geoip-lite 进行地理 IP 检测

### 签到奖励系统
- 首次获得礼品卡后激活 7 天签到期
- 从可用库存中每日分发奖励
- 签到资格自动过期

## 环境配置

必需的环境变量：
```bash
DB_HOST=localhost          # 数据库主机（Docker 中使用 'mysql'）
DB_USER=giftcard_user     
DB_PASSWORD=GiftCard_User_2024!
DB_NAME=gift_card_system
JWT_SECRET=your-jwt-secret-key
PORT=3000
NODE_ENV=production        # 本地开发使用 'development'
```

## 访问端点

- **会员界面**: http://localhost:3000
- **管理员面板**: http://localhost:3000/admin
- **健康检查**: http://localhost:3000/health

默认管理员凭据：
- 用户名: `admin`
- 密码: `admin123`

## 开发说明

- 数据库使用 UTF-8 编码支持多语言
- 所有密码在存储前使用 bcryptjs 进行哈希处理
- JWT 令牌包含过期处理和自动刷新
- WebSocket 连接维护持久的管理员通知通道
- 生产环境中静态资源通过 Nginx 反向代理提供服务
- Docker 绑定挂载启用开发期间的实时代码重载