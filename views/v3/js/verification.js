// 验证页面专用JavaScript

// 从本地存储获取信息
const giftId = localStorage.getItem('giftId');
const verificationDevice = localStorage.getItem('verificationDevice');

// 验证是否有登录信息，没有则返回登录页
if (!giftId || !verificationDevice) {
  window.location.href = '/v3/login';
}

// 显示设备名称
document.getElementById('device-name').textContent = verificationDevice;

// 验证码元素
const codeInput = document.getElementById('code-input');
const codeError = document.getElementById('code-error');
const resendCode = document.getElementById('resend-code');
const verificationForm = document.getElementById('verification-form');
const loadingOverlay = document.getElementById('loading-overlay');
const backBtn = document.getElementById('back-btn');

// 验证码验证函数
function validateCode() {
  const codeValue = codeInput.value.trim();
  
  if (codeValue.length !== 6 || isNaN(codeValue)) {
    codeInput.classList.add('error');
    codeError.style.display = 'block';
    return false;
  } else {
    codeInput.classList.remove('error');
    codeError.style.display = 'none';
    return true;
  }
}

// 验证码输入验证
codeInput.addEventListener('input', () => {
  validateCode();
  
  // 自动填充6位后提交
  if (codeInput.value.length === 6) {
    verificationForm.dispatchEvent(new Event('submit'));
  }
});

// 验证码倒计时功能
function startCountdown() {
  let seconds = 60;
  resendCode.classList.add('disabled');
  resendCode.textContent = `重新发送(${seconds}s)`;
  
  const countdownInterval = setInterval(() => {
    seconds--;
    resendCode.textContent = `重新发送(${seconds}s)`;
    
    if (seconds <= 0) {
      clearInterval(countdownInterval);
      resendCode.classList.remove('disabled');
      resendCode.textContent = '重新发送';
    }
  }, 1000);
}

// 页面加载时开始倒计时
startCountdown();

// 重新发送验证码
resendCode.addEventListener('click', () => {
  if (!resendCode.classList.contains('disabled')) {
    // 显示加载动画
    loadingOverlay.classList.add('active');
    
    // 模拟发送验证码过程
    setTimeout(() => {
      loadingOverlay.classList.remove('active');
      startCountdown();
      alert(`验证码已重新发送至您的${verificationDevice}`);
    }, 1000);
  }
});

// 返回按钮功能
backBtn.addEventListener('click', () => {
  window.location.href = '/v3/login';
});

// 验证码表单提交
verificationForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // 验证验证码
  if (!validateCode()) {
    return;
  }
  
  // 显示加载动画
  loadingOverlay.classList.add('active');
  
  // 模拟验证过程
  setTimeout(() => {
    // 跳转到成功页面
    window.location.href = '/v3/success';
  }, 1500);
});
