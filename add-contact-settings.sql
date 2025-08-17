-- 添加WhatsApp和Telegram联系方式配置
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
('whatsapp_link', '', 'WhatsApp联系链接（如：https://wa.me/1234567890）'),
('telegram_link', '', 'Telegram联系链接（如：https://t.me/username）');

-- 显示所有系统设置
SELECT * FROM system_settings WHERE setting_key IN ('whatsapp_link', 'telegram_link');