# 礼品卡发放系统 / Gift Card Distribution System

一个完整的礼品卡发放管理系统，支持双重验证、签到奖励和多语言界面。

---

## 📝 模板引擎与国际化
- 前台和后台页面均支持 EJS 模板引擎，所有页面可灵活自定义。
- 所有可见文本均采用 `data-i18n` 属性，支持多语言动态切换。
- 语言包维护在 `locales/` 目录下，支持中文、英文、日文等多语言。

## 🌐 智能语言推荐
- 系统会根据访问者 IP 自动推荐语言（中国用中文、日本用日文，其它默认英文）。
- 用户可手动切换语言，系统会记忆用户选择。

## 👑 管理员权限说明
- 第一个注册的管理员为超级管理员（super），可增删其它管理员。
- 普通管理员（admin）无权管理管理员账号，权限更受限。

## 🛠️ Nginx 配置自动化
- 使用 `update-domain.sh` 可一键批量替换所有 server_name，自动添加 HTTP 跳转 HTTPS，自动检测 SSL 证书路径。
- 支持全自动模式（`--auto`），无需人工输入。
- 静态资源（如 favicon.ico）需通过绝对路径挂载到 Nginx 容器，详见 `docker-compose.yml`。

## 🐞 常见问题与排查
- **静态资源 404**：请确保 `docker-compose.yml` 挂载路径为绝对路径，如 `/home/xxx/public:/public:ro`。
- **国际化不生效**：请检查页面元素是否有 `data-i18n` 属性，语言包内容是否完整。
- **Nginx 配置变更无效**：修改配置后需重启 Nginx 容器，或使用 `update-domain.sh` 脚本自动重启。

---

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

### 🔒 SSL/HTTPS支持
- 自动申请免费SSL证书
- Let's Encrypt集成
- 证书自动续期
- HTTP到HTTPS重定向

### 🚀 Nginx反向代理
- 高性能请求处理
- 静态资源缓存
- 负载均衡支持
- 安全性增强

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

### 2. 自动安装 Docker（可选）

如果你的系统还没有安装 Docker，可以使用我们提供的自动安装脚本：

```bash
# 给脚本添加执行权限
chmod +x install-docker.sh

# 运行安装脚本
sudo ./install-docker.sh
```

### 3. 使用Docker启动（推荐）
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

# 启动MySQL数据库（仅用于开发环境）
# 注意：生产环境应该使用 docker compose up -d 启动所有服务
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

### 生产环境部署步骤

#### 1. 服务器准备
```bash
# 安装Docker（如果未安装）
chmod +x install-docker.sh
sudo ./install-docker.sh

# 克隆项目到服务器
git clone <repository-url>
cd gift-card-system
```

#### 2. 配置修改
```bash
# 修改数据库密码（重要！）
# 编辑 docker-compose.yml 中的：
# - MYSQL_ROOT_PASSWORD
# - MYSQL_PASSWORD
# - DB_PASSWORD

# 设置强密码的JWT密钥
# 编辑 docker-compose.yml 中的 JWT_SECRET
```

#### 3. 域名和SSL配置
```bash
# 更新域名配置
chmod +x update-domain.sh
./update-domain.sh your-domain.com

# 申请SSL证书（域名需要先解析到服务器）
chmod +x get-ssl-cert.sh
sudo ./get-ssl-cert.sh your-domain.com your-email@example.com
```

#### 4. 启动服务
```bash
# 启动所有服务
docker compose up -d

# 检查服务状态
docker compose ps
docker compose logs -f
```

#### 5. 生产环境优化
```bash
# 清理开发文件（可选）
chmod +x cleanup-production-safe.sh
./cleanup-production-safe.sh

# 配置防火墙
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

### 域名配置自动化
使用 `update-domain.sh` 脚本可以：
- 一键批量替换所有 server_name
- 自动添加 HTTP 到 HTTPS 重定向
- 自动检测 SSL 证书路径
- 支持全自动模式（`--auto`参数）

```bash
# 交互式配置
./update-domain.sh

# 自动模式
./update-domain.sh --auto your-domain.com
```

### SSL证书配置
```bash
# 给脚本添加执行权限
chmod +x get-ssl-cert.sh

# 运行SSL证书申请脚本（需要域名已解析到服务器）
sudo ./get-ssl-cert.sh your-domain.com your-email@example.com

# 重启服务以应用SSL配置
docker compose down
docker compose up -d
```

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
4. **登录失败**: 检查IP是否被禁止或数据库连接是否正常
5. **Nginx代理错误**: 检查Nginx配置和容器网络连接

### 日志查看
```bash
# 查看应用日志
docker compose logs app

# 查看数据库日志
docker compose logs mysql

# 查看Nginx日志
docker compose logs nginx

# 实时查看所有日志
docker compose logs -f
```

### 诊断工具
系统提供了自动诊断和修复工具，可以帮助快速解决常见问题：

```bash
# 给脚本添加执行权限
chmod +x debug-and-fix.sh

# 运行诊断工具
./debug-and-fix.sh
```

诊断工具可以：
- 检查所有服务状态
- 验证数据库连接
- 测试应用健康状态
- 显示详细错误日志
- 提供修复建议和自动修复选项

## 管理员安全 / Admin Security

### 管理员权限分级
- **超级管理员 (super)**: 第一个注册的管理员，拥有所有权限
  - 可以创建、删除其他管理员
  - 可以修改系统设置
  - 可以查看所有日志和统计
- **普通管理员 (admin)**: 受限权限
  - 无法管理管理员账号
  - 可以审核会员登录和验证
  - 可以管理礼品卡和分类

### 安全最佳实践
- 定期更新管理员密码
- 监控异常登录行为
- 启用IP黑名单功能
- 限制管理员账号数量
- 定期备份数据库
- 保持系统组件更新

### IP管理和安全
- 系统自动记录所有登录IP
- 管理员可以查看IP登录历史
- 支持手动禁止/解禁IP地址
- 自动检测异常登录模式
- IP黑名单实时生效

## 数据库维护 / Database Maintenance

### 数据库编码问题修复
如果遇到中文乱码问题，可以使用以下脚本：

```bash
# 给脚本添加执行权限
chmod +x fix-db-encoding-simple.sh

# 运行修复脚本
./fix-db-encoding-simple.sh
```

### 数据库重建
```bash
# 完全重建数据库（谨慎使用）
chmod +x rebuild-db.sh
./rebuild-db.sh
```

### 添加系统设置
```bash
# 添加联系方式设置
mysql -u giftcard_user -p gift_card_system < add-contact-settings.sql

# 添加语言设置
chmod +x add-language-setting.sh
./add-language-setting.sh
```

## 生产环境清理 / Production Cleanup

### 清理脚本使用
系统提供了多个清理脚本用于生产环境部署：

```bash
# 预览将要删除的文件（推荐先运行）
chmod +x preview-cleanup.sh
./preview-cleanup.sh

# 交互式安全清理（推荐）
chmod +x cleanup-production-safe.sh
./cleanup-production-safe.sh

# 自动清理（谨慎使用）
chmod +x cleanup-production.sh
./cleanup-production.sh
```

### 清理内容
- 开发文档和说明文件
- 开发脚本和工具
- 临时文件和缓存
- 测试文件和配置
- Git历史和版本控制文件

## 国际化配置 / Internationalization

### 语言检测和推荐
- 系统根据访问者IP自动推荐语言
- 中国IP推荐中文
- 日本IP推荐日文
- 其他地区默认英文
- 用户可手动切换并记忆选择

### 语言包维护
- 语言文件位于 `locales/` 目录
- 支持动态语言切换
- 所有页面文本使用 `data-i18n` 属性
- 新增文本需要在所有语言包中添加对应翻译

### 添加新语言
1. 在 `locales/` 目录创建新的语言文件夹
2. 复制现有语言包并翻译
3. 在系统设置中添加语言选项
4. 更新语言检测逻辑

## 用户跟踪和权限 / User Tracking & Permissions

### 用户数据收集
- 登录IP地址和时间
- 浏览器信息和设备类型
- 签到记录和活动统计
- 礼品卡获取历史

### 隐私保护
- 用户数据仅用于系统功能
- 不会向第三方分享用户信息
- 用户可以查看自己的活动记录
- 管理员访问用户数据需要合理理由

### 数据保留政策
- 登录日志保留90天
- 签到记录永久保留
- IP黑名单记录永久保留
- 用户可以申请删除个人数据

```bash
# 给脚本添加执行权限
chmod +x debug-and-fix.sh

# 运行诊断工具
./debug-and-fix.sh
```

诊断工具可以：
- 检查所有服务状态
- 验证数据库连接
- 测试应用健康状态
- 显示详细错误日志
- 提供修复建议和自动修复选项

## 安全性说明 / Security

### 安全特性
- 双重验证机制防止未授权访问
- JWT 令牌认证保护 API 接口
- IP 黑名单系统阻止恶意访问
- Nginx 反向代理增强安全隔离
- HTTPS 加密保护数据传输安全
- 密码哈希存储防止泄露

### 安全最佳实践
- 定期更新管理员密码
- 监控异常登录行为
- 定期备份数据库
- 保持系统组件更新到最新版本
- 限制管理员账号数量

## 高级配置 / Advanced Configuration

### 自定义 Nginx 配置
可以修改 `nginx.conf` 文件来自定义 Nginx 行为：
- 调整缓存策略
- 配置请求限流
- 自定义错误页面
- 添加安全头部

## 系统架构 / Architecture

### 组件关系图
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Nginx    │────▶│  Node.js    │────▶│   MySQL     │
│  反向代理   │     │  应用服务   │     │  数据库     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   静态资源  │     │  WebSocket  │     │   Redis     │
│   缓存服务  │     │  实时通信   │     │  缓存服务   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 开发说明 / Development

### 项目结构
```
├── public/          # 前端静态文件
│   ├── css/         # 样式文件
│   ├── js/          # JavaScript文件
│   ├── vendor/      # 第三方库
│   └── images/      # 图片资源
├── routes/          # API路由
├── utils/           # 工具函数和数据库操作
├── views/           # EJS模板文件
│   ├── admin/       # 管理员页面
│   ├── member/      # 会员页面
│   └── partials/    # 页面组件
├── locales/         # 多语言文件
├── server.js        # 主服务器文件
├── package.json     # 项目依赖
├── Dockerfile       # Docker配置
├── docker-compose.yml # Docker编排
├── nginx.conf       # Nginx配置
├── init.sql         # 数据库初始化脚本
└── 各种.sh脚本      # 部署和维护工具
```

### 开发环境设置
```bash
# 1. 克隆项目
git clone <repository-url>
cd gift-card-system

# 2. 安装依赖
npm install

# 3. 设置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等

# 4. 启动MySQL（开发环境）
docker compose up -d mysql

# 5. 启动开发服务器
npm run dev
```

### 开发工具脚本
```bash
# 开发环境一键启动
chmod +x dev-start.sh
./dev-start.sh

# SSL开发环境设置
chmod +x dev-ssl-setup.sh
./dev-ssl-setup.sh

# 测试数据库连接
chmod +x test-db-connection.sh
./test-db-connection.sh
```

## 许可证 / License

MIT License

## 贡献 / Contributing

欢迎提交Issue和Pull Request来改进这个项目。

## 联系方式 / Contact

如有问题或建议，请通过Issue联系。