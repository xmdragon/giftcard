# 用户行为追踪权限系统文档

## 权限概述

用户行为追踪功能已完全集成到现有的权限管理系统中，提供细粒度的权限控制。

## 权限点定义

### 用户追踪权限组 (user-tracking)

| 权限键 | 权限名称 | 说明 |
|--------|----------|------|
| `user-tracking:view` | 查看用户行为 | 查看用户访问记录列表和基本信息 |
| `user-tracking:export` | 导出追踪数据 | 导出用户行为数据为JSON文件 |
| `user-tracking:stats` | 查看追踪统计 | 查看统计分析页面和图表数据 |

## 权限控制层次

### 1. 导航级别权限
- **菜单显示**：只有拥有 `user-tracking:view` 权限的管理员才能看到"用户行为"菜单项
- **页面访问**：无权限用户访问追踪页面时显示权限不足提示

### 2. 功能级别权限
- **访问记录**：需要 `user-tracking:view` 权限才能查看用户访问记录
- **导出功能**：需要 `user-tracking:export` 权限，无权限时导出按钮隐藏
- **统计分析**：需要 `user-tracking:stats` 权限，无权限时显示权限错误

### 3. API级别权限
所有追踪相关API都需要管理员认证和对应权限：

| API端点 | 方法 | 所需权限 | 说明 |
|---------|------|----------|------|
| `/api/tracking/list` | GET | `user-tracking:view` | 获取访问记录列表 |
| `/api/tracking/statistics` | GET | `user-tracking:stats` | 获取统计数据 |
| `/api/tracking/export` | GET | `user-tracking:export` | 导出追踪数据 |
| `/api/tracking/page` | POST | 无需权限 | 前端数据上传接口 |

## 权限分配

### 超级管理员 (super)
- 拥有所有权限，包括用户追踪的所有功能
- 可以为其他管理员分配追踪权限

### 普通管理员 (admin)  
- 默认无用户追踪权限
- 需要超级管理员在权限分配界面中授予相应权限

## 权限分配操作步骤

1. **登录超级管理员**
   - 使用 `admin/admin123` 登录管理后台

2. **进入权限管理**
   - 点击"管理员管理"菜单
   - 点击"权限分配"按钮

3. **分配追踪权限**
   - 选择目标管理员  
   - 在"用户追踪"权限组中勾选需要的权限：
     - ☑ 查看用户行为
     - ☑ 导出追踪数据  
     - ☑ 查看追踪统计
   - 点击"保存权限"

4. **验证权限生效**
   - 目标管理员重新登录
   - 检查"用户行为"菜单是否显示
   - 测试相应功能是否可用

## 权限验证流程

### 前端权限检查
```javascript
// 检查页面访问权限
if (!this.hasPermission('user-tracking:view')) {
    container.innerHTML = '<div class="error">您没有权限查看用户行为数据</div>';
    return;
}

// 检查功能权限
if (this.hasPermission('user-tracking:export')) {
    // 显示导出按钮
} else {
    // 隐藏导出按钮
}
```

### 后端权限验证
```javascript
// API路由权限中间件
router.get('/list', authenticateAdmin, checkPermission('user-tracking:view'), async (req, res) => {
    // 处理请求
});
```

## 错误处理

### 权限不足错误
- **HTTP状态码**: 403 Forbidden
- **错误响应**: 
  ```json
  {
    "error": "权限不足",
    "code": "NO_PERMISSION", 
    "permission": "user-tracking:view"
  }
  ```

### 认证失败错误
- **HTTP状态码**: 401 Unauthorized  
- **错误响应**:
  ```json
  {
    "error": "需要管理员认证"
  }
  ```

## 安全考虑

1. **权限最小化原则**：默认不授予任何追踪权限
2. **分离职责**：查看、导出、统计功能分别控制
3. **API保护**：所有管理员API都需要认证和权限验证
4. **前后端双重验证**：前端隐藏功能，后端拒绝请求
5. **审计追踪**：所有权限变更都有操作记录

## 故障排除

### 常见问题

1. **菜单不显示**
   - 检查是否有 `user-tracking:view` 权限
   - 确认管理员重新登录使权限生效

2. **API返回403错误**
   - 检查请求头是否包含有效的管理员token
   - 确认管理员拥有对应的API权限

3. **导出按钮不显示**
   - 检查是否有 `user-tracking:export` 权限
   - 确认前端权限检查逻辑正确

4. **统计页面显示权限错误**
   - 检查是否有 `user-tracking:stats` 权限
   - 确认统计API权限配置正确

## 测试建议

1. **创建测试管理员**：创建不同权限的管理员账号进行测试
2. **权限边界测试**：测试有权限和无权限的各种场景  
3. **API安全测试**：尝试无认证访问和越权访问
4. **前端隐藏测试**：确认无权限时UI元素正确隐藏