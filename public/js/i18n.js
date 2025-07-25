// 多语言配置
const translations = {
    zh: {
        site_title: '礼品卡发放系统',
        member_login: 'Apple 账户',
        account: '账号',
        password: '密码',
        login: '登录',
        waiting_approval: '等待管理员审核',
        login_pending_message: '您的登录请求已提交，请等待管理员确认...',
        second_verification: '二次验证',
        enter_verification_code: '请输入验证码',
        verification_code: '验证码',
        submit: '提交',
        waiting_verification_approval: '等待验证审核',
        verification_pending_message: '您的验证码已提交，请等待管理员确认...',
        your_gift_card: '您的礼品卡',
        gift_card_message: '恭喜！这是您的礼品卡代码',
        daily_checkin: '每日签到',
        view_history: '查看历史',
        checkin_now: '立即签到',
        back: '返回',
        history_records: '历史记录',
        gift_cards: '礼品卡',
        checkin_records: '签到记录',
        login_approved: '登录已通过，请进行二次验证',
        login_rejected: '登录被拒绝',
        verification_approved: '验证通过！',
        verification_rejected: '验证被拒绝',
        no_gift_cards_available: '暂无可用礼品卡',
        checkin_successful: '签到成功！',
        already_checked_in_today: '今天已经签到过了',
        no_checkin_eligibility: '您还没有获得签到资格',
        checkin_period_expired: '签到期限已过',
        days_remaining: '剩余天数',
        eligible_for_checkin: '可以签到',
        not_eligible_for_checkin: '不能签到',
        category: '分类',
        code: '代码',
        status: '状态',
        distributed_at: '发放时间',
        checkin_date: '签到日期',
        gift_card_received: '获得礼品卡',
        member_password: '会员密码',
        welcome_message: '欢迎使用礼品卡发放系统，请点击下方按钮进入会员登录。',
        lang_zh: '中文',
        lang_en: 'English',
        lang_ja: '日本語',
        lang_ko: '한국어',
        cn_cards_depleted: '中国区礼品卡已经发放完毕！',
        account_placeholder: '请输入账号',
        blocked_cn_ip: '很抱歉，因政策原因，中国大陆IP暂时无法访问本系统。',
        logout: '退出',
        email_or_phone: '电子邮件或电话号码',
        remember_me: '记住我的账户',
        apple_account_privacy: '您的 Apple 账户信息用于让您安全登录和访问您的数据。Apple 会出于安全、支持和报告目的记录某些数据。如果您同意，Apple 还可能使用您的 Apple 账户信息向您发送营销电子邮件和通信，包括基于您对 Apple 服务的使用情况。了解数据的管理方式…',
        manage_your_apple_account: '管理你的 Apple 账户',
        cannot_use_device: '无法使用你的设备？',
        resend_code: '重新发送验证码到设备',
        for_everyone: '适合所有人，适合所有事。',
        gift_card_intro: '产品、配件、应用、游戏、音乐、电影、电视节目、iCloud+ 等等。这张礼品卡都可以用来购买。以及更多。',
        mac: 'Mac',
        iphone: 'iPhone',
        ipad: 'iPad',
        watch: 'Watch',
        apple_vision_pro: 'Apple Vision Pro',
        accessories: '配件',
        app_store: 'App Store',
        arcade: 'Arcade',
        music: '音乐',
        tv_plus: 'TV+',
        itunes: 'iTunes',
        apple_one: 'Apple One',
        fitness_plus: 'Fitness+',
        icloud_plus: 'iCloud+',
        news_plus: 'News+',
        books: '图书',
        apple_gift_card_warning1: 'Apple 礼品卡仅可用于购买 Apple 的产品和服务。如果有人要求您使用 Apple 礼品卡购买 Apple 不售的产品，您可能成为诈骗的目标。',
        apple_gift_card_warning2: '如果您认为自己成为了涉及 Apple 礼品卡诈骗的受害者，请联系 Apple 支持。您也可以向联邦贸易委员会举报诈骗。',
        apple_gift_card_warning3: '了解更多关于 Apple 礼品卡诈骗的信息。',
        login_apple_account: '登录 Apple 账户',
        two_factor_auth: '双重认证',
        enter_verification_code_desc: '请输入发送到你的 Apple 设备的验证码。',
        digit_1: '位数 1',
        digit_2: '位数 2',
        digit_3: '位数 3',
        digit_4: '位数 4',
        digit_5: '位数 5',
        digit_6: '位数 6'
    },
    en: {
        site_title: 'Gift Card Distribution System',
        member_login: 'Member Login',
        account: 'Account',
        password: 'Password',
        login: 'Login',
        waiting_approval: 'Waiting for Admin Approval',
        login_pending_message: 'Your login request has been submitted, please wait for admin confirmation...',
        second_verification: 'Second Verification',
        enter_verification_code: 'Please enter verification code',
        verification_code: 'Verification Code',
        submit: 'Submit',
        waiting_verification_approval: 'Waiting for Verification Approval',
        verification_pending_message: 'Your verification code has been submitted, please wait for admin confirmation...',
        your_gift_card: 'Your Gift Card',
        gift_card_message: 'Congratulations! This is your gift card code',
        daily_checkin: 'Daily Check-in',
        view_history: 'View History',
        checkin_now: 'Check-in Now',
        back: 'Back',
        history_records: 'History Records',
        gift_cards: 'Gift Cards',
        checkin_records: 'Check-in Records',
        login_approved: 'Login approved, please proceed with second verification',
        login_rejected: 'Login rejected',
        verification_approved: 'Verification approved!',
        verification_rejected: 'Verification rejected',
        no_gift_cards_available: 'No gift cards available',
        checkin_successful: 'Check-in successful!',
        already_checked_in_today: 'Already checked in today',
        no_checkin_eligibility: 'You are not eligible for check-in yet',
        checkin_period_expired: 'Check-in period has expired',
        days_remaining: 'Days remaining',
        eligible_for_checkin: 'Eligible for check-in',
        not_eligible_for_checkin: 'Not eligible for check-in',
        category: 'Category',
        code: 'Code',
        status: 'Status',
        distributed_at: 'Distributed At',
        checkin_date: 'Check-in Date',
        gift_card_received: 'Gift Card Received',
        member_password: 'Member Password',
        welcome_message: 'Welcome to the Gift Card Distribution System. Please click the button below to login as a member.',
        lang_zh: '中文',
        lang_en: 'English',
        lang_ja: '日本語',
        lang_ko: '한국어',
        cn_cards_depleted: 'Gift cards for China region have been depleted!',
        account_placeholder: 'Please enter account',
        blocked_cn_ip: 'Sorry, due to policy reasons, access from Mainland China is temporarily unavailable.',
        logout: 'Logout',
        email_or_phone: 'Email or phone number',
        remember_me: 'Remember my account',
        apple_account_privacy: 'Your Apple account information is used to securely sign you in and access your data. Apple records certain data for security, support, and reporting purposes. If you agree, Apple may also use your account information to send you marketing emails and communications, including those based on your use of Apple services. Learn how your data is managed… ',
        manage_your_apple_account: 'Manage your Apple account',
        cannot_use_device: "Can't use your device?",
        resend_code: 'Resend code to device',
        for_everyone: 'For everything and everyone.',
        gift_card_intro: 'Products, accessories, apps, games, music, movies, TV shows, iCloud+, and more. This gift card does it all. And then some.',
        mac: 'Mac',
        iphone: 'iPhone',
        ipad: 'iPad',
        watch: 'Watch',
        apple_vision_pro: 'Apple Vision Pro',
        accessories: 'Accessories',
        app_store: 'App Store',
        arcade: 'Arcade',
        music: 'Music',
        tv_plus: 'TV+',
        itunes: 'iTunes',
        apple_one: 'Apple One',
        fitness_plus: 'Fitness+',
        icloud_plus: 'iCloud+',
        news_plus: 'News+',
        books: 'Books',
        apple_gift_card_warning1: 'Apple Gift Cards can be used only to purchase products and services from Apple. If someone asks you to use Apple Gift Cards to purchase something not sold by Apple, you might be the target of a scam.',
        apple_gift_card_warning2: 'Contact Apple Support if you believe you\'re the victim of a scam involving Apple Gift Cards. You can also report the scam to the Federal Trade Commission .',
        apple_gift_card_warning3: 'Learn More about Apple Gift Card Scams.',
        login_apple_account: 'Sign in to Apple Account',
        two_factor_auth: 'Two-Factor Authentication',
        enter_verification_code_desc: 'Enter the verification code sent to your Apple device.',
        digit_1: 'Digit 1',
        digit_2: 'Digit 2',
        digit_3: 'Digit 3',
        digit_4: 'Digit 4',
        digit_5: 'Digit 5',
        digit_6: 'Digit 6'
    },
    ja: {
        site_title: 'ギフトカード配布システム',
        member_login: 'メンバーログイン',
        account: 'アカウント',
        password: 'パスワード',
        login: 'ログイン',
        waiting_approval: '管理者の承認待ち',
        login_pending_message: 'ログインリクエストが送信されました。管理者の確認をお待ちください...',
        second_verification: '二次認証',
        enter_verification_code: '認証コードを入力してください',
        verification_code: '認証コード',
        submit: '送信',
        waiting_verification_approval: '認証の承認待ち',
        verification_pending_message: '認証コードが送信されました。管理者の確認をお待ちください...',
        your_gift_card: 'あなたのギフトカード',
        gift_card_message: 'おめでとうございます！これがあなたのギフトカードコードです',
        daily_checkin: '毎日チェックイン',
        view_history: '履歴を見る',
        checkin_now: '今すぐチェックイン',
        back: '戻る',
        history_records: '履歴記録',
        gift_cards: 'ギフトカード',
        checkin_records: 'チェックイン記録',
        login_approved: 'ログインが承認されました。二次認証を行ってください',
        login_rejected: 'ログインが拒否されました',
        verification_approved: '認証が承認されました！',
        verification_rejected: '認証が拒否されました',
        no_gift_cards_available: '利用可能なギフトカードがありません',
        checkin_successful: 'チェックイン成功！',
        already_checked_in_today: '今日は既にチェックイン済みです',
        no_checkin_eligibility: 'まだチェックイン資格がありません',
        checkin_period_expired: 'チェックイン期間が終了しました',
        days_remaining: '残り日数',
        eligible_for_checkin: 'チェックイン可能',
        not_eligible_for_checkin: 'チェックイン不可',
        category: 'カテゴリ',
        code: 'コード',
        status: 'ステータス',
        distributed_at: '配布日時',
        checkin_date: 'チェックイン日',
        gift_card_received: 'ギフトカード受領',
        member_password: 'メンバーパスワード',
        welcome_message: 'ギフトカード配布システムへようこそ。下のボタンをクリックして、メンバーとしてログインしてください。',
        lang_zh: '中文',
        lang_en: 'English',
        lang_ja: '日本語',
        lang_ko: '한국어',
        cn_cards_depleted: '中国地域のギフトカードは配布終了しました！',
        account_placeholder: 'アカウントを入力してください',
        blocked_cn_ip: '申し訳ありませんが、ポリシー上の理由により、中国本土からのアクセスは一時的にご利用いただけません。',
        logout: 'ログアウト',
        email_or_phone: 'メールアドレスまたは電話番号',
        remember_me: 'アカウントを記憶する',
        apple_account_privacy: 'Appleアカウント情報は、安全にサインインしデータにアクセスするために使用されます。Appleはセキュリティ、サポート、レポート目的で特定のデータを記録します。ご同意いただければ、AppleはAppleサービスのご利用状況に基づくマーケティングメールや通信も送信する場合があります。データの管理方法について詳しくはこちら…',
        manage_your_apple_account: 'Appleアカウントを管理する',
        cannot_use_device: 'デバイスが使えませんか？',
        resend_code: 'デバイスに認証コードを再送信',
        for_everyone: 'すべての人、すべてのことに。',
        gift_card_intro: '製品、アクセサリ、アプリ、ゲーム、音楽、映画、TV番組、iCloud+など。このギフトカードですべてが可能です。そしてさらに。',
        mac: 'Mac',
        iphone: 'iPhone',
        ipad: 'iPad',
        watch: 'Watch',
        apple_vision_pro: 'Apple Vision Pro',
        accessories: 'アクセサリ',
        app_store: 'App Store',
        arcade: 'Arcade',
        music: 'ミュージック',
        tv_plus: 'TV+',
        itunes: 'iTunes',
        apple_one: 'Apple One',
        fitness_plus: 'Fitness+',
        icloud_plus: 'iCloud+',
        news_plus: 'News+',
        books: 'ブックス',
        apple_gift_card_warning1: 'AppleギフトカードはAppleの製品やサービスの購入にのみ使用できます。Apple以外が販売しているものをAppleギフトカードで購入するよう求められた場合、詐欺のターゲットになっている可能性があります。',
        apple_gift_card_warning2: 'Appleギフトカードに関わる詐欺の被害者だと思われる場合は、Appleサポートにお問い合わせください。連邦取引委員会に詐欺を報告することもできます。',
        apple_gift_card_warning3: 'Appleギフトカード詐欺について詳しく知る。',
        login_apple_account: 'Appleアカウントにサインイン',
        two_factor_auth: '二要素認証',
        enter_verification_code_desc: 'Appleデバイスに送信された認証コードを入力してください。',
        digit_1: '桁 1',
        digit_2: '桁 2',
        digit_3: '桁 3',
        digit_4: '桁 4',
        digit_5: '桁 5',
        digit_6: '桁 6'
    },
    ko: {
        site_title: '기프트카드 배포 시스템',
        member_login: '회원 로그인',
        account: '계정',
        password: '비밀번호',
        login: '로그인',
        waiting_approval: '관리자 승인 대기 중',
        login_pending_message: '로그인 요청이 제출되었습니다. 관리자 확인을 기다려주세요...',
        second_verification: '이차 인증',
        enter_verification_code: '인증 코드를 입력하세요',
        verification_code: '인증 코드',
        submit: '제출',
        waiting_verification_approval: '인증 승인 대기 중',
        verification_pending_message: '인증 코드가 제출되었습니다. 관리자 확인을 기다려주세요...',
        your_gift_card: '귀하의 기프트카드',
        gift_card_message: '축하합니다! 이것이 귀하의 기프트카드 코드입니다',
        daily_checkin: '일일 체크인',
        view_history: '기록 보기',
        checkin_now: '지금 체크인',
        back: '돌아가기',
        history_records: '기록',
        gift_cards: '기프트카드',
        checkin_records: '체크인 기록',
        login_approved: '로그인이 승인되었습니다. 이차 인증을 진행해주세요',
        login_rejected: '로그인이 거부되었습니다',
        verification_approved: '인증이 승인되었습니다!',
        verification_rejected: '인증이 거부되었습니다',
        no_gift_cards_available: '사용 가능한 기프트카드가 없습니다',
        checkin_successful: '체크인 성공!',
        already_checked_in_today: '오늘 이미 체크인했습니다',
        no_checkin_eligibility: '아직 체크인 자격이 없습니다',
        checkin_period_expired: '체크인 기간이 만료되었습니다',
        days_remaining: '남은 일수',
        eligible_for_checkin: '체크인 가능',
        not_eligible_for_checkin: '체크인 불가능',
        category: '카테고리',
        code: '코드',
        status: '상태',
        distributed_at: '배포 시간',
        checkin_date: '체크인 날짜',
        gift_card_received: '기프트카드 수령',
        member_password: '회원 비밀번호',
        welcome_message: '기프트카드 배포 시스템에 오신 것을 환영합니다. 아래 버튼을 클릭하여 회원으로 로그인하세요.',
        lang_zh: '中文',
        lang_en: 'English',
        lang_ja: '日本語',
        lang_ko: '한국어',
        cn_cards_depleted: '중국 지역 기프트카드가 모두 소진되었습니다!',
        account_placeholder: '계정을 입력하세요',
        blocked_cn_ip: '죄송합니다. 정책상의 이유로 중국 본토에서는 현재 시스템을 이용하실 수 없습니다.',
        logout: '로그아웃',
        email_or_phone: '이메일 또는 전화번호',
        remember_me: '내 계정 기억하기',
        apple_account_privacy: 'Apple 계정 정보는 안전한 로그인 및 데이터 접근을 위해 사용됩니다. Apple은 보안, 지원, 보고 목적으로 일부 데이터를 기록합니다. 동의하시면 Apple은 Apple 서비스 사용에 기반한 마케팅 이메일 및 커뮤니케이션도 보낼 수 있습니다. 데이터 관리 방식 알아보기…',
        manage_your_apple_account: 'Apple 계정 관리',
        cannot_use_device: '기기를 사용할 수 없나요?',
        resend_code: '기기로 인증코드 재전송',
        for_everyone: '모두를 위한, 모든 것을 위한.',
        gift_card_intro: '제품, 액세서리, 앱, 게임, 음악, 영화, TV 프로그램, iCloud+ 등. 이 기프트카드로 모든 것을 할 수 있습니다. 그리고 더 많은 것들도.',
        mac: 'Mac',
        iphone: 'iPhone',
        ipad: 'iPad',
        watch: 'Watch',
        apple_vision_pro: 'Apple Vision Pro',
        accessories: '액세서리',
        app_store: 'App Store',
        arcade: 'Arcade',
        music: '음악',
        tv_plus: 'TV+',
        itunes: 'iTunes',
        apple_one: 'Apple One',
        fitness_plus: 'Fitness+',
        icloud_plus: 'iCloud+',
        news_plus: 'News+',
        books: '북스',
        apple_gift_card_warning1: 'Apple 기프트카드는 Apple의 제품과 서비스 구매에만 사용할 수 있습니다. Apple에서 판매하지 않는 물건을 Apple 기프트카드로 구매하라고 요구하는 사람이 있다면, 사기의 표적이 될 수 있습니다.',
        apple_gift_card_warning2: 'Apple 기프트카드와 관련된 사기의 피해자라고 생각되신다면 Apple 지원에 문의하세요. 연방거래위원회에 사기를 신고할 수도 있습니다.',
        apple_gift_card_warning3: 'Apple 기프트카드 사기에 대해 자세히 알아보기.',
        login_apple_account: 'Apple 계정에 로그인',
        two_factor_auth: '이중 인증',
        enter_verification_code_desc: 'Apple 기기로 전송된 인증 코드를 입력하세요.',
        digit_1: '자리 1',
        digit_2: '자리 2',
        digit_3: '자리 3',
        digit_4: '자리 4',
        digit_5: '자리 5',
        digit_6: '자리 6'
    }
};

class I18n {
    constructor() {
        this.currentLang = this.detectLanguage();
        this.init();
    }

    detectLanguage() {
        // 检查服务器推荐的语言（优先级最高）
        if (typeof recommendLang !== 'undefined' && translations[recommendLang]) {
            return recommendLang;
        }

        // 从localStorage获取保存的语言设置
        const savedLang = localStorage.getItem('language');
        if (savedLang && translations[savedLang]) {
            return savedLang;
        }

        // 从浏览器语言检测
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('zh')) return 'zh';
        if (browserLang.startsWith('ja')) return 'ja';
        if (browserLang.startsWith('ko')) return 'ko';
        return 'en'; // 默认英语
    }

    init() {
        this.updateLanguageSelector();
        this.translatePage();
        this.bindLanguageSelector();
    }

    updateLanguageSelector() {
        const selector = document.getElementById('languageSelect');
        if (selector) {
            selector.value = this.currentLang;
        }
    }

    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                if (element.tagName === 'INPUT' && element.type === 'submit') {
                    element.value = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        // 新增：处理 input/textarea 的 placeholder
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation) {
                element.setAttribute('placeholder', translation);
            }
        });
    }

    bindLanguageSelector() {
        const selector = document.getElementById('languageSelect');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
    }

    setLanguage(lang) {
        if (translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.translatePage();
        }
    }

    t(key) {
        return translations[this.currentLang][key] || translations['en'][key] || key;
    }
}

// 等待DOM加载完成后初始化多语言
document.addEventListener('DOMContentLoaded', function() {
    const i18n = new I18n();
    window.i18n = i18n; // 使i18n全局可访问
});
