/**
 * Admin Base Class Definition
 * 定义基础的AdminApp类，供其他模块扩展
 */

class AdminApp {
    constructor() {
        // 基础属性，但不初始化，等待真正的实例化
        this.isLoggingOut = false;
        this.socket = null;
        this.token = null;
        this.currentAdmin = null;
        this.emailPasswordMap = new Map();
    }
}

// 立即暴露到全局，供其他模块扩展
window.AdminApp = AdminApp;