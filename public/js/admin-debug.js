/**
 * 调试功能模块
 * 包含调试工具、错误处理等功能
 */

// 扩展 AdminApp 类
(function() {
    // 添加调试日志
    AdminApp.prototype.debug = function(message, data) {
        if (window.DEBUG_MODE) {
            console.log(`[DEBUG] ${message}`, data || '');
        }
    };

    // 错误处理
    AdminApp.prototype.handleError = function(error, context) {
        console.error(`[ERROR] ${context}:`, error);
        
        // 在开发模式下显示详细错误
        if (window.DEBUG_MODE) {
            alert(`错误: ${context}\n${error.message || error}`);
        } else {
            // 在生产模式下显示友好错误
            alert('操作失败，请重试或联系管理员');
        }
    };

    // 检查浏览器兼容性
    AdminApp.prototype.checkBrowserCompatibility = function() {
        const issues = [];
        
        // 检查 Fetch API
        if (!window.fetch) {
            issues.push('您的浏览器不支持 Fetch API，请升级浏览器');
        }
        
        // 检查 Promise
        if (!window.Promise) {
            issues.push('您的浏览器不支持 Promise，请升级浏览器');
        }
        
        // 检查 localStorage
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
        } catch (e) {
            issues.push('您的浏览器不支持或禁用了 localStorage，这可能导致登录状态无法保存');
        }
        
        return issues;
    };

    // 显示浏览器兼容性问题
    AdminApp.prototype.showCompatibilityIssues = function() {
        const issues = this.checkBrowserCompatibility();
        if (issues.length > 0) {
            const message = `
                <div class="compatibility-warning">
                    <h3>浏览器兼容性问题</h3>
                    <ul>
                        ${issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                    <p>推荐使用最新版本的 Chrome、Firefox、Edge 或 Safari 浏览器。</p>
                </div>
            `;
            
            const container = document.createElement('div');
            container.className = 'compatibility-container';
            container.innerHTML = message;
            document.body.appendChild(container);
            
            // 5秒后自动关闭
            setTimeout(() => {
                document.body.removeChild(container);
            }, 5000);
        }
    };

    // 初始化调试模式
    if (window.location.search.includes('debug=true')) {
        window.DEBUG_MODE = true;
        console.log('[DEBUG] 调试模式已启用');
    }
})();