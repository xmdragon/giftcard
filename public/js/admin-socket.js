/**
 * Admin Socket.IO Management Module
 * Socket.IO连接和实时通信管理
 */

class AdminSocket {
    constructor(adminApp) {
        this.adminApp = adminApp;
        this.socket = null;
    }

    init() {
        this.socket = io();
        this.setupSocketListeners();
        return this.socket;
    }

    setupSocketListeners() {
        if (!this.socket) return;

        this.socket.on('new-login-request', (data) => {
            const container = document.getElementById('loginRequestsList');
            if (!container) {
                console.warn('[Socket] loginRequestsList 容器不存在，自动刷新登录请求列表');
                this.adminApp.approvals?.loadLoginRequests();
                return;
            }
            this.adminApp.approvals?.addLoginRequest(data);
            this.adminApp.updatePendingCount();
        });

        this.socket.on('new-verification-request', (data) => {
            this.adminApp.approvals?.addVerificationRequest(data);
            this.adminApp.updatePendingCount();
        });
        
        this.socket.on('update-verification-request', (data) => {
            // Clear verification request list
            const container = document.getElementById('verificationRequestsList');
            if (container) {
                container.innerHTML = '<p>Refreshing verification requests...</p>';
                // Reload all verification requests
                setTimeout(() => {
                    this.adminApp.approvals?.loadVerificationRequests();
                }, 100);
            }
        });

        this.socket.on('cancel-login-request', (data) => {
            const requestElement = document.querySelector(`[data-id="${data.id}"]`);
            if (requestElement) {
                requestElement.remove();
                this.adminApp.updatePendingCount();
            }
        });

        this.joinAdminRoom();
    }

    joinAdminRoom() {
        if (this.adminApp.currentAdmin && this.socket) {
            this.socket.emit('join-admin', {
                id: this.adminApp.currentAdmin.id,
                username: this.adminApp.currentAdmin.username,
                role: this.adminApp.currentAdmin.role
            });
        } else {
            console.warn('[Socket] currentAdmin为空，无法加入admin房间');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    reconnect() {
        if (this.socket && !this.socket.connected) {
            this.socket.connect();
        }
    }

    isConnected() {
        return this.socket && this.socket.connected;
    }
}

// Export for use in main admin app
window.AdminSocket = AdminSocket;