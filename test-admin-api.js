const fetch = require('node-fetch');

async function testAdminLoginApi() {
  console.log('开始测试管理员登录API');
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    
    console.log(`响应状态码: ${response.status}`);
    console.log(`响应数据: ${JSON.stringify(data, null, 2)}`);
    
    if (response.ok) {
      console.log('管理员登录API测试成功');
    } else {
      console.log('管理员登录API测试失败');
    }
  } catch (error) {
    console.error('API测试失败:', error);
  }
}

testAdminLoginApi();