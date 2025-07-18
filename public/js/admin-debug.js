// 管理员登录调试脚本
console.log('管理员登录调试脚本已加载');

// 监听表单提交
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM已加载，设置事件监听器');
    
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        console.log('找到登录表单，添加提交事件监听器');
        
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('表单提交事件触发');
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('adminPassword').value;
            
            console.log(`尝试登录: 用户名=${username}, 密码长度=${password.length}`);
            
            try {
                console.log('发送登录请求...');
                const response = await fetch('/api/auth/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });
                
                console.log(`收到响应: 状态=${response.status}`);
                const data = await response.json();
                console.log('响应数据:', data);
                
                if (response.ok) {
                    console.log('登录成功，保存令牌');
                    localStorage.setItem('adminToken', data.token);
                    console.log('保存管理员信息');
                    localStorage.setItem('adminInfo', JSON.stringify(data.admin));
                    
                    console.log('尝试切换到管理界面');
                    document.getElementById('adminLoginPage').classList.remove('active');
                    document.getElementById('adminDashboard').classList.add('active');
                    
                    console.log('设置管理员用户名');
                    document.getElementById('adminUsername').textContent = data.admin.username;
                    
                    console.log('加载初始数据');
                    // 这里可以调用加载数据的函数
                } else {
                    console.error('登录失败:', data.error);
                    alert(data.error || '登录失败');
                }
            } catch (error) {
                console.error('登录过程中发生错误:', error);
                alert('网络错误，请重试');
            }
        });
    } else {
        console.error('未找到登录表单!');
    }
    
    // 检查页面元素
    console.log('登录页面元素:', document.getElementById('adminLoginPage'));
    console.log('管理界面元素:', document.getElementById('adminDashboard'));
});

// 检查是否已登录
window.addEventListener('load', function() {
    console.log('页面加载完成，检查登录状态');
    
    const token = localStorage.getItem('adminToken');
    if (token) {
        console.log('找到令牌，尝试自动登录');
        
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
        console.log('管理员信息:', adminInfo);
        
        document.getElementById('adminLoginPage').classList.remove('active');
        document.getElementById('adminDashboard').classList.add('active');
        
        if (adminInfo.username) {
            document.getElementById('adminUsername').textContent = adminInfo.username;
        }
        
        console.log('自动登录完成');
    } else {
        console.log('未找到令牌，显示登录页面');
    }
});