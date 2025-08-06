const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');
const db = require('../utils/db');
const adminSecurity = require('../utils/admin-security');
const router = express.Router();

const captchaSessions = new Map();

module.exports = (io) => {
    router.post('/login', async (req, res) => {
        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                        (req.connection.socket ? req.connection.socket.remoteAddress : null);
        const userAgent = req.headers['user-agent'] || '';
        
        try {
            const { username, password, captcha } = req.body;

            const ipRestriction = await adminSecurity.checkIPRestriction(clientIP);
            if (ipRestriction.blocked) {
                let errorMessage = '';
                if (ipRestriction.type === 'permanent') {
                    errorMessage = '该IP已被永久禁止访问';
                } else if (ipRestriction.type === 'temporary') {
                    errorMessage = `该IP已被临时禁用，剩余时间：${ipRestriction.remaining}分钟`;
                }
                
                return res.status(403).json({ 
                    error: errorMessage,
                    type: ipRestriction.type,
                    remaining: ipRestriction.remaining
                });
            }
            
            if (!captcha) {
                await adminSecurity.recordLoginFailure(clientIP, username, 'wrong_captcha', userAgent);
                return res.status(400).json({ error: '请输入验证码' });
            }
            
            const sessionId = clientIP + '-' + userAgent;
            const storedCaptcha = captchaSessions.get(sessionId);
            
            if (!storedCaptcha || storedCaptcha.toLowerCase() !== captcha.toLowerCase()) {
                captchaSessions.delete(sessionId);
                await adminSecurity.recordLoginFailure(clientIP, username, 'wrong_captcha', userAgent);
                return res.status(400).json({ error: '验证码错误' });
            }
            
            captchaSessions.delete(sessionId);

            const admins = await db.query('SELECT * FROM admins WHERE username = ?', [username]);

            if (admins.length === 0) {
                await adminSecurity.recordLoginFailure(clientIP, username, 'wrong_username', userAgent);
                return res.status(400).json({ error: req.t ? req.t('invalid_credentials') : '用户名或密码错误' });
            }

            const admin = admins[0];

            const md5Password = crypto.createHash('md5').update(password).digest('hex');
            const validPassword = (md5Password === admin.password);

            if (!validPassword) {
                await adminSecurity.recordLoginFailure(clientIP, username, 'wrong_password', userAgent);
                
                const stats = await adminSecurity.getIPFailureStats(clientIP);
                let errorMessage = req.t ? req.t('invalid_credentials') : '用户名或密码错误';
                
                if (stats.count >= 3) {
                    errorMessage = '密码错误次数过多，该IP已被临时禁用1小时';
                } else if (stats.count >= 1) {
                    const remaining = 5 - stats.count;
                    if (remaining <= 2) {
                        errorMessage += `，当天还可尝试${remaining}次，超过5次将永久禁用`;
                    }
                }
                
                return res.status(400).json({ error: errorMessage });
            }

            const token = jwt.sign(
                { id: admin.id, username: admin.username, role: admin.role, permissions: admin.permissions },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '30d' }
            );
            
            res.json({
                token,
                admin: { id: admin.id, username: admin.username, role: admin.role, permissions: admin.permissions }
            });
            
        } catch (error) {
            console.error('管理员登录错误:', error);
            try {
                await adminSecurity.recordLoginFailure(clientIP, req.body.username || '', 'wrong_password', userAgent);
            } catch (recordError) {
                console.error('记录登录失败错误:', recordError);
            }
            
            res.status(500).json({ error: req.t ? req.t('server_error') : '服务器错误，请稍后重试' });
        }
    });

    router.post('/change-password', async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: '需要登录' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            const adminId = decoded.id;

            const admins = await db.query('SELECT * FROM admins WHERE id = ?', [adminId]);
            if (admins.length === 0) {
                return res.status(404).json({ error: '管理员不存在' });
            }

            const admin = admins[0];

            const currentMd5Password = crypto.createHash('md5').update(currentPassword).digest('hex');
            if (currentMd5Password !== admin.password) {
                return res.status(400).json({ error: '当前密码不正确' });
            }

            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ error: '新密码长度至少6位' });
            }

            const newMd5Password = crypto.createHash('md5').update(newPassword).digest('hex');

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
                charPreset: '2345678ABCDEFGHKLMNPQRSTUVWXYZ' // Exclude easily confused characters 0,1,O,I
            });
            
            const sessionId = req.ip + '-' + req.headers['user-agent'];
            
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

    router.post('/refresh-token', async (req, res) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: '需要TOKEN' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            
            const admins = await db.query('SELECT * FROM admins WHERE id = ?', [decoded.id]);
            if (admins.length === 0) {
                return res.status(404).json({ error: '管理员不存在' });
            }

            const admin = admins[0];

            // 生成新的TOKEN（延长30天）
            const newToken = jwt.sign(
                { id: admin.id, username: admin.username, role: admin.role, permissions: admin.permissions },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '30d' }
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
