# 管理员登录安全功能说明

## 功能概述

为了保护管理员账户安全，系统实现了基于IP的多层安全防护机制：

### 1. 安全策略
- **3次错误密码** → 该IP临时禁用1小时
- **当天5次错误密码** → 该IP永久禁用

### 2. 数据库表结构

#### admin_login_failures (登录失败记录表)
- `id` - 主键
- `ip_address` - IP地址
- `username` - 尝试登录的用户名
- `attempted_at` - 尝试时间
- `failure_type` - 失败类型 (wrong_password, wrong_captcha, wrong_username)
- `user_agent` - 用户代理信息

#### admin_ip_restrictions (管理员IP限制表，统一支持临时和永久限制)
- `id` - 主键
- `ip_address` - 被限制的IP地址
- `restriction_type` - 限制类型 (temporary, permanent)
- `start_time` - 限制开始时间
- `end_time` - 限制结束时间 (永久限制为NULL)
- `failure_count` - 失败次数
- `reason` - 限制原因
- `status` - 状态 (active, expired, removed)

## 3. API端点

### 管理员安全相关API (需要管理员登录)

#### 获取登录失败记录
```
GET /api/admin/security/login-failures
```
参数：
- `page` - 页码 (默认: 1)
- `limit` - 每页数量 (默认: 50)
- `ip` - 筛选特定IP
- `days` - 显示最近天数 (默认: 7)

#### 获取IP限制列表
```
GET /api/admin/security/ip-restrictions
```
返回永久和临时限制的IP列表

#### 移除IP限制
```
DELETE /api/admin/security/ip-restrictions/{ip}?type=permanent|temporary
```

#### 手动添加IP限制
```
POST /api/admin/security/ip-restrictions
{
  "ip_address": "192.168.1.100",
  "reason": "恶意攻击",
  "restriction_type": "permanent"  // 或 "temporary"
}
```

#### 获取IP失败统计
```
GET /api/admin/security/ip-stats/{ip}
```

## 4. 工作流程

### 登录验证流程
1. **IP检查** - 验证IP是否在黑名单或临时限制中
2. **验证码检查** - 验证图形验证码
3. **用户名验证** - 检查用户是否存在
4. **密码验证** - 验证密码是否正确
5. **失败记录** - 任何验证失败都会记录到数据库
6. **自动限制** - 根据失败次数自动应用限制

### 限制触发逻辑
- **连续3次密码错误** → 自动临时禁用1小时
- **当天累计5次错误** → 自动永久禁用IP

### 错误提示
- 第1-2次错误：显示基本错误信息
- 第3次及以上：提示剩余尝试次数和后果
- 达到限制：明确显示禁用时间和类型

## 5. 安全特性

### 自动清理
- 系统自动清理过期的临时限制
- 每次IP检查时都会触发清理

### 记录完整性
- 记录所有登录尝试（成功和失败）
- 包含IP、用户代理、时间戳等信息
- 支持按IP、时间范围查询

### 灵活管理
- 管理员可手动移除任何IP限制
- 支持查看详细的失败统计
- 可手动添加IP到黑名单

## 6. 使用示例

### 测试登录安全
```bash
# 1. 正常登录
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","captcha":"XXXX"}'

# 2. 错误密码测试（触发限制）
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong","captcha":"XXXX"}'
```

### 查看安全状态
```bash
# 获取失败记录
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/security/login-failures

# 查看IP限制
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/security/ip-restrictions

# 手动添加IP限制
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip_address":"192.168.1.100","reason":"测试限制","restriction_type":"permanent"}' \
  http://localhost:3000/api/admin/security/ip-restrictions
```

## 7. 配置说明

### 时间限制
- 临时禁用时长：1小时
- 永久禁用触发：当天5次失败

### 验证顺序
1. IP黑名单检查
2. 验证码验证
3. 用户名验证
4. 密码验证

这些配置可以通过修改 `utils/admin-security.js` 中的相关参数进行调整。

## 8. 监控和维护

### 日常监控
- 定期查看登录失败记录
- 监控IP限制列表
- 关注异常登录模式

### 维护建议
- 定期清理历史记录（保留最近30天）
- 审查永久禁用的IP是否需要解封
- 监控系统性能影响