# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

礼品卡发放系统 - 基于 Node.js、Express、MySQL 和 Docker 的双重验证礼品卡发放管理系统，支持实时通知、多语言和签到奖励功能。

## 开发命令

### 本地开发
```bash
# 快速启动（推荐）
./dev-start.sh  # 自动启动MySQL容器并运行应用

# 手动启动
npm install     # 安装依赖
npm run dev     # 启动开发服务器（带nodemon自动重载）
npm start       # 启动生产服务器
```

### Docker 环境
```bash
# 启动所有服务
docker compose up -d

# 查看应用日志
docker compose logs -f app

# 重启应用服务
docker compose restart app

# 停止所有服务
docker compose down
```

### 域名和SSL配置
```bash
# 自动更新域名和SSL（推荐）
./update-domain.sh --auto your-domain.com

# 手动申请SSL证书
./get-ssl-cert.sh your-domain.com your-email@example.com
```

## 系统架构

### 核心技术栈
- **后端**: Node.js + Express 4.18
- **实时通信**: Socket.IO WebSocket
- **数据库**: MySQL 8.0 (连接池)
- **认证**: JWT + bcryptjs
- **国际化**: i18next (中/英/日)
- **模板引擎**: EJS服务端渲染
- **容器化**: Docker Compose + Nginx

### 目录结构
```
├── server.js              # 主入口，包含Socket.IO和Express配置
├── routes/
│   ├── admin.js           # 管理员API (会员管理、礼品卡、IP黑名单)
│   ├── admin-auth.js      # 管理员认证 (登录、验证码、JWT)
│   ├── member.js          # 会员API (签到、礼品卡历史)
│   └── member-auth.js     # 会员认证 (双重验证流程)
├── utils/
│   ├── db.js              # MySQL连接池和查询工具
│   ├── db-init.js         # 数据库初始化
│   └── admin-security.js  # 管理员安全策略 (IP限制、失败记录)
├── views/                 # EJS模板 (支持data-i18n属性)
├── public/
│   ├── js/               # 前端JS模块
│   └── css/              # 样式文件
└── locales/              # i18n语言包 (zh/en/ja)
```

## 核心功能流程

### 双重验证登录流程
1. 会员提交登录 → 创建待审核记录 (`login_logs`)
2. 管理员实时收到通知 (Socket.IO) → 审核通过/拒绝
3. 通过后进入二次验证 → 提交验证码 (`second_verifications`)
4. 管理员审核验证码 → 成功后发放礼品卡

### 管理员安全策略
- 3次密码错误 → IP临时禁用1小时
- 当天5次错误 → IP永久禁用
- 所有失败记录存储在 `admin_login_failures` 表
- IP限制存储在 `admin_ip_restrictions` 表

### 实时通知机制
- WebSocket连接: `/socket.io/`
- 事件: `newLoginRequest`, `newVerificationRequest`
- 管理员界面自动更新待审核列表

## 数据库架构

主要数据表:
- `members` - 会员账户 (包含签到资格时间)
- `login_logs` - 登录请求记录 (待审核/已审核)
- `second_verifications` - 二次验证请求
- `gift_cards` - 礼品卡库存
- `gift_card_categories` - 礼品卡分类
- `checkin_records` - 签到记录
- `admins` - 管理员账户 (super/admin角色)
- `ip_blacklist` - IP黑名单
- `admin_ip_restrictions` - 管理员IP限制

## 环境配置

必需环境变量 (.env):
```
DB_HOST=localhost (Docker中用'mysql')
DB_USER=giftcard_user
DB_PASSWORD=GiftCard_User_2024!
DB_NAME=gift_card_system
JWT_SECRET=your-jwt-secret-key
PORT=3000
NODE_ENV=production/development
```

## API端点

### 管理员API (需JWT认证)
- `GET /api/admin/login-requests` - 待审核登录列表
- `POST /api/admin/approve-login/:id` - 审核登录
- `GET /api/admin/verification-requests` - 待审核验证列表
- `POST /api/admin/approve-verification/:id` - 审核验证
- `POST /api/admin/gift-cards/batch` - 批量添加礼品卡
- `GET /api/admin/security/ip-restrictions` - IP限制列表
- `DELETE /api/admin/security/ip-restrictions/:ip` - 移除IP限制

### 会员API
- `POST /api/auth/member/login` - 会员登录
- `POST /api/auth/member/verify` - 二次验证
- `POST /api/member/checkin` - 每日签到

## 访问入口

- 会员端: http://localhost:3000
- 管理员: http://localhost:3000/admin
- 健康检查: http://localhost:3000/health

默认管理员: admin / admin123

## 注意事项

- 所有密码使用bcryptjs加密存储
- JWT令牌30天过期
- 静态资源通过Nginx缓存
- 数据库使用UTF8MB4支持完整Unicode
- 第一个注册的管理员自动成为超级管理员
- IP地理位置检测使用geoip-lite库