/**
 * Admin Base Class Definition
 * 定义基础的AdminApp类，供其他模块扩展
 */

class AdminApp {
    constructor() {
        this.isLoggingOut = false;
        this.socket = null;
        this.token = null;
        this.currentAdmin = null;
        this.emailPasswordMap = new Map();
    }

    hasPermissionPoint(permissionKey) {
        if (this.auth && typeof this.auth.hasPermissionPoint === 'function') {
            return this.auth.hasPermissionPoint(permissionKey);
        }
        if (this.currentAdmin && this.currentAdmin.role === 'super') {
            return true;
        }
        return false;
    }

    hasPermission(section) {
        if (this.auth && typeof this.auth.hasPermission === 'function') {
            return this.auth.hasPermission(section);
        }
        if (this.currentAdmin && this.currentAdmin.role === 'super') {
            return true;
        }
        return false;
    }
}

window.AdminApp = AdminApp;