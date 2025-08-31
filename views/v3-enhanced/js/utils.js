// 工具函数集合
class Utils {
    // 显示错误消息
    static showError(message) {
        let displayMessage = message;
        if (window.i18n && typeof window.i18n.t === 'function') {
            const translated = window.i18n.t(message);
            if (translated && translated !== message) {
                displayMessage = translated;
            }
        }
        
        let statusDiv = document.getElementById('statusMessage');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'statusMessage';
            statusDiv.style.position = 'fixed';
            statusDiv.style.top = '0';
            statusDiv.style.left = '0';
            statusDiv.style.width = '100%';
            statusDiv.style.zIndex = '9999';
            document.body.prepend(statusDiv);
        }
        statusDiv.innerHTML = `<div class="status-message error" style="color:#fff;background:#ff4d4f;padding:10px 16px;margin:0;border-radius:0;text-align:center;">${displayMessage}</div>`;
        clearTimeout(this._errorTimeout);
        this._errorTimeout = setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3500);
    }

    // 显示成功消息
    static showSuccess(message) {
        let displayMessage = message;
        if (window.i18n && typeof window.i18n.t === 'function') {
            const translated = window.i18n.t(message);
            if (translated && translated !== message) {
                displayMessage = translated;
            }
        }
        
        let statusDiv = document.getElementById('statusMessage');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'statusMessage';
            statusDiv.style.position = 'fixed';
            statusDiv.style.top = '0';
            statusDiv.style.left = '0';
            statusDiv.style.width = '100%';
            statusDiv.style.zIndex = '9999';
            document.body.prepend(statusDiv);
        }
        statusDiv.innerHTML = `<div class="status-message success" style="color:#fff;background:#34c759;padding:10px 16px;margin:0;border-radius:0;text-align:center;">${displayMessage}</div>`;
        clearTimeout(this._successTimeout);
        this._successTimeout = setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
    }

    // 显示加载状态
    static showLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }
    }

    // 隐藏加载状态
    static hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }

    // 邮箱验证
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 验证码验证
    static validateVerificationCode(code) {
        return code && code.length === 6 && /^\d{6}$/.test(code);
    }

    // 格式化日期
    static formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    // 掩码邮箱地址
    static maskEmail(email) {
        if (!email || !email.includes('@')) return email;
        
        const [localPart, domain] = email.split('@');
        if (localPart.length <= 3) {
            return localPart + '***@' + domain;
        }
        return localPart.substring(0, 3) + '***@' + domain;
    }

    // 防抖函数
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 复制到剪贴板
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess('已复制到剪贴板');
            return true;
        } catch (err) {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                this.showSuccess('已复制到剪贴板');
                return true;
            } catch (err) {
                this.showError('复制失败');
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }

    // 平滑滚动到元素
    static scrollToElement(element, offset = 0) {
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }

    // 检查元素是否在视口中
    static isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // 生成随机ID
    static generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 本地存储封装
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Storage get error:', e);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Storage remove error:', e);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                console.error('Storage clear error:', e);
                return false;
            }
        }
    };

    // API请求封装
    static async request(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            console.error('Request error:', error);
            return { success: false, error: error.message };
        }
    }

    // 设备检测
    static device = {
        isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },

        isIOS() {
            return /iPad|iPhone|iPod/.test(navigator.userAgent);
        },

        isAndroid() {
            return /Android/.test(navigator.userAgent);
        },

        isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }
    };

    // 时间格式化
    static time = {
        formatRelative(date) {
            const now = new Date();
            const diff = now - date;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) return `${days}天前`;
            if (hours > 0) return `${hours}小时前`;
            if (minutes > 0) return `${minutes}分钟前`;
            return '刚刚';
        },

        formatDuration(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    };
}

// 全局工具函数
window.Utils = Utils;
