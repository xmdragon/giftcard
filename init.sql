-- 初始化数据库脚本
USE gift_card_system;

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