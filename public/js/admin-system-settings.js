AdminApp.prototype.initSystemSettingsSection = function() {
    if (this.currentAdmin && this.currentAdmin.role !== 'super' && !this.hasPermissionPoint('system-settings:view')) {
        const container = document.getElementById('systemSettingsContent');
        if (container) {
            container.innerHTML = '<div class="error">您没有权限查看系统设置</div>';
        }
        return;
    }
    
    this.bindSystemSettingsEvents();
    
    this.loadSystemSettings();
};

AdminApp.prototype.bindSystemSettingsEvents = function() {
    const refreshBtn = document.getElementById('refreshSettings');
    if (refreshBtn) {
        refreshBtn.replaceWith(refreshBtn.cloneNode(true));
        const newRefreshBtn = document.getElementById('refreshSettings');
        newRefreshBtn.addEventListener('click', () => {
            this.loadSystemSettings();
        });
    }
};

AdminApp.prototype.loadSystemSettings = async function() {
    const container = document.getElementById('systemSettingsContent');
    if (!container) {
        console.error('systemSettingsContent 容器未找到');
        return;
    }
    
    container.innerHTML = '加载中...';
    
    try {
        const response = await fetch('/api/admin/system-settings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const settings = await response.json();
            this.renderSystemSettings(settings);
        } else {
            throw new Error(`API请求失败: ${response.status}`);
        }
    } catch (error) {
        console.error('加载系统设置失败:', error);
        container.innerHTML = `<div class="error">加载系统设置失败: ${error.message}</div>`;
    }
};

AdminApp.prototype.renderSystemSettings = function(settings) {
    const container = document.getElementById('systemSettingsContent');
    if (!container) return;
    
    if (!settings || settings.length === 0) {
        container.innerHTML = '<div class="no-data">暂无系统设置项</div>';
        return;
    }
    
    const canEdit = this.currentAdmin && (this.currentAdmin.role === 'super' || this.hasPermissionPoint('system-settings:edit'));
    
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>设置名称</th>
                    <th>当前值</th>
                    <th>描述</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    settings.forEach(setting => {
        const isBoolean = setting.setting_value === 'true' || setting.setting_value === 'false';
        const isLanguageSetting = setting.setting_key === 'default_language';
        
        let displayValue = setting.setting_value;
        if (isBoolean) {
            displayValue = setting.setting_value === 'true' ? '是' : '否';
        } else if (isLanguageSetting) {
            switch(setting.setting_value) {
                case 'auto':
                    displayValue = '自动 (根据IP归属地)';
                    break;
                case 'zh':
                    displayValue = '中文';
                    break;
                case 'en':
                    displayValue = 'English';
                    break;
                case 'ja':
                    displayValue = '日本語';
                    break;
                case 'ko':
                    displayValue = '한국어';
                    break;
                default:
                    displayValue = setting.setting_value;
            }
        }
        
        html += `
            <tr>
                <td>${setting.setting_key}</td>
                <td><strong>${displayValue}</strong></td>
                <td>${setting.description || '-'}</td>
                <td>
        `;
        
        if (canEdit) {
            html += `<button class="btn btn-primary btn-sm edit-setting-btn" data-key="${setting.setting_key}" data-value="${setting.setting_value}" data-desc="${setting.description || ''}">编辑</button>`;
        } else {
            html += '<span class="text-muted">无权限</span>';
        }
        
        html += `</td></tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    if (canEdit) {
        container.querySelectorAll('.edit-setting-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                const value = e.target.dataset.value;
                const desc = e.target.dataset.desc;
                this.showEditSettingModal(key, value, desc);
            });
        });
    }
};

AdminApp.prototype.showEditSettingModal = function(key, currentValue, description) {
    const isBoolean = currentValue === 'true' || currentValue === 'false';
    const isLanguageSetting = key === 'default_language';
    
    let content = `
        <div class="modal-header">
            <h3>编辑系统设置</h3>
        </div>
        <form id="editSettingForm" class="modal-form">
            <div class="form-group">
                <label>设置名称</label>
                <input type="text" value="${key}" disabled class="form-control">
            </div>
            <div class="form-group">
                <label>描述</label>
                <input type="text" value="${description}" disabled class="form-control">
            </div>
            <div class="form-group">
                <label>设置值</label>
    `;
    
    if (isBoolean) {
        content += `
                <select id="settingValue" class="form-control">
                    <option value="true" ${currentValue === 'true' ? 'selected' : ''}>是 (true)</option>
                    <option value="false" ${currentValue === 'false' ? 'selected' : ''}>否 (false)</option>
                </select>
        `;
    } else if (isLanguageSetting) {
        content += `
                <select id="settingValue" class="form-control">
                    <option value="auto" ${currentValue === 'auto' ? 'selected' : ''}>自动 (根据IP归属地)</option>
                    <option value="zh" ${currentValue === 'zh' ? 'selected' : ''}>中文</option>
                    <option value="en" ${currentValue === 'en' ? 'selected' : ''}>English</option>
                    <option value="ja" ${currentValue === 'ja' ? 'selected' : ''}>日本語</option>
                    <option value="ko" ${currentValue === 'ko' ? 'selected' : ''}>한국어</option>
                </select>
        `;
    } else {
        content += `
                <input type="text" id="settingValue" value="${currentValue}" class="form-control">
        `;
    }
    
    content += `
            </div>
            <div class="form-actions" style="margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="adminApp.closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;
    
    this.showModal('编辑系统设置', content);
    
    document.getElementById('editSettingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newValue = document.getElementById('settingValue').value;
        await this.updateSystemSetting(key, newValue);
    });
};

AdminApp.prototype.updateSystemSetting = async function(key, value) {
    try {
        const response = await fetch(`/api/admin/system-settings/${key}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value })
        });
        
        if (response.ok) {
            this.closeModal();
            this.loadSystemSettings(); // Reload data
            alert('设置已更新');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || '更新失败');
        }
    } catch (error) {
        console.error('更新系统设置失败:', error);
        alert('更新设置失败: ' + error.message);
    }
}; 