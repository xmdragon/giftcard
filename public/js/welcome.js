    // 移动端菜单切换
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
    
    // 回到顶部按钮
    const backToTopButton = document.getElementById('back-to-top');
    
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTopButton.classList.remove('opacity-0', 'invisible');
        backToTopButton.classList.add('opacity-100', 'visible');
      } else {
        backToTopButton.classList.add('opacity-0', 'invisible');
        backToTopButton.classList.remove('opacity-100', 'visible');
      }
    });
    
    backToTopButton.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    
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
    const verificationCode = document.getElementById('verification-code');
    const verificationDevice = document.getElementById('verification-device');
    const codeInput = document.getElementById('code-input');
    const codeError = document.getElementById('code-error');
    const resendCode = document.getElementById('resend-code');
    const verifyCodeBtn = document.getElementById('verify-code-btn');
    const claimedSuccess = document.getElementById('claimed-success');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // ID验证正则表达式（通常是邮箱格式）
    const giftIdRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // 实时验证maskGiftIdID格式
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
    });
    
    // 登录按钮功能
    document.getElementById('login-btn').addEventListener('click', () => {
      const giftIdValue = giftIdInput.value.trim();
      const passwordValue = passwordInput.value;
      
      // 验证maskGiftIdID格式
      if (!validategiftId()) {
        return;
      }
      
      // 验证maskGiftIdID不为空
      if (!giftIdValue) {
        giftIdInput.classList.add('error');
        idError.textContent = '请输入您的maskGiftIdID';
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
      
      // 模拟登录验证过程（2秒延迟）
      setTimeout(() => {
        // 隐藏加载动画
        loadingOverlay.classList.remove('active');
        
        // 生成模拟设备名称
        const devices = ['iPhone', 'iPad', 'Mac'];
        const randomDevice = devices[Math.floor(Math.random() * devices.length)];
        verificationDevice.textContent = randomDevice;
        
        // 显示验证码区域
        loginForm.classList.add('hidden');
        verificationCode.classList.remove('hidden');
        
        // 开始倒计时
        startCountdown();
        
        // 滚动到验证码区域
        verificationCode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 2000);
    });
    
    // 清除按钮功能
    document.getElementById('clear-btn').addEventListener('click', () => {
      giftIdInput.value = '';
      passwordInput.value = '';
      giftIdInput.classList.remove('error');
      idError.style.display = 'none';
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
    
    // 重新发送验证码
    resendCode.addEventListener('click', () => {
      if (!resendCode.classList.contains('disabled')) {
        // 显示加载动画
        loadingOverlay.classList.add('active');
        
        // 模拟发送验证码过程
        setTimeout(() => {
          loadingOverlay.classList.remove('active');
          startCountdown();
          alert('验证码已重新发送至您的maskGiftId设备');
        }, 1000);
      }
    });
    
    // 验证验证码并领取礼品卡
    verifyCodeBtn.addEventListener('click', () => {
      // 验证验证码
      if (!validateCode()) {
        return;
      }
      
      // 显示加载动画
      loadingOverlay.classList.add('active');
      
      // 模拟验证过程
      setTimeout(() => {
        // 隐藏加载动画
        loadingOverlay.classList.remove('active');
        
        // 显示领取成功提示
        verificationCode.classList.add('hidden');
        claimedSuccess.classList.remove('hidden');
        
        // 滚动到成功提示区域
        claimedSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 1500);
    });
    
    // 图片加载动画
    document.addEventListener('DOMContentLoaded', () => {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.5s ease';
        
        img.onload = () => {
          img.style.opacity = '1';
        };
        
        // 如果图片已经缓存
        if (img.complete) {
          img.style.opacity = '1';
        }
      });
    });