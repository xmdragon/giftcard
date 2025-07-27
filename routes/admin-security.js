const express = require('express');
const jwt = require('jsonwebtoken');
const adminSecurity = require('../utils/admin-security');
const db = require('../utils/db');
const router = express.Router();

// 验证管理员身份的中间件
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: '需要登录' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        
        // 验证管理员是否存在
        const admins = await db.query('SELECT * FROM admins WHERE id = ?', [decoded.id]);
        if (admins.length === 0) {
            return res.status(404).json({ error: '管理员不存在' });
        }

        req.admin = decoded;
        next();
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
        res.status(500).json({ error: '验证失败' });
    }
};

module.exports = () => {
    
    // 获取登录失败记录
    router.get('/login-failures', authenticateAdmin, async (req, res) => {
        try {
            const { page = 1, limit = 50, ip, days = 7 } = req.query;
            const offset = (page - 1) * limit;
            
            let whereClause = 'WHERE attempted_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            let params = [days];
            
            if (ip) {
                whereClause += ' AND ip_address = ?';
                params.push(ip);
            }
            
            const failures = await db.query(
                `SELECT * FROM admin_login_failures ${whereClause} ORDER BY attempted_at DESC LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );
            
            const countResult = await db.query(
                `SELECT COUNT(*) as total FROM admin_login_failures ${whereClause}`,
                params
            );
            
            res.json({
                failures,
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit)
            });
            
        } catch (error) {
            console.error('获取登录失败记录错误:', error);
            res.status(500).json({ error: '获取记录失败' });
        }
    });
    
    // 获取IP限制列表
    router.get('/ip-restrictions', authenticateAdmin, async (req, res) => {
        try {
            // 从统一的admin_ip_restrictions表获取所有限制
            const restrictions = await db.query(
                'SELECT ip_address, restriction_type, start_time, end_time, failure_count, reason, status FROM admin_ip_restrictions WHERE status = "active" ORDER BY start_time DESC'
            );
            
            // 分类处理
            const permanent = [];
            const temporary = [];
            
            restrictions.forEach(restriction => {
                const item = {
                    ip_address: restriction.ip_address,
                    reason: restriction.reason,
                    banned_at: restriction.start_time,
                    failure_count: restriction.failure_count,
                    type: restriction.restriction_type
                };
                
                if (restriction.restriction_type === 'permanent') {
                    permanent.push(item);
                } else if (restriction.restriction_type === 'temporary') {
                    item.end_time = restriction.end_time;
                    temporary.push(item);
                }
            });
            
            res.json({
                permanent,
                temporary
            });
            
        } catch (error) {
            console.error('获取IP限制列表错误:', error);
            res.status(500).json({ error: '获取限制列表失败' });
        }
    });
    
    // 移除IP限制
    router.delete('/ip-restrictions/:ip', authenticateAdmin, async (req, res) => {
        try {
            const { ip } = req.params;
            const { type } = req.query; // 'permanent' 或 'temporary'
            
            if (!type || !['permanent', 'temporary'].includes(type)) {
                return res.status(400).json({ error: '请指定限制类型（permanent或temporary）' });
            }
            
            await adminSecurity.removeIPRestriction(ip, type);
            
            res.json({ message: `已成功移除IP ${ip} 的${type === 'permanent' ? '永久' : '临时'}限制` });
            
        } catch (error) {
            console.error('移除IP限制错误:', error);
            res.status(500).json({ error: '移除限制失败' });
        }
    });
    
    // 手动添加IP到永久限制
    router.post('/ip-restrictions', authenticateAdmin, async (req, res) => {
        try {
            const { ip_address, reason, restriction_type = 'permanent' } = req.body;
            
            if (!ip_address) {
                return res.status(400).json({ error: '请提供IP地址' });
            }
            
            if (!['permanent', 'temporary'].includes(restriction_type)) {
                return res.status(400).json({ error: '限制类型必须是permanent或temporary' });
            }
            
            // 检查IP是否已存在活跃限制
            const existing = await db.query(
                'SELECT * FROM admin_ip_restrictions WHERE ip_address = ? AND status = "active"',
                [ip_address]
            );
            
            const finalReason = reason || `管理员${req.admin.username}手动添加`;
            let endTime = null;
            
            if (restriction_type === 'temporary') {
                // 临时限制默认1小时
                endTime = new Date(Date.now() + 60 * 60 * 1000);
            }
            
            if (existing.length > 0) {
                // 更新现有记录
                await db.query(
                    'UPDATE admin_ip_restrictions SET restriction_type = ?, reason = ?, end_time = ?, start_time = NOW() WHERE ip_address = ? AND status = "active"',
                    [restriction_type, finalReason, endTime, ip_address]
                );
            } else {
                // 插入新记录
                await db.query(
                    'INSERT INTO admin_ip_restrictions (ip_address, restriction_type, end_time, reason, status) VALUES (?, ?, ?, ?, "active")',
                    [ip_address, restriction_type, endTime, finalReason]
                );
            }
            
            res.json({ message: `IP ${ip_address} 已被成功添加到${restriction_type === 'permanent' ? '永久' : '临时'}限制` });
            
        } catch (error) {
            console.error('添加IP限制错误:', error);
            res.status(500).json({ error: '添加限制失败' });
        }
    });
    
    // 获取IP失败统计
    router.get('/ip-stats/:ip', authenticateAdmin, async (req, res) => {
        try {
            const { ip } = req.params;
            
            const stats = await adminSecurity.getIPFailureStats(ip);
            const restriction = await adminSecurity.checkIPRestriction(ip);
            
            res.json({
                ip_address: ip,
                today_failures: stats.count,
                last_attempt: stats.lastAttempt,
                restriction: restriction
            });
            
        } catch (error) {
            console.error('获取IP统计错误:', error);
            res.status(500).json({ error: '获取统计失败' });
        }
    });
    
    return router;
};