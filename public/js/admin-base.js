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

    // 权限检查方法的代理
    hasPermissionPoint(permissionKey) {
        if (this.auth && typeof this.auth.hasPermissionPoint === 'function') {
            return this.auth.hasPermissionPoint(permissionKey);
        }
        // 如果auth模块还没有初始化，默认检查超级管理员
        if (this.currentAdmin && this.currentAdmin.role === 'super') {
            return true;
        }
        return false;
    }

    hasPermission(section) {
        if (this.auth && typeof this.auth.hasPermission === 'function') {
            return this.auth.hasPermission(section);
        }
        // 如果auth模块还没有初始化，默认检查超级管理员
        if (this.currentAdmin && this.currentAdmin.role === 'super') {
            return true;
        }
        return false;
    }
}

// 立即暴露到全局，供其他模块扩展
window.AdminApp = AdminApp;