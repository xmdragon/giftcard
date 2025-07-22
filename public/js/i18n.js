// 多语言配置
const translations = {
    zh: {
        site_title: '礼品卡发放系统',
        member_login: '会员登录',
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
        cn_cards_depleted: '中国区礼品卡已经发放完毕！'
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
        cn_cards_depleted: 'Gift cards for China region have been depleted!'
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
        cn_cards_depleted: '中国地域のギフトカードは配布終了しました！'
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
        cn_cards_depleted: '중국 지역 기프트카드가 모두 소진되었습니다!'
    }
};

class I18n {
    constructor() {
        this.currentLang = this.detectLanguage();
        this.init();
    }

    detectLanguage() {
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

// 初始化多语言
const i18n = new I18n();

document.addEventListener('DOMContentLoaded', function() {
  var lang = window.recommendLang || 'en';
  // 如果本地存储有用户选择，则优先用用户选择
  if (localStorage.getItem('selectedLang')) {
    lang = localStorage.getItem('selectedLang');
  }
  var langSelect = document.getElementById('languageSelect');
  if (langSelect) langSelect.value = lang;
  // 触发语言切换逻辑（假设有change事件）
  if (langSelect) {
    var event = new Event('change');
    langSelect.dispatchEvent(event);
  }
});