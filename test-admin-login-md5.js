const crypto = require('crypto');

function testMd5Password() {
  const password = 'admin123';
  const md5Password = crypto.createHash('md5').update(password).digest('hex');
  
  console.log(`原始密码: ${password}`);
  console.log(`MD5密码: ${md5Password}`);
  console.log(`预期的MD5密码: 0192023a7bbd73250516f069df18b500`);
  console.log(`验证结果: ${md5Password === '0192023a7bbd73250516f069df18b500' ? '成功' : '失败'}`);
}

testMd5Password();