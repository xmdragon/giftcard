# Docker 自动清理工具使用说明

## 📦 包含的脚本

### 1. `docker-auto-cleanup.sh`
生产环境的 Docker 自动清理脚本，具有以下特点：
- 智能清理策略（保留最近使用的资源）
- 详细的日志记录
- 磁盘空间监控和警告
- 安全的清理流程

### 2. `install-docker-cleanup.sh`
自动安装和配置脚本：
- 一键安装清理脚本
- 自动配置 cron 定时任务
- 配置日志轮转
- 支持卸载功能

### 3. `docker-monitor.sh`
Docker 空间监控工具：
- 实时监控 Docker 空间使用
- 显示容器、镜像、卷的大小
- 提供清理建议

## 🚀 快速开始

### 安装清理脚本

```bash
# 1. 以 root 权限运行安装脚本
sudo ./install-docker-cleanup.sh

# 2. 选择清理计划（推荐选项 2：每周日凌晨 3:00）
# 3. 选择是否立即执行测试清理
```

### 手动执行清理

```bash
# 立即执行清理
sudo /opt/docker-cleanup/docker-auto-cleanup.sh
```

### 监控 Docker 空间

```bash
# 单次检查
./docker-monitor.sh

# 实时监控模式（5秒刷新一次）
./docker-monitor.sh -m
```

## ⚙️ 清理策略

### 默认清理规则

| 资源类型 | 清理策略 | 保留时间 |
|---------|---------|---------|
| 停止的容器 | 清理超过 7 天的 | 7 天 |
| 未使用的镜像 | 清理超过 30 天未使用的 | 30 天 |
| 悬空镜像 | 全部清理 | - |
| 悬空卷 | 全部清理 | - |
| 构建缓存 | 清理超过 7 天的 | 7 天 |
| 未使用的网络 | 全部清理 | - |
| 清理日志 | 保留 30 天 | 30 天 |

### 修改清理策略

编辑 `/opt/docker-cleanup/docker-auto-cleanup.sh`：

```bash
# 修改保留时间（单位：小时）
# 例如：保留 3 天内的停止容器
docker container prune -f --filter "until=72h"

# 例如：保留 14 天内的未使用镜像
docker image prune -a -f --filter "until=336h"
```

## 📊 定时任务管理

### 查看当前定时任务

```bash
crontab -l
```

### 修改执行时间

```bash
crontab -e
# 修改 cron 表达式
# 例如：每天凌晨 4:00 执行
0 4 * * * /opt/docker-cleanup/docker-auto-cleanup.sh
```

### Cron 表达式说明

```
分 时 日 月 周
│  │  │  │  │
│  │  │  │  └─── 星期几 (0-7，0 和 7 都是星期日)
│  │  │  └────── 月份 (1-12)
│  │  └───────── 日期 (1-31)
│  └──────────── 小时 (0-23)
└─────────────── 分钟 (0-59)
```

常用示例：
- `0 2 * * *` - 每天凌晨 2:00
- `0 3 * * 0` - 每周日凌晨 3:00
- `0 3 1 * *` - 每月 1 号凌晨 3:00
- `0 */6 * * *` - 每 6 小时
- `0 2,14 * * *` - 每天 2:00 和 14:00

## 📝 日志管理

### 查看清理日志

```bash
# 查看今天的日志
tail -f /var/log/docker-cleanup/cleanup-$(date +%Y%m%d).log

# 查看所有日志
ls -la /var/log/docker-cleanup/

# 查看 cron 执行日志
tail -f /var/log/docker-cleanup/cron.log
```

### 日志轮转配置

日志轮转配置位于 `/etc/logrotate.d/docker-cleanup`：
- 每天轮转
- 保留 30 天
- 自动压缩

## 🔧 故障排除

### 1. 脚本没有按时执行

```bash
# 检查 cron 服务状态
systemctl status cron

# 查看 cron 日志
grep docker-cleanup /var/log/syslog
```

### 2. 磁盘空间仍然不足

```bash
# 执行更激进的清理
docker system prune -a --volumes -f

# 检查 Docker 根目录
du -sh /var/lib/docker/*
```

### 3. 容器日志过大

在 `docker-compose.yml` 中添加日志限制：

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🗑️ 卸载

```bash
# 卸载清理脚本和定时任务
sudo ./install-docker-cleanup.sh uninstall
```

## ⚠️ 注意事项

1. **生产环境谨慎使用**：首次使用建议在测试环境验证
2. **数据备份**：清理卷之前确保已备份重要数据
3. **监控告警**：建议配置磁盘空间监控告警
4. **定期检查**：定期检查清理日志，确保脚本正常工作

## 📞 支持

如有问题，请查看日志文件或联系系统管理员。

---
*最后更新：2024*