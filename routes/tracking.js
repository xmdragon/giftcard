const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

function createTrackingRoutes(io) {
    const db = require('../utils/db');
    
    const authenticateAdmin = async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: '需要管理员认证' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            const adminId = decoded.adminId || decoded.id; // Compatible with different JWT field names
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
            
            if (!sessionId || !pageName || !action) {
                return res.status(400).json({
                    error: '缺少必要字段'
                });
            }
            
            switch (action) {
                case 'enter':
                    await db.execute(`
                        INSERT INTO user_page_tracking 
                        (session_id, user_type, page_name, ip_address, enter_time, user_agent) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [sessionId, userType || 'guest', pageName, ip, new Date(enterTime), userAgent]);
                    break;
                    
                case 'leave':
                    await db.execute(`
                        UPDATE user_page_tracking 
                        SET stay_duration = ?, leave_time = ?
                        WHERE session_id = ? AND page_name = ? AND leave_time IS NULL
                        ORDER BY enter_time DESC LIMIT 1
                    `, [duration || 0, new Date(leaveTime), sessionId, pageName]);
                    break;
                    
                case 'update':
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
    
    router.get('/list', authenticateAdmin, checkPermission('user-tracking:view'), async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const limitNum = parseInt(limit);
            const offsetNum = (parseInt(page) - 1) * limitNum;
            
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
    
    router.get('/statistics', authenticateAdmin, checkPermission('user-tracking:stats'), async (req, res) => {
        try {
            console.log('开始获取用户行为统计数据');
            const { startDate, endDate } = req.query;
            
            const tableExistsResult = await db.query(`
                SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_schema = 'gift_card_system' AND table_name = 'user_page_tracking'
            `);
            
            console.log('表存在检查结果:', tableExistsResult);
            
            if (!tableExistsResult || tableExistsResult.length === 0 || tableExistsResult[0].count === 0) {
                console.log('user_page_tracking表不存在，返回空数据');
                return res.json({
                    success: true,
                    data: {
                        basic: {
                            total_visits: 0,
                            unique_visitors: 0,
                            guest_visitors: 0,
                            member_visitors: 0,
                            avg_duration: 0,
                            total_duration: 0
                        },
                        pages: [],
                        userTypes: [],
                        timeStats: [],
                        flowStats: []
                    }
                });
            }
            
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
            
            console.log('日期筛选条件:', dateFilter, params);
            
            const basicStatsResult = await db.query(`
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
            
            console.log('基础统计查询结果:', basicStatsResult);
            
            const basicStats = basicStatsResult && basicStatsResult.length > 0 ? basicStatsResult[0] : {
                total_visits: 0,
                unique_visitors: 0, 
                guest_visitors: 0,
                member_visitors: 0,
                avg_duration: 0,
                total_duration: 0
            };
            
            const pageStats = await db.query(`
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
            
            const userTypeStats = await db.query(`
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
            
            const timeStats = await db.query(`
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
            
            console.log('统计数据准备完成，返回结果');
            
            res.json({
                success: true,
                data: {
                    basic: basicStats,
                    pages: pageStats || [],
                    userTypes: userTypeStats || [],
                    timeStats: timeStats || [],
                    flowStats: [] // Temporarily simplified, no page flow statistics
                }
            });
            
        } catch (error) {
            console.error('获取统计数据失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误: ' + error.message
            });
        }
    });
    
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