-- 设置字符集
SET NAMES utf8mb4;
-- 初始化数据库脚本
USE gift_card_system;

-- 创建会员表
CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  status ENUM('active', 'inactive') DEFAULT 'active'
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建登录记录表
CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT,
  ip_address VARCHAR(45),
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_confirmed_by INT NULL,
  admin_confirmed_at TIMESTAMP NULL,
  assigned_admin_id INT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建二次验证表
CREATE TABLE IF NOT EXISTS second_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT,
  login_log_id INT,
  verification_code VARCHAR(10),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_confirmed_by INT NULL,
  admin_confirmed_at TIMESTAMP NULL,
  assigned_admin_id INT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (login_log_id) REFERENCES login_logs(id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建礼品卡分类表
CREATE TABLE IF NOT EXISTS gift_card_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建礼品卡表
CREATE TABLE IF NOT EXISTS gift_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT,
  code VARCHAR(255) UNIQUE NOT NULL,
  status ENUM('available', 'distributed', 'used') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  distributed_to INT NULL,
  distributed_at TIMESTAMP NULL,
  FOREIGN KEY (category_id) REFERENCES gift_card_categories(id),
  FOREIGN KEY (distributed_to) REFERENCES members(id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建签到记录表
CREATE TABLE IF NOT EXISTS checkin_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT,
  checkin_date DATE,
  gift_card_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id),
  UNIQUE KEY unique_member_date (member_id, checkin_date)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建管理员表
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('super','admin') NOT NULL DEFAULT 'admin',
  permissions TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建IP黑名单表
CREATE TABLE IF NOT EXISTS ip_blacklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  reason TEXT,
  banned_by INT,
  banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive') DEFAULT 'active',
  FOREIGN KEY (banned_by) REFERENCES admins(id),
  UNIQUE KEY unique_ip (ip_address)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 管理员权限表（如需细粒度扩展，可用）
CREATE TABLE IF NOT EXISTS admin_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  can_view TINYINT(1) DEFAULT 0,
  can_add TINYINT(1) DEFAULT 0,
  can_edit TINYINT(1) DEFAULT 0,
  can_delete TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id),
  UNIQUE KEY unique_admin_permission (admin_id, permission_key)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认管理员账号 (密码: admin123, MD5格式)
INSERT INTO admins (username, password, role, permissions) VALUES ('admin', '0192023a7bbd73250516f069df18b500', 'super', '{}');

-- 插入默认礼品卡分类
INSERT INTO gift_card_categories (name, description) VALUES 
('新手礼包', '新用户登录奖励礼品卡'),
('签到奖励', '每日签到获得的礼品卡'),
('特殊活动', '特殊活动期间的礼品卡');

-- 插入示例礼品卡 (登录奖励)
INSERT INTO gift_cards (category_id, code) VALUES 
(1, 'WELCOME001'),
(1, 'WELCOME002'),
(1, 'WELCOME003'),
(1, 'WELCOME004'),
(1, 'WELCOME005');

-- 插入示例礼品卡 (签到奖励)
INSERT INTO gift_cards (category_id, code) VALUES 
(2, 'CHECKIN001'),
(2, 'CHECKIN002'),
(2, 'CHECKIN003'),
(2, 'CHECKIN004'),
(2, 'CHECKIN005'),
(2, 'CHECKIN006'),
(2, 'CHECKIN007'),
(2, 'CHECKIN008'),
(2, 'CHECKIN009'),
(2, 'CHECKIN010');

-- 创建用户行为追踪表
CREATE TABLE IF NOT EXISTS user_page_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,            -- 游客会话ID或会员账号
  user_type ENUM('guest', 'member') DEFAULT 'guest',  -- 用户类型
  page_name VARCHAR(100) NOT NULL,             -- 页面/标签页名称
  stay_duration INT DEFAULT 0,                -- 停留时长(秒)
  ip_address VARCHAR(45),                      -- IP地址
  enter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 进入时间
  leave_time TIMESTAMP NULL,                   -- 离开时间
  user_agent TEXT,                            -- 浏览器信息
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建管理员登录失败记录表
CREATE TABLE IF NOT EXISTS admin_login_failures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  username VARCHAR(50),
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  failure_type ENUM('wrong_password', 'wrong_captcha', 'wrong_username') DEFAULT 'wrong_password',
  user_agent TEXT,
  INDEX idx_ip_date (ip_address, attempted_at),
  INDEX idx_date (attempted_at)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建管理员IP限制表（支持临时和永久禁用）
CREATE TABLE IF NOT EXISTS admin_ip_restrictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  restriction_type ENUM('temporary', 'permanent') NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  failure_count INT DEFAULT 0,
  reason VARCHAR(255) DEFAULT '',
  status ENUM('active', 'expired', 'removed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_active_ip (ip_address, status),
  INDEX idx_ip_status (ip_address, status),
  INDEX idx_end_time (end_time),
  INDEX idx_type (restriction_type)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;