const db = require('./db');

class AdminSecurityService {
    
    /**
     * 检查IP是否被禁用（包括永久和临时）
     * @param {string} ipAddress - IP地址
     * @returns {Object} - {blocked: boolean, type: 'permanent'|'temporary'|null, remaining: number|null}
     */
    async checkIPRestriction(ipAddress) {
        try {
            const restrictionResult = await db.query(
                'SELECT * FROM admin_ip_restrictions WHERE ip_address = ? AND status = "active"',
                [ipAddress]
            );
            
            if (restrictionResult.length > 0) {
                const restriction = restrictionResult[0];
                
                if (restriction.restriction_type === 'permanent') {
                    return {
                        blocked: true,
                        type: 'permanent',
                        remaining: null,
                        reason: restriction.reason || '该IP已被永久禁用'
                    };
                } else if (restriction.restriction_type === 'temporary') {
                    if (restriction.end_time && new Date(restriction.end_time) > new Date()) {
                        const remaining = Math.ceil((new Date(restriction.end_time) - new Date()) / 1000 / 60); // Minutes
                        
                        return {
                            blocked: true,
                            type: 'temporary',
                            remaining: remaining,
                            reason: restriction.reason
                        };
                    } else {
                        await db.query(
                            'UPDATE admin_ip_restrictions SET status = "expired" WHERE id = ?',
                            [restriction.id]
                        );
                    }
                }
            }

            await this.cleanExpiredRestrictions();

            return {
                blocked: false,
                type: null,
                remaining: null
            };

        } catch (error) {
            console.error('检查IP限制错误:', error);
            return {
                blocked: false,
                type: null,
                remaining: null
            };
        }
    }

    /**
     * 记录登录失败
     * @param {string} ipAddress - IP地址
     * @param {string} username - 用户名
     * @param {string} failureType - 失败类型
     * @param {string} userAgent - 用户代理
     */
    async recordLoginFailure(ipAddress, username, failureType = 'wrong_password', userAgent = '') {
        try {
            await db.query(
                'INSERT INTO admin_login_failures (ip_address, username, failure_type, user_agent) VALUES (?, ?, ?, ?)',
                [ipAddress, username, failureType, userAgent]
            );

            await this.checkAndApplyRestrictions(ipAddress);
            
        } catch (error) {
            console.error('记录登录失败错误:', error);
        }
    }

    /**
     * 检查并应用IP限制
     * @param {string} ipAddress - IP地址
     */
    async checkAndApplyRestrictions(ipAddress) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const todayFailures = await db.query(
                'SELECT COUNT(*) as count FROM admin_login_failures WHERE ip_address = ? AND DATE(attempted_at) = ?',
                [ipAddress, today]
            );
            
            const failureCount = todayFailures[0].count;

            if (failureCount >= 5) {
                await this.addPermanentRestriction(ipAddress, failureCount);
                return;
            }

            if (failureCount >= 3) {
                await this.addTempRestriction(ipAddress, failureCount);
            }

        } catch (error) {
            console.error('检查并应用IP限制错误:', error);
        }
    }

    /**
     * 添加永久限制
     * @param {string} ipAddress - IP地址
     * @param {number} failureCount - 失败次数
     */
    async addPermanentRestriction(ipAddress, failureCount) {
        try {
            const existing = await db.query(
                'SELECT * FROM admin_ip_restrictions WHERE ip_address = ? AND status = "active"',
                [ipAddress]
            );

            const reason = `管理员登录当天密码错误${failureCount}次，自动永久禁用`;

            if (existing.length > 0) {
                await db.query(
                    'UPDATE admin_ip_restrictions SET restriction_type = "permanent", end_time = NULL, reason = ?, failure_count = ?, start_time = NOW() WHERE ip_address = ? AND status = "active"',
                    [reason, failureCount, ipAddress]
                );
            } else {
                await db.query(
                    'INSERT INTO admin_ip_restrictions (ip_address, restriction_type, end_time, failure_count, reason, status) VALUES (?, "permanent", NULL, ?, ?, "active")',
                    [ipAddress, failureCount, reason]
                );
            }

            console.log(`IP ${ipAddress} 已被永久禁用，原因：${reason}`);

        } catch (error) {
            console.error('添加永久限制错误:', error);
        }
    }

    /**
     * 添加临时限制（1小时）
     * @param {string} ipAddress - IP地址
     * @param {number} failureCount - 失败次数
     */
    async addTempRestriction(ipAddress, failureCount) {
        try {
            const existing = await db.query(
                'SELECT * FROM admin_ip_restrictions WHERE ip_address = ? AND status = "active"',
                [ipAddress]
            );

            const endTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            const reason = `管理员登录密码错误${failureCount}次，临时禁用1小时`;

            if (existing.length > 0) {
                await db.query(
                    'UPDATE admin_ip_restrictions SET restriction_type = "temporary", end_time = ?, reason = ?, failure_count = ?, start_time = NOW() WHERE ip_address = ? AND status = "active"',
                    [endTime, reason, failureCount, ipAddress]
                );
            } else {
                await db.query(
                    'INSERT INTO admin_ip_restrictions (ip_address, restriction_type, end_time, failure_count, reason, status) VALUES (?, "temporary", ?, ?, ?, "active")',
                    [ipAddress, endTime, failureCount, reason]
                );
            }

            console.log(`IP ${ipAddress} 已被临时禁用1小时，原因：${reason}`);

        } catch (error) {
            console.error('添加临时限制错误:', error);
        }
    }

    /**
     * 清理过期的限制
     */
    async cleanExpiredRestrictions() {
        try {
            await db.query(
                'UPDATE admin_ip_restrictions SET status = "expired" WHERE status = "active" AND restriction_type = "temporary" AND end_time <= NOW()'
            );
        } catch (error) {
            console.error('清理过期限制错误:', error);
        }
    }

    /**
     * 获取IP的失败统计（今天）
     * @param {string} ipAddress - IP地址
     * @returns {Object} - {count: number, lastAttempt: Date}
     */
    async getIPFailureStats(ipAddress) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const result = await db.query(
                'SELECT COUNT(*) as count, MAX(attempted_at) as lastAttempt FROM admin_login_failures WHERE ip_address = ? AND DATE(attempted_at) = ?',
                [ipAddress, today]
            );

            return {
                count: result[0].count,
                lastAttempt: result[0].lastAttempt
            };
        } catch (error) {
            console.error('获取IP失败统计错误:', error);
            return { count: 0, lastAttempt: null };
        }
    }

    /**
     * 手动移除IP限制（管理员操作）
     * @param {string} ipAddress - IP地址
     * @param {string} type - 限制类型 'temporary' | 'permanent'
     */
    async removeIPRestriction(ipAddress, type) {
        try {
            if (type) {
                await db.query(
                    'UPDATE admin_ip_restrictions SET status = "removed" WHERE ip_address = ? AND restriction_type = ? AND status = "active"',
                    [ipAddress, type]
                );
            } else {
                await db.query(
                    'UPDATE admin_ip_restrictions SET status = "removed" WHERE ip_address = ? AND status = "active"',
                    [ipAddress]
                );
            }
            
            console.log(`已移除IP ${ipAddress} 的${type ? (type === 'permanent' ? '永久' : '临时') : '所有'}限制`);
        } catch (error) {
            console.error('移除IP限制错误:', error);
        }
    }
}

module.exports = new AdminSecurityService();