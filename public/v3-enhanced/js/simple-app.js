// 简化版应用 - 确保基本功能正常
document.addEventListener('DOMContentLoaded', function() {
    console.log('v3-enhanced page loaded');
    
    // 初始化国际化
    initializeI18n();
    
    // 语言切换功能
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        // 设置初始语言选择
        languageSelect.value = getCurrentLanguage();
        
        languageSelect.addEventListener('change', function() {
            const selectedLang = this.value;
            console.log('Language changed to:', selectedLang);
            changeLanguage(selectedLang);
        });
    }
    
    // 表单功能
    const loginForm = document.querySelector('form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submitted');
        });
    }
    
    // 密码显示/隐藏
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
});

// 初始化国际化功能
function initializeI18n() {
    // 获取当前语言
    const currentLang = getCurrentLanguage();
    
    // 应用翻译
    applyTranslations(currentLang);
}

// 获取当前语言
function getCurrentLanguage() {
    // 优先使用本地存储的语言设置
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) return savedLang;
    
    // 其次使用服务器推荐的语言
    if (typeof recommendLang !== 'undefined' && recommendLang) {
        return recommendLang;
    }
    
    // 最后使用浏览器语言
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('zh')) return 'zh';
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('ko')) return 'ko';
    return 'en'; // 默认英语
}

// 切换语言
function changeLanguage(lang) {
    // 保存语言偏好
    localStorage.setItem('preferredLanguage', lang);
    
    // 应用翻译
    applyTranslations(lang);
}

// 应用翻译
function applyTranslations(lang) {
    // 确保translations对象存在（从i18n.js加载）
    if (typeof translations === 'undefined') {
        console.error('Translations not loaded!');
        return;
    }
    
    // 获取当前语言的翻译
    const currentTranslations = translations[lang] || translations['en'];
    
    // 应用到所有带data-i18n属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (currentTranslations[key]) {
            element.textContent = currentTranslations[key];
        }
    });
    
    // 应用到所有带data-i18n-placeholder属性的元素
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (currentTranslations[key]) {
            element.placeholder = currentTranslations[key];
        }
    });
    
    // 更新HTML语言属性
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
}
