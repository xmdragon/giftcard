const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');
const db = require('../utils/db');
const router = express.Router();

// 存储验证码的临时会话存储
const captchaSessions = new Map();

module.exports = (io) => {
    // 管理员登录
    router.post('/login', async (req, res) => {
        try {
            const { username, password, captcha } = req.body;
            
            // 验证验证码
            if (!captcha) {
                return res.status(400).json({ error: '请输入验证码' });
            }
            
            const sessionId = req.ip + '-' + req.headers['user-agent'];
            const storedCaptcha = captchaSessions.get(sessionId);
            
            if (!storedCaptcha || storedCaptcha.toLowerCase() !== captcha.toLowerCase()) {
                // 验证码错误，删除存储的验证码
                captchaSessions.delete(sessionId);
                return res.status(400).json({ error: '验证码错误' });
            }
            
            // 验证码正确，删除已使用的验证码
            captchaSessions.delete(sessionId);

            const admins = await db.query('SELECT * FROM admins WHERE username = ?', [username]);

            if (admins.length === 0) {
                return res.status(400).json({ error: req.t ? req.t('invalid_credentials') : '用户名或密码错误' });
            }

            const admin = admins[0];

            // 使用MD5验证密码
            const md5Password = crypto.createHash('md5').update(password).digest('hex');

            const validPassword = (md5Password === admin.password);

            if (!validPassword) {
                return res.status(400).json({ error: req.t ? req.t('invalid_credentials') : '用户名或密码错误' });
            }

            const token = jwt.sign(
                { id: admin.id, username: admin.username, role: admin.role, permissions: admin.permissions },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '1h' }
            );
            res.json({
                token,
                admin: { id: admin.id, username: admin.username, role: admin.role, permissions: admin.permissions }
            });
        } catch (error) {
            res.status(500).json({ error: req.t ? req.t('server_error') : '服务器错误，请稍后重试' });
        }
    });

    // 修改管理员密码
    router.post('/change-password', async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: '需要登录' });
            }

            // 验证JWT令牌
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            const adminId = decoded.id;

            // 获取管理员信息
            const admins = await db.query('SELECT * FROM admins WHERE id = ?', [adminId]);
            if (admins.length === 0) {
                return res.status(404).json({ error: '管理员不存在' });
            }

            const admin = admins[0];

            // 验证当前密码
            const currentMd5Password = crypto.createHash('md5').update(currentPassword).digest('hex');
            if (currentMd5Password !== admin.password) {
                return res.status(400).json({ error: '当前密码不正确' });
            }

            // 验证新密码
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ error: '新密码长度至少6位' });
            }

            // 生成新密码的MD5哈希
            const newMd5Password = crypto.createHash('md5').update(newPassword).digest('hex');

            // 更新密码
            await db.query('UPDATE admins SET password = ? WHERE id = ?', [newMd5Password, adminId]);

            res.json({ message: '密码修改成功' });

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired', 
                    code: 'TOKEN_EXPIRED',
                    message: '登录已过期，请重新登录'
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    error: 'Invalid token', 
                    code: 'INVALID_TOKEN',
                    message: '无效的登录凭证，请重新登录'
                });
            }
            res.status(500).json({ error: '服务器错误，请稍后重试' });
        }
    });

    // 生成验证码接口
    router.get('/captcha', (req, res) => {
        try {
            const captcha = svgCaptcha.create({
                size: 4,
                noise: 1,
                color: true,
                background: '#f8f9fa',
                width: 120,
                height: 40,
                fontSize: 50,
                charPreset: '2345678ABCDEFGHKLMNPQRSTUVWXYZ' // 排除容易混淆的字符 0,1,O,I
            });
            
            const sessionId = req.ip + '-' + req.headers['user-agent'];
            
            // 存储验证码文本（5分钟过期）
            captchaSessions.set(sessionId, captcha.text);
            setTimeout(() => {
                captchaSessions.delete(sessionId);
            }, 5 * 60 * 1000);
            
            res.type('svg');
            res.send(captcha.data);
        } catch (error) {
            console.error('生成验证码错误:', error);
            res.status(500).json({ error: '生成验证码失败' });
        }
    });

    // TOKEN刷新接口
    router.post('/refresh-token', async (req, res) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: '需要TOKEN' });
            }

            // 验证当前TOKEN
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            
            // 获取管理员信息
            const admins = await db.query('SELECT * FROM admins WHERE id = ?', [decoded.id]);
            if (admins.length === 0) {
                return res.status(404).json({ error: '管理员不存在' });
            }

            const admin = admins[0];

            // 生成新的TOKEN（延长1小时）
            const newToken = jwt.sign(
                { id: admin.id, username: admin.username, role: admin.role, permissions: admin.permissions },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '1h' }
            );

            res.json({
                token: newToken,
                message: 'TOKEN刷新成功'
            });
            
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired', 
                    code: 'TOKEN_EXPIRED',
                    message: 'TOKEN已过期，请重新登录'
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    error: 'Invalid token', 
                    code: 'INVALID_TOKEN',
                    message: '无效的TOKEN，请重新登录'
                });
            }
            console.error('TOKEN刷新错误:', error);
            res.status(500).json({ error: '服务器错误，请稍后重试' });
        }
    });

    return router;
};