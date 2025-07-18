// 管理员登录修复脚本
document.addEventListener('DOMContentLoaded', function() {
    // 全局变量，使其可以在控制台访问
    window.fixAdminLogin = function() {
        console.log('执行管理员登录修复');
        
        // 检查页面元素
        const loginPage = document.getElementById('adminLoginPage');
        const dashboardPage = document.getElementById('adminDashboard');
        
        console.log('登录页面元素:', loginPage);
        console.log('管理界面元素:', dashboardPage);
        
        // 检查localStorage中的令牌
        const token = localStorage.getItem('adminToken');
        const adminInfo = localStorage.getItem('adminInfo');
        
        console.log('令牌存在:', !!token);
        console.log('管理员信息存在:', !!adminInfo);
        
        if (token && adminInfo) {
            console.log('尝试手动切换到管理界面');
            loginPage.classList.remove('active');
            dashboardPage.classList.add('active');
            
            // 设置管理员用户名
            const adminData = JSON.parse(adminInfo);
            document.getElementById('adminUsername').textContent = adminData.username;
            
            return '已切换到管理界面';
        } else {
            return '未找到登录信息，请先登录';
        }
    };
    
    // 修复登录表单提交事件
    const fixLoginForm = function() {
        const loginForm = document.getElementById('adminLoginForm');
        if (!loginForm) return;
        
        // 移除所有现有的事件监听器
        const clonedForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(clonedForm, loginForm);
        
        // 添加新的事件监听器
        clonedForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('管理员登录表单提交');
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('adminPassword').value;
            
            try {
                const response = await fetch('/api/auth/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    console.log('登录成功，保存令牌');
                    localStorage.setItem('adminToken', data.token);
                    localStorage.setItem('adminInfo', JSON.stringify(data.admin));
                    
                    // 直接操作DOM切换页面
                    document.getElementById('adminLoginPage').classList.remove('active');
                    document.getElementById('adminDashboard').classList.add('active');
                    
                    // 设置管理员用户名
                    document.getElementById('adminUsername').textContent = data.admin.username;
                    
                    // 重新加载页面以确保所有事件绑定正确
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                } else {
                    alert(data.error || '登录失败');
                }
            } catch (error) {
                console.error('登录错误:', error);
                alert('网络错误，请重试');
            }
        });
    };
    
    // 执行修复
    fixLoginForm();
    
    // 检查是否已登录
    const token = localStorage.getItem('adminToken');
    if (token) {
        console.log('检测到令牌，尝试自动登录');
        setTimeout(() => {
            window.fixAdminLogin();
        }, 500);
    }
});