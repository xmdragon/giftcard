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
    
    console.log(`响应状态码: ${response.status}`);
    console.log(`响应数据: ${JSON.stringify(response.data, null, 2)}`);
    console.log('管理员登录服务测试成功');
    
  } catch (error) {
    console.error('API测试失败:');
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(error.message);
    }
  }
}

testAdminLoginService();