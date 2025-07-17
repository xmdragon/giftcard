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
);

-- 创建登录记录表
CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT,
  ip_address VARCHAR(45),
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_confirmed_by INT NULL,
  admin_confirmed_at TIMESTAMP NULL,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

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
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (login_log_id) REFERENCES login_logs(id)
);

-- 创建礼品卡分类表
CREATE TABLE IF NOT EXISTS gift_card_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建礼品卡表
CREATE TABLE IF NOT EXISTS gift_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT,
  code VARCHAR(255) UNIQUE NOT NULL,
  status ENUM('available', 'distributed', 'used') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  distributed_to INT NULL,
  distributed_at TIMESTAMP NULL,
  card_type ENUM('login', 'checkin') DEFAULT 'login',
  FOREIGN KEY (category_id) REFERENCES gift_card_categories(id),
  FOREIGN KEY (distributed_to) REFERENCES members(id)
);

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
);

-- 创建管理员表
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

-- 插入默认管理员账号 (密码: admin123, MD5格式)
INSERT INTO admins (username, password) VALUES ('admin', '0192023a7bbd73250516f069df18b500');

-- 插入默认礼品卡分类
INSERT INTO gift_card_categories (name, description) VALUES 
('新手礼包', '新用户登录奖励礼品卡'),
('签到奖励', '每日签到获得的礼品卡'),
('特殊活动', '特殊活动期间的礼品卡');

-- 插入示例礼品卡 (登录奖励)
INSERT INTO gift_cards (category_id, code, card_type) VALUES 
(1, 'WELCOME001', 'login'),
(1, 'WELCOME002', 'login'),
(1, 'WELCOME003', 'login'),
(1, 'WELCOME004', 'login'),
(1, 'WELCOME005', 'login');

-- 插入示例礼品卡 (签到奖励)
INSERT INTO gift_cards (category_id, code, card_type) VALUES 
(2, 'CHECKIN001', 'checkin'),
(2, 'CHECKIN002', 'checkin'),
(2, 'CHECKIN003', 'checkin'),
(2, 'CHECKIN004', 'checkin'),
(2, 'CHECKIN005', 'checkin'),
(2, 'CHECKIN006', 'checkin'),
(2, 'CHECKIN007', 'checkin'),
(2, 'CHECKIN008', 'checkin'),
(2, 'CHECKIN009', 'checkin'),
(2, 'CHECKIN010', 'checkin');