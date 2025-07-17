#!/bin/bash

# 调试和修复管理员登录问题的脚本

echo "开始调试和修复管理员登录问题..."

# 检查数据库连接
echo "检查数据库连接..."
mysql -h mysql -u giftcard_user -p'GiftCard_User_2024!' -e "SELECT 1" gift_card_system
if [ $? -ne 0 ]; then
  echo "数据库连接失败，请检查数据库配置"
  exit 1
fi
echo "数据库连接成功"

# 检查管理员账号
echo "检查管理员账号..."
ADMIN_COUNT=$(mysql -h mysql -u giftcard_user -p'GiftCard_User_2024!' -e "SELECT COUNT(*) FROM admins" gift_card_system 2>/dev/null | tail -n 1)
echo "找到 $ADMIN_COUNT 个管理员账号"

# 重置管理员密码为MD5格式
echo "重置管理员密码为MD5格式..."
MD5_PASSWORD=$(echo -n "admin123" | md5sum | cut -d ' ' -f 1)
echo "MD5密码: $MD5_PASSWORD"

mysql -h mysql -u giftcard_user -p'GiftCard_User_2024!' -e "UPDATE admins SET password='$MD5_PASSWORD' WHERE username='admin'" gift_card_system
if [ $? -ne 0 ]; then
  echo "更新管理员密码失败"
  exit 1
fi
echo "管理员密码已更新为MD5格式"

# 创建独立的管理员登录服务
echo "创建独立的管理员登录服务..."
cat > admin-login-service.js << EOL
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'giftcard_user',
  password: process.env.DB_PASSWORD || 'GiftCard_User_2024!',
  database: process.env.DB_NAME || 'gift_card_system'
};

// 管理员登录路由
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    console.log('管理员登录请求开始处理');
    const { username, password } = req.body;
    console.log(\`尝试登录的管理员用户名: \${username}\`);
    
    // 连接数据库
    console.log('尝试连接数据库...');
    const db = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 准备SQL语句
    const sql = 'SELECT * FROM admins WHERE username = ?';
    const params = [username];
    console.log(\`准备执行SQL: \${sql}, 参数: \${JSON.stringify(params)}\`);
    
    try {
      const [admins] = await db.execute(sql, params);
      console.log(\`查询结果: 找到 \${admins.length} 个匹配的管理员账号\`);
      
      if (admins.length === 0) {
        console.log('未找到匹配的管理员账号');
        await db.end();
        return res.status(400).json({ error: '用户名或密码错误' });
      }

      const admin = admins[0];
      console.log(\`找到管理员账号: ID=\${admin.id}, 用户名=\${admin.username}, 密码哈希=\${admin.password}\`);
      
      // 使用MD5验证密码
      const md5Password = crypto.createHash('md5').update(password).digest('hex');
      console.log(\`输入密码的MD5: \${md5Password}\`);
      console.log(\`数据库中的密码: \${admin.password}\`);
      
      const validPassword = (md5Password === admin.password);
      console.log(\`密码验证结果: \${validPassword ? '成功' : '失败'}\`);
      
      if (!validPassword) {
        await db.end();
        return res.status(400).json({ error: '用户名或密码错误' });
      }

      console.log('生成JWT令牌');
      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: 'admin' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      );

      console.log('管理员登录成功');
      await db.end();
      res.json({
        token,
        admin: { id: admin.id, username: admin.username }
      });
    } catch (dbError) {
      console.error(\`数据库查询错误: \${dbError.message}\`);
      console.error(\`执行的SQL: \${sql}, 参数: \${JSON.stringify(params)}\`);
      console.error('错误堆栈:', dbError.stack);
      await db.end();
      throw dbError;
    }
  } catch (error) {
    console.error('管理员登录错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
});

// 启动服务器
const PORT = 3001;
app.listen(PORT, () => {
  console.log(\`管理员登录服务运行在端口 \${PORT}\`);
});
EOL

echo "独立的管理员登录服务已创建"

# 创建测试脚本
echo "创建测试脚本..."
cat > test-admin-login-service.js << EOL
const axios = require('axios');

async function testAdminLoginService() {
  console.log('开始测试独立的管理员登录服务');
  
  try {
    const response = await axios.post('http://localhost:3001/api/auth/admin/login', {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(\`响应状态码: \${response.status}\`);
    console.log(\`响应数据: \${JSON.stringify(response.data, null, 2)}\`);
    console.log('管理员登录服务测试成功');
    
  } catch (error) {
    console.error('API测试失败:');
    if (error.response) {
      console.error(\`状态码: \${error.response.status}\`);
      console.error(\`响应数据: \${JSON.stringify(error.response.data, null, 2)}\`);
    } else {
      console.error(error.message);
    }
  }
}

setTimeout(testAdminLoginService, 1000);
EOL

echo "测试脚本已创建"

echo "调试和修复完成，请运行以下命令启动独立的管理员登录服务："
echo "node admin-login-service.js"
echo "然后在另一个终端运行以下命令测试服务："
echo "node test-admin-login-service.js"