/**
 * 获取客户端真实IP地址
 * 在容器环境中，需要从代理头部获取真实IP
 */
function getRealIP(req) {
    // 优先级顺序：
    // 1. X-Real-IP (Nginx 设置的真实IP)
    // 2. X-Forwarded-For (可能包含多个IP，取第一个)
    // 3. req.connection.remoteAddress (直接连接的IP)
    
    let ip = null;
    
    // 尝试从 X-Real-IP 获取
    if (req.headers['x-real-ip']) {
        ip = req.headers['x-real-ip'];
    }
    // 尝试从 X-Forwarded-For 获取
    else if (req.headers['x-forwarded-for']) {
        // X-Forwarded-For 可能包含多个IP，格式：client, proxy1, proxy2
        const ips = req.headers['x-forwarded-for'].split(',');
        ip = ips[0].trim();
    }
    // 尝试从 req.ip 获取（Express 会自动处理一些代理头部）
    else if (req.ip) {
        ip = req.ip;
    }
    // 最后从连接获取
    else if (req.connection && req.connection.remoteAddress) {
        ip = req.connection.remoteAddress;
    }
    // 如果还是没有，从 socket 获取
    else if (req.socket && req.socket.remoteAddress) {
        ip = req.socket.remoteAddress;
    }
    
    // 清理 IPv6 格式的 IPv4 地址（::ffff:192.168.1.1 -> 192.168.1.1）
    if (ip && ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }
    
    // 如果是 IPv6 地址（包含冒号但不是 IPv4），在某些场景下可能需要特殊处理
    // 这里暂时返回空，避免处理复杂的 IPv6 地址
    if (ip && ip.includes(':') && !ip.includes('.')) {
        // 这是纯 IPv6 地址，根据需求决定是否支持
        // return ip; // 如果需要支持 IPv6
        return ''; // 如果暂不支持 IPv6
    }
    
    return ip || '';
}

module.exports = getRealIP;