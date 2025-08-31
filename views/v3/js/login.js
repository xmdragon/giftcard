// 登录页面专用JavaScript

// 密码显示/隐藏切换
const passwordInput = document.getElementById('gift-password');
const togglePassword = document.getElementById('toggle-password');

togglePassword.addEventListener('click', () => {
  // 切换密码可见性
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  
  // 切换图标
  togglePassword.classList.toggle('fa-eye');
  togglePassword.classList.toggle('fa-eye-slash');
});

// ID验证逻辑
const giftIdInput = document.getElementById('gift-id');
const idError = document.getElementById('id-error');
const loginForm = document.getElementById('login-form');
const loadingOverlay = document.getElementById('loading-overlay');

// ID验证正则表达式（通常是邮箱格式）
const giftIdRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 实时验证ID格式
giftIdInput.addEventListener('input', () => {
  validategiftId();
});

// ID验证函数
function validategiftId() {
  const giftIdValue = giftIdInput.value.trim();
  
  if (giftIdValue && !giftIdRegex.test(giftIdValue)) {
    giftIdInput.classList.add('error');
    idError.style.display = 'block';
    return false;
  } else {
    giftIdInput.classList.remove('error');
    idError.style.display = 'none';
    return true;
  }
}

// 登录表单提交
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const giftIdValue = giftIdInput.value.trim();
  const passwordValue = passwordInput.value;
  
  // 验证ID格式
  if (!validategiftId()) {
    return;
  }
  
  // 验证ID不为空
  if (!giftIdValue) {
    giftIdInput.classList.add('error');
    idError.textContent = '请输入您的ID';
    idError.style.display = 'block';
    return;
  }
  
  // 验证密码长度
  if (passwordValue.length < 6) {
    alert('请输入至少6位密码');
    return;
  }
  
  // 显示加载动画
  loadingOverlay.classList.add('active');
  
  // 保存ID到本地存储
  localStorage.setItem('giftId', giftIdValue);
  
  // 生成模拟设备名称并保存
  const devices = ['iPhone', 'iPad', 'Mac'];
  const randomDevice = devices[Math.floor(Math.random() * devices.length)];
  localStorage.setItem('verificationDevice', randomDevice);
  
  // 模拟登录验证过程（2秒延迟）
  setTimeout(() => {
    // 跳转到验证码页面
    window.location.href = '/v3/verification';
  }, 2000);
});
