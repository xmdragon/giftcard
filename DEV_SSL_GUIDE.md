# 开发环境 SSL 测试指南

## 快速开始

### 1. 生成自签名证书
```bash
./dev-ssl-setup.sh
```

### 2. 启动服务
```bash
docker compose up -d
```

### 3. 测试访问
- HTTP: http://localhost (会自动重定向到 HTTPS)
- HTTPS: https://localhost
- 直接访问应用: http://localhost:3000

## 详细说明

### 自签名证书 vs 真实证书

| 类型 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 自签名证书 | 免费、快速、本地开发 | 浏览器警告、不受信任 | 开发环境 |
| Let's Encrypt | 免费、受信任 | 需要域名、需要公网访问 | 生产环境 |
| 商业证书 | 受信任、支持广泛 | 收费 | 企业环境 |

### 浏览器处理自签名证书

#### Chrome/Edge
1. 访问 https://localhost
2. 点击"高级"
3. 点击"继续前往 localhost（不安全）"

#### Firefox
1. 访问 https://localhost
2. 点击"高级"
3. 点击"接受风险并继续"

#### Safari
1. 访问 https://localhost
2. 点击"显示详细信息"
3. 点击"访问此网站"

### 开发环境配置

#### 1. 证书配置
- 证书文件: `ssl/fullchain.pem`
- 私钥文件: `ssl/privkey.pem`
- 有效期: 365天
- 支持的域名: localhost, 127.0.0.1

#### 2. Nginx 配置
- HTTP 端口: 80 (重定向到 HTTPS)
- HTTPS 端口: 443
- SSL 协议: TLSv1.2, TLSv1.3
- 反向代理: 转发到 app:3000

#### 3. Docker 配置
- 端口映射: 80:80, 443:443
- 证书挂载: `./ssl:/etc/nginx/ssl:ro`
- 网络: gift_card_network

### 故障排除

#### 1. 证书错误
```bash
# 检查证书文件是否存在
ls -la ssl/

# 重新生成证书
rm -f ssl/fullchain.pem ssl/privkey.pem
./dev-ssl-setup.sh
```

#### 2. 端口被占用
```bash
# 检查端口占用
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :80

# 停止占用端口的服务
sudo systemctl stop apache2  # 如果 Apache 占用
sudo systemctl stop nginx    # 如果本地 Nginx 占用
```

#### 3. 容器启动失败
```bash
# 查看容器日志
docker compose logs nginx
docker compose logs app

# 重启服务
docker compose down
docker compose up -d
```

#### 4. 浏览器缓存问题
- 清除浏览器缓存
- 使用无痕模式测试
- 强制刷新 (Ctrl+F5)

### 高级配置

#### 1. 使用 mkcert（推荐）
```bash
# 安装 mkcert
sudo apt install mkcert

# 安装本地 CA
mkcert -install

# 生成证书
mkcert localhost 127.0.0.1 ::1

# 复制到项目
cp localhost+2.pem ssl/fullchain.pem
cp localhost+2-key.pem ssl/privkey.pem
```

#### 2. 自定义域名
```bash
# 编辑 /etc/hosts
echo "127.0.0.1 dev.example.com" | sudo tee -a /etc/hosts

# 生成证书时使用自定义域名
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/C=CN/ST=State/L=City/O=Development/CN=dev.example.com" \
  -addext "subjectAltName=DNS:dev.example.com,DNS:localhost,IP:127.0.0.1"
```

#### 3. 开发工具配置
```bash
# 配置 curl 忽略证书验证
curl -k https://localhost

# 配置 wget 忽略证书验证
wget --no-check-certificate https://localhost
```

### 安全注意事项

1. **仅用于开发环境**: 自签名证书不应在生产环境使用
2. **本地访问**: 证书仅对 localhost 有效
3. **定期更新**: 开发证书建议每年更新一次
4. **团队共享**: 团队成员可以共享相同的自签名证书

### 生产环境迁移

当准备部署到生产环境时：

1. 获取真实的 SSL 证书（Let's Encrypt 或商业证书）
2. 更新 `nginx.conf` 中的 `server_name`
3. 替换 `ssl/` 目录中的证书文件
4. 更新 `docker-compose.yml` 中的域名配置
5. 使用 `update-domain.sh` 脚本自动化部署

---

## 总结

开发环境 SSL 测试的核心是：
1. ✅ 生成自签名证书
2. ✅ 正确配置 Nginx 和 Docker
3. ✅ 处理浏览器安全警告
4. ✅ 验证 HTTPS 功能正常

这样你就可以在本地开发环境中完整测试 HTTPS 功能了！ 