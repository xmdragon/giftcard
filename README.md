# 礼品卡发放系统 / Gift Card Distribution System

一个完整的礼品卡发放管理系统，支持双重验证、签到奖励和多语言界面。

## 功能特性 / Features

### 🔐 双重验证系统
- 会员登录需要管理员确认
- 二次验证码审核机制
- 实时通知和状态更新

### 🎁 礼品卡管理
- 批量添加礼品卡
- 分类管理系统
- 自动发放机制

### ✅ 签到系统
- 7天签到奖励期
- 每日签到礼品卡奖励
- 签到历史记录

### 👥 会员管理
- 自动注册新用户
- 登录IP和时间记录
- 会员活动统计

### 🌍 多语言支持
- 中文、英文、日文
- 基于浏览器语言自动适配
- 动态语言切换

### 🐳 Docker部署
- 完整的容器化方案
- 一键启动部署
- 健康检查机制

### 🛡️ IP管理系统
- IP黑名单管理
- 自动IP检测和记录
- 管理员可禁止/解禁IP
- IP登录历史查看

## 技术栈 / Tech Stack

- **后端**: Node.js + Express + Socket.IO
- **数据库**: MySQL 8.0
- **前端**: HTML5 + CSS3 + JavaScript ES6
- **实时通信**: WebSocket
- **容器化**: Docker + Docker Compose
- **多语言**: i18next

## 快速开始 / Quick Start

### 1. 克隆项目
```bash
git clone <repository-url>
cd gift-card-system
```

### 2. 使用Docker启动（推荐）
```bash
# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f app

# 停止服务
docker compose down
```

### 3. 本地开发启动
```bash
# 安装依赖
npm install

# 复制环境配置
cp .env.example .env

# 启动MySQL数据库（需要本地安装）
# 或使用Docker启动数据库
docker compose up -d mysql

# 启动应用
npm start
```

## 访问系统 / Access

- **会员端**: http://localhost:3000
- **管理端**: http://localhost:3000/admin
- **健康检查**: http://localhost:3000/health

## 默认账号 / Default Accounts

### 管理员账号
- 用户名: `admin`
- 密码: `admin123`

### 测试会员账号
系统支持自动注册，使用任意邮箱和密码即可自动创建新账号。

## 系统流程 / System Flow

### 会员登录流程
1. 会员输入邮箱密码登录
2. 系统记录登录请求，等待管理员审核
3. 管理员在后台审核登录请求
4. 审核通过后，会员进入二次验证页面
5. 会员输入验证码
6. 管理员审核验证码
7. 审核通过后，系统自动发放礼品卡

### 签到系统流程
1. 会员首次获得礼品卡后，获得7天签到资格
2. 每日可进行一次签到
3. 签到成功后获得签到礼品卡（如果有库存）
4. 7天期限过后，签到资格失效

## 管理功能 / Admin Features

### 待审核管理
- 实时显示登录请求
- 实时显示验证请求
- 一键批准/拒绝操作

### 会员管理
- 查看所有会员信息
- 登录统计和签到统计
- 礼品卡获得记录

### 礼品卡管理
- 批量添加礼品卡
- 按分类和状态筛选
- 发放记录追踪

### 分类管理
- 创建礼品卡分类
- 分类描述管理

## 数据库结构 / Database Schema

### 主要数据表
- `members` - 会员信息
- `login_logs` - 登录记录
- `second_verifications` - 二次验证记录
- `gift_cards` - 礼品卡信息
- `gift_card_categories` - 礼品卡分类
- `checkin_records` - 签到记录
- `admins` - 管理员账号

## 环境变量 / Environment Variables

```bash
# 数据库配置
DB_HOST=localhost
DB_USER=giftcard_user
DB_PASSWORD=giftcard_password
DB_NAME=gift_card_system

# JWT密钥
JWT_SECRET=your-super-secret-jwt-key

# 服务器端口
PORT=3000

# 环境
NODE_ENV=production
```

## API接口 / API Endpoints

### 认证接口
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
- `GET /api/admin/ip-blacklist` - 获取IP黑名单
- `POST /api/admin/ban-ip` - 禁止IP地址
- `POST /api/admin/unban-ip/:id` - 解禁IP地址
- `GET /api/admin/ip-history/:ip` - 查看IP登录历史

### 会员接口
- `POST /api/member/checkin` - 签到
- `GET /api/member/checkin-history/:id` - 签到历史
- `GET /api/member/gift-cards/:id` - 礼品卡历史

## 部署说明 / Deployment

### 生产环境部署
1. 修改 `docker-compose.yml` 中的密码配置
2. 设置强密码的JWT_SECRET
3. 配置反向代理（Nginx）
4. 启用HTTPS
5. 配置防火墙规则

### 性能优化
- 使用Redis缓存会话
- 数据库索引优化
- 静态资源CDN
- 负载均衡配置

## 故障排除 / Troubleshooting

### 常见问题
1. **数据库连接失败**: 检查MySQL服务状态和连接配置
2. **Socket连接失败**: 检查防火墙和端口配置
3. **礼品卡发放失败**: 检查礼品卡库存和分类配置

### 日志查看
```bash
# 查看应用日志
docker compose logs app

# 查看数据库日志
docker compose logs mysql

# 实时查看日志
docker compose logs -f
```

## 开发说明 / Development

### 项目结构
```
├── public/          # 前端静态文件
├── routes/          # API路由
├── locales/         # 多语言文件
├── server.js        # 主服务器文件
├── package.json     # 项目依赖
├── Dockerfile       # Docker配置
└── docker-compose.yml # Docker编排
```

### 开发环境
```bash
# 安装开发依赖
npm install --include=dev

# 启动开发模式
npm run dev
```

## 许可证 / License

MIT License

## 贡献 / Contributing

欢迎提交Issue和Pull Request来改进这个项目。

## 联系方式 / Contact

如有问题或建议，请通过Issue联系。