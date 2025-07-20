# 数据库中文乱码修复脚本

## 📋 脚本说明

`fix-db-encoding-simple.sh` - 专门修复数据库中的中文乱码问题

**功能**：快速修复数据库中的中文乱码，重新插入正确的中文数据

## 🚀 使用方法

### 在远程环境使用

```bash
# 1. 上传脚本到服务器
scp fix-db-encoding-simple.sh user@your-server:/path/to/giftcard/

# 2. SSH 连接到服务器
ssh user@your-server

# 3. 进入项目目录并添加执行权限
cd /path/to/giftcard
chmod +x fix-db-encoding-simple.sh

# 4. 执行修复
./fix-db-encoding-simple.sh
```

## 🔧 修复原理

脚本会执行以下操作：
1. 等待数据库服务启动
2. 检查数据库连接
3. 删除错误编码的分类和礼品卡数据
4. 重新插入正确的中文数据
5. 验证修复结果

## ⚠️ 注意事项

- 会删除现有的分类数据（ID 1, 2, 3）和相关的礼品卡数据
- 会重新插入默认的分类和礼品卡数据
- 建议在服务完全启动后执行

## 📞 技术支持

如果问题仍然存在，请检查：
1. 数据库字符集设置是否正确
2. 前端文件编码是否为 UTF-8
3. 浏览器是否正确处理中文 