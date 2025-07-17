# 礼品卡发放系统 - Docker Desktop Windows 自动安装脚本
# PowerShell 脚本，需要管理员权限运行

param(
    [switch]$Force = $false
)

# 颜色定义
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Cyan"
    White = "White"
}

# 日志函数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    switch ($Level) {
        "INFO" { 
            Write-Host "[$timestamp] [INFO] $Message" -ForegroundColor $Colors.Blue
        }
        "SUCCESS" { 
            Write-Host "[$timestamp] [SUCCESS] $Message" -ForegroundColor $Colors.Green
        }
        "WARNING" { 
            Write-Host "[$timestamp] [WARNING] $Message" -ForegroundColor $Colors.Yellow
        }
        "ERROR" { 
            Write-Host "[$timestamp] [ERROR] $Message" -ForegroundColor $Colors.Red
        }
    }
}

# 检查管理员权限
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 检查 Windows 版本
function Test-WindowsVersion {
    $version = [System.Environment]::OSVersion.Version
    $build = (Get-ItemProperty "HKLM:SOFTWARE\Microsoft\Windows NT\CurrentVersion").ReleaseId
    
    Write-Log "Windows 版本: $($version.Major).$($version.Minor) Build $build"
    
    if ($version.Major -lt 10) {
        Write-Log "Docker Desktop 需要 Windows 10 或更高版本" "ERROR"
        return $false
    }
    
    return $true
}

# 检查 WSL2 功能
function Test-WSL2 {
    try {
        $wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
        $vmFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
        
        $wslEnabled = $wslFeature.State -eq "Enabled"
        $vmEnabled = $vmFeature.State -eq "Enabled"
        
        Write-Log "WSL2 状态: $(if($wslEnabled) {'已启用'} else {'未启用'})"
        Write-Log "虚拟机平台状态: $(if($vmEnabled) {'已启用'} else {'未启用'})"
        
        return @{
            WSL = $wslEnabled
            VM = $vmEnabled
            Both = $wslEnabled -and $vmEnabled
        }
    }
    catch {
        Write-Log "检查 WSL2 功能时出错: $($_.Exception.Message)" "ERROR"
        return @{ WSL = $false; VM = $false; Both = $false }
    }
}

# 启用 WSL2 功能
function Enable-WSL2 {
    Write-Log "启用 WSL2 和虚拟机平台功能..."
    
    try {
        # 启用 WSL
        Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart
        
        # 启用虚拟机平台
        Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart
        
        Write-Log "WSL2 功能已启用，需要重启系统" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "启用 WSL2 功能失败: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# 检查 Docker Desktop 是否已安装
function Test-DockerDesktop {
    $dockerPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
    $dockerPathx86 = "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
    
    if (Test-Path $dockerPath) {
        Write-Log "Docker Desktop 已安装: $dockerPath" "SUCCESS"
        return $true
    }
    elseif (Test-Path $dockerPathx86) {
        Write-Log "Docker Desktop 已安装: $dockerPathx86" "SUCCESS"
        return $true
    }
    else {
        Write-Log "Docker Desktop 未安装" "WARNING"
        return $false
    }
}

# 检查 Docker 服务状态
function Test-DockerService {
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            Write-Log "Docker 版本: $dockerVersion" "SUCCESS"
            return $true
        }
        else {
            Write-Log "Docker 命令不可用" "WARNING"
            return $false
        }
    }
    catch {
        Write-Log "Docker 服务未运行" "WARNING"
        return $false
    }
}

# 下载 Docker Desktop
function Get-DockerDesktop {
    $downloadUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    $installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
    
    Write-Log "下载 Docker Desktop 安装程序..."
    Write-Log "下载地址: $downloadUrl"
    
    try {
        # 使用 Invoke-WebRequest 下载
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
        
        if (Test-Path $installerPath) {
            $fileSize = (Get-Item $installerPath).Length / 1MB
            Write-Log "下载完成，文件大小: $([math]::Round($fileSize, 2)) MB" "SUCCESS"
            return $installerPath
        }
        else {
            Write-Log "下载失败，文件不存在" "ERROR"
            return $null
        }
    }
    catch {
        Write-Log "下载 Docker Desktop 失败: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

# 安装 Docker Desktop
function Install-DockerDesktop {
    param([string]$InstallerPath)
    
    Write-Log "安装 Docker Desktop..."
    Write-Log "这可能需要几分钟时间，请耐心等待..."
    
    try {
        # 静默安装 Docker Desktop
        $process = Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet" -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Log "Docker Desktop 安装成功" "SUCCESS"
            return $true
        }
        else {
            Write-Log "Docker Desktop 安装失败，退出代码: $($process.ExitCode)" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "安装 Docker Desktop 时出错: $($_.Exception.Message)" "ERROR"
        return $false
    }
    finally {
        # 清理安装文件
        if (Test-Path $installerPath) {
            Remove-Item $installerPath -Force
        }
    }
}

# 启动 Docker Desktop
function Start-DockerDesktop {
    $dockerPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
    
    if (-not (Test-Path $dockerPath)) {
        $dockerPath = "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
    }
    
    if (Test-Path $dockerPath) {
        Write-Log "启动 Docker Desktop..."
        try {
            Start-Process -FilePath $dockerPath
            Write-Log "Docker Desktop 已启动" "SUCCESS"
            return $true
        }
        catch {
            Write-Log "启动 Docker Desktop 失败: $($_.Exception.Message)" "ERROR"
            return $false
        }
    }
    else {
        Write-Log "找不到 Docker Desktop 可执行文件" "ERROR"
        return $false
    }
}

# 等待 Docker 服务就绪
function Wait-DockerReady {
    Write-Log "等待 Docker 服务启动..."
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $result = docker info 2>$null
            if ($result) {
                Write-Log "Docker 服务已就绪" "SUCCESS"
                return $true
            }
        }
        catch {
            # 继续等待
        }
        
        $attempt++
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
    
    Write-Host ""
    Write-Log "等待 Docker 服务超时" "WARNING"
    return $false
}

# 验证安装
function Test-Installation {
    Write-Log "验证 Docker 安装..."
    
    # 检查 Docker 版本
    try {
        $dockerVersion = docker --version
        Write-Log "Docker 版本: $dockerVersion" "SUCCESS"
    }
    catch {
        Write-Log "Docker 命令验证失败" "ERROR"
        return $false
    }
    
    # 检查 Docker Compose 版本
    try {
        $composeVersion = docker compose version
        Write-Log "Docker Compose 版本: $composeVersion" "SUCCESS"
    }
    catch {
        Write-Log "Docker Compose 命令验证失败" "ERROR"
        return $false
    }
    
    # 测试 Docker 运行
    try {
        Write-Log "测试 Docker 运行..."
        docker run --rm hello-world | Out-Null
        Write-Log "Docker 运行测试通过" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "Docker 运行测试失败" "WARNING"
        return $false
    }
}

# 显示安装后说明
function Show-PostInstallInfo {
    Write-Host ""
    Write-Log "=== Docker Desktop 安装完成 ===" "SUCCESS"
    Write-Host ""
    Write-Log "接下来的步骤:"
    Write-Host "1. 确保 Docker Desktop 正在运行（查看系统托盘图标）"
    Write-Host "2. 打开 PowerShell 或命令提示符"
    Write-Host "3. 验证安装: docker --version"
    Write-Host "4. 启动项目: docker compose up -d"
    Write-Host ""
    Write-Log "项目相关命令:"
    Write-Host "• 启动服务: docker compose up -d"
    Write-Host "• 查看状态: docker compose ps"
    Write-Host "• 查看日志: docker compose logs -f app"
    Write-Host "• 停止服务: docker compose down"
    Write-Host ""
    Write-Log "管理员后台访问:"
    Write-Host "• 地址: http://localhost:3000/admin"
    Write-Host "• 用户名: admin"
    Write-Host "• 密码: admin123"
    Write-Host ""
    Write-Log "如果遇到问题，请尝试重启 Docker Desktop 或重启计算机"
}

# 主函数
function Main {
    Write-Host ""
    Write-Log "=== 礼品卡发放系统 - Docker Desktop 自动安装脚本 ===" "INFO"
    Write-Host ""
    
    # 检查管理员权限
    if (-not (Test-Administrator)) {
        Write-Log "此脚本需要管理员权限运行" "ERROR"
        Write-Log "请右键点击 PowerShell 并选择 '以管理员身份运行'" "ERROR"
        Read-Host "按任意键退出"
        exit 1
    }
    
    # 检查 Windows 版本
    if (-not (Test-WindowsVersion)) {
        Read-Host "按任意键退出"
        exit 1
    }
    
    # 检查现有安装
    $dockerInstalled = Test-DockerDesktop
    $dockerRunning = Test-DockerService
    
    if ($dockerInstalled -and $dockerRunning -and -not $Force) {
        Write-Log "Docker Desktop 已安装并运行" "SUCCESS"
        $response = Read-Host "是否要重新安装？(y/N)"
        if ($response -notmatch '^[Yy]') {
            Write-Log "跳过安装，显示使用说明"
            Show-PostInstallInfo
            Read-Host "按任意键退出"
            exit 0
        }
    }
    
    # 检查和启用 WSL2
    $wslStatus = Test-WSL2
    if (-not $wslStatus.Both) {
        Write-Log "需要启用 WSL2 功能"
        $response = Read-Host "是否要启用 WSL2 功能？(Y/n)"
        if ($response -notmatch '^[Nn]') {
            if (Enable-WSL2) {
                Write-Log "WSL2 功能已启用，请重启计算机后重新运行此脚本" "WARNING"
                Read-Host "按任意键退出"
                exit 0
            }
            else {
                Write-Log "启用 WSL2 功能失败" "ERROR"
                Read-Host "按任意键退出"
                exit 1
            }
        }
    }
    
    # 安装 Docker Desktop
    if (-not $dockerInstalled -or $Force) {
        Write-Log "开始安装 Docker Desktop..."
        
        # 下载安装程序
        $installerPath = Get-DockerDesktop
        if (-not $installerPath) {
            Write-Log "下载 Docker Desktop 失败" "ERROR"
            Read-Host "按任意键退出"
            exit 1
        }
        
        # 安装 Docker Desktop
        if (-not (Install-DockerDesktop -InstallerPath $installerPath)) {
            Write-Log "安装 Docker Desktop 失败" "ERROR"
            Read-Host "按任意键退出"
            exit 1
        }
    }
    
    # 启动 Docker Desktop
    if (-not $dockerRunning) {
        if (Start-DockerDesktop) {
            # 等待服务就绪
            Wait-DockerReady | Out-Null
        }
    }
    
    # 验证安装
    Write-Host ""
    if (Test-Installation) {
        Show-PostInstallInfo
    }
    else {
        Write-Log "安装验证失败，请检查 Docker Desktop 是否正常运行" "ERROR"
    }
    
    Read-Host "按任意键退出"
}

# 脚本入口
if ($MyInvocation.InvocationName -ne '.') {
    Main
}