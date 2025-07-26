const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

function createTrackingRoutes(io) {
    const db = require('../utils/db');
    
    // 管理员认证中间件
    const authenticateAdmin = async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: '需要管理员认证' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            const adminId = decoded.adminId || decoded.id; // 兼容不同的JWT字段名
            const admins = await db.query('SELECT * FROM admins WHERE id = ?', [adminId]);
            
            if (!admins || admins.length === 0) {
                return res.status(401).json({ error: '管理员不存在' });
            }

            req.admin = admins[0];
            next();
        } catch (error) {
            return res.status(401).json({ error: '认证失败' });
        }
    };

    // 权限检查中间件
    const checkPermission = (permissionKey) => (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ error: '认证信息丢失' });
        }
        
        if (req.admin.role === 'super') return next();
        
        let permissions = {};
        try {
            permissions = req.admin.permissions ? JSON.parse(req.admin.permissions) : {};
        } catch (e) {}
        
        if (permissions[permissionKey]) {
            return next();
        }
        
        return res.status(403).json({ 
            error: '权限不足', 
            code: 'NO_PERMISSION', 
            permission: permissionKey 
        });
    };
    
    // 获取客户端IP地址的辅助函数
    function getClientIP(req) {
        let ip = req.headers['x-forwarded-for'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress ||
                 (req.connection.socket ? req.connection.socket.remoteAddress : null);
        
        if (ip && ip.startsWith('::ffff:')) {
            ip = ip.substring(7);
        }
        
        return ip;
    }
    
    // 页面追踪数据接收接口
    router.post('/page', async (req, res) => {
        try {
            const {
                sessionId,
                userType,
                pageName,
                action,
                duration,
                enterTime,
                leaveTime,
                userAgent
            } = req.body;
            
            const ip = getClientIP(req);
            
            // 验证必要字段
            if (!sessionId || !pageName || !action) {
                return res.status(400).json({
                    error: '缺少必要字段'
                });
            }
            
            // 根据动作类型处理数据
            switch (action) {
                case 'enter':
                    // 页面进入记录
                    await db.execute(`
                        INSERT INTO user_page_tracking 
                        (session_id, user_type, page_name, ip_address, enter_time, user_agent) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [sessionId, userType || 'guest', pageName, ip, new Date(enterTime), userAgent]);
                    break;
                    
                case 'leave':
                    // 页面离开，更新停留时长
                    await db.execute(`
                        UPDATE user_page_tracking 
                        SET stay_duration = ?, leave_time = ?
                        WHERE session_id = ? AND page_name = ? AND leave_time IS NULL
                        ORDER BY enter_time DESC LIMIT 1
                    `, [duration || 0, new Date(leaveTime), sessionId, pageName]);
                    break;
                    
                case 'update':
                    // 更新停留时长（用于长时间停留的页面）
                    await db.execute(`
                        UPDATE user_page_tracking 
                        SET stay_duration = ?
                        WHERE session_id = ? AND page_name = ? AND leave_time IS NULL
                        ORDER BY enter_time DESC LIMIT 1
                    `, [duration || 0, sessionId, pageName]);
                    break;
                    
                default:
                    return res.status(400).json({
                        error: '无效的动作类型'
                    });
            }
            
            res.status(200).json({ success: true });
            
        } catch (error) {
            console.error('页面追踪数据保存失败:', error);
            res.status(500).json({
                error: '服务器内部错误'
            });
        }
    });
    
    // 获取追踪数据列表（管理员使用）
    router.get('/list', authenticateAdmin, checkPermission('user-tracking:view'), async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const limitNum = parseInt(limit);
            const offsetNum = (parseInt(page) - 1) * limitNum;
            
            // 简化查询，先不加筛选条件
            const records = await db.query(`
                SELECT 
                    id,
                    session_id,
                    user_type,
                    page_name,
                    stay_duration,
                    ip_address,
                    enter_time,
                    leave_time,
                    created_at
                FROM user_page_tracking 
                ORDER BY enter_time DESC 
                LIMIT ${limitNum} OFFSET ${offsetNum}
            `);
            
            // 查询总数
            const countResult = await db.query(`
                SELECT COUNT(*) as total 
                FROM user_page_tracking
            `);
            
            const total = (countResult && countResult.length > 0) ? countResult[0].total : 0;
            
            res.json({
                success: true,
                data: records,
                pagination: {
                    page: parseInt(page),
                    limit: limitNum,
                    total: total,
                    pages: Math.ceil(total / limitNum)
                }
            });
            
        } catch (error) {
            console.error('获取追踪数据失败:', error);
            res.status(500).json({
                error: '服务器内部错误'
            });
        }
    });
    
    // 获取统计数据（管理员使用）
    router.get('/statistics', authenticateAdmin, checkPermission('user-tracking:stats'), async (req, res) => {
        try {
            const { startDate, endDate, groupBy = 'page' } = req.query;
            
            let dateFilter = '';
            let params = [];
            
            if (startDate) {
                dateFilter += ' AND enter_time >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                dateFilter += ' AND enter_time <= ?';
                params.push(endDate + ' 23:59:59');
            }
            
            // 基础统计数据
            const [basicStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_visits,
                    COUNT(DISTINCT session_id) as unique_visitors,
                    COUNT(DISTINCT CASE WHEN user_type = 'guest' THEN session_id END) as guest_visitors,
                    COUNT(DISTINCT CASE WHEN user_type = 'member' THEN session_id END) as member_visitors,
                    AVG(stay_duration) as avg_duration,
                    SUM(stay_duration) as total_duration
                FROM user_page_tracking 
                WHERE 1=1 ${dateFilter}
            `, params);
            
            // 按页面统计
            const [pageStats] = await db.execute(`
                SELECT 
                    page_name,
                    COUNT(*) as visits,
                    COUNT(DISTINCT session_id) as unique_visitors,
                    AVG(stay_duration) as avg_duration,
                    SUM(stay_duration) as total_duration
                FROM user_page_tracking 
                WHERE 1=1 ${dateFilter}
                GROUP BY page_name
                ORDER BY visits DESC
            `, params);
            
            // 按用户类型统计
            const [userTypeStats] = await db.execute(`
                SELECT 
                    user_type,
                    COUNT(*) as visits,
                    COUNT(DISTINCT session_id) as unique_visitors,
                    AVG(stay_duration) as avg_duration,
                    SUM(stay_duration) as total_duration
                FROM user_page_tracking 
                WHERE 1=1 ${dateFilter}
                GROUP BY user_type
                ORDER BY visits DESC
            `, params);
            
            // 按时间统计（按天）
            const [timeStats] = await db.execute(`
                SELECT 
                    DATE(enter_time) as date,
                    COUNT(*) as visits,
                    COUNT(DISTINCT session_id) as unique_visitors,
                    AVG(stay_duration) as avg_duration
                FROM user_page_tracking 
                WHERE 1=1 ${dateFilter}
                GROUP BY DATE(enter_time)
                ORDER BY date DESC
                LIMIT 30
            `, params);
            
            // 页面流转统计（简化版本）
            const [flowStats] = await db.execute(`
                SELECT 
                    t1.page_name as from_page,
                    t2.page_name as to_page,
                    COUNT(*) as count
                FROM user_page_tracking t1
                JOIN user_page_tracking t2 ON t1.session_id = t2.session_id 
                    AND t2.enter_time > t1.enter_time
                WHERE t1.enter_time >= IFNULL(?, '1970-01-01') ${dateFilter.replace('enter_time', 't1.enter_time')}
                GROUP BY t1.page_name, t2.page_name
                HAVING count > 1
                ORDER BY count DESC
                LIMIT 20
            `, [startDate || '1970-01-01', ...params]);
            
            res.json({
                success: true,
                data: {
                    basic: basicStats[0],
                    pages: pageStats,
                    userTypes: userTypeStats,
                    timeStats: timeStats,
                    flowStats: flowStats
                }
            });
            
        } catch (error) {
            console.error('获取统计数据失败:', error);
            res.status(500).json({
                error: '服务器内部错误'
            });
        }
    });
    
    // 导出追踪数据（管理员使用）
    router.get('/export', authenticateAdmin, checkPermission('user-tracking:export'), async (req, res) => {
        try {
            const { startDate, endDate, userType, pageName } = req.query;
            
            let whereClause = '1=1';
            let params = [];
            
            if (userType) {
                whereClause += ' AND user_type = ?';
                params.push(userType);
            }
            
            if (pageName) {
                whereClause += ' AND page_name LIKE ?';
                params.push(`%${pageName}%`);
            }
            
            if (startDate) {
                whereClause += ' AND enter_time >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                whereClause += ' AND enter_time <= ?';
                params.push(endDate + ' 23:59:59');
            }
            
            const records = await db.query(`
                SELECT 
                    session_id,
                    user_type,
                    page_name,
                    stay_duration,
                    ip_address,
                    enter_time,
                    leave_time,
                    created_at
                FROM user_page_tracking 
                WHERE ${whereClause}
                ORDER BY enter_time DESC
            `, params);
            
            const filename = `tracking_data_${new Date().toISOString().split('T')[0]}.json`;
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.json({
                success: true,
                data: records,
                exportTime: new Date().toISOString(),
                totalRecords: records.length
            });
            
        } catch (error) {
            console.error('导出追踪数据失败:', error);
            res.status(500).json({
                error: '服务器内部错误'
            });
        }
    });
    
    return router;
}

module.exports = createTrackingRoutes;