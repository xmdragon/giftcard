// 成功页面专用JavaScript

// 从本地存储获取ID
const giftId = localStorage.getItem('giftId');

// 验证是否有登录信息，没有则返回登录页
if (!giftId) {
  window.location.href = '/v3';
}

// 显示ID（隐藏部分字符保护隐私）
function maskGiftId(id) {
  const [localPart, domain] = id.split('@');
  if (localPart.length > 3) {
    return localPart.substring(0, 3) + '***@' + domain;
  }
  return localPart + '***@' + domain;
}

document.getElementById('gift-id-display').textContent = maskGiftId(giftId);

// 显示当前时间作为添加时间
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

document.getElementById('added-time').textContent = formatDate(new Date());

// 返回按钮功能
document.getElementById('back-btn').addEventListener('click', () => {
  window.history.back();
});

// 页面加载动画
window.addEventListener('load', () => {
  const giftCard = document.querySelector('.gift-card');
  giftCard.style.opacity = '0';
  giftCard.style.transform = 'translateY(20px)';
  giftCard.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  
  setTimeout(() => {
    giftCard.style.opacity = '1';
    giftCard.style.transform = 'translateY(0)';
  }, 300);
});
