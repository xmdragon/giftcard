// 系统设置相关方法

AdminApp.prototype.addSystemSettingsMenuItem = function() {
    if (!this.hasPermissionPoint('system-settings:view')) return;
    const nav = document.querySelector('nav ul');
    if (!nav) {
        console.error('导航菜单未找到');
        return;
    }
    if (nav.querySelector('#systemSettingsBtn')) return;
    const settingsItem = document.createElement('li');
    settingsItem.innerHTML = '<button id="systemSettingsBtn" class="nav-button"><i class="fas fa-cog"></i> 系统设置</button>';
    nav.appendChild(settingsItem);
    const systemSettingsBtn = document.getElementById('systemSettingsBtn');
    if (systemSettingsBtn) {
        systemSettingsBtn.addEventListener('click', () => {
            this.showSystemSettings();
        });
    }
};

AdminApp.prototype.showSystemSettings = function() {
    if (!this.hasPermissionPoint('system-settings:view')) {
        alert('无权访问系统设置');
        return;
    }
    let settingsSection = document.getElementById('systemSettingsSection');
    if (!settingsSection) {
        const main = document.querySelector('main');
        settingsSection = document.createElement('section');
        settingsSection.id = 'systemSettingsSection';
        settingsSection.className = 'admin-section';
        main.appendChild(settingsSection);
    }
    this.switchSection('systemSettings');
    this.loadSystemSettings();
};

AdminApp.prototype.loadSystemSettings = async function() {
    try {
        const response = await this.apiRequest('/api/admin/system-settings');
        if (response && response.ok) {
            const settings = await response.json();
            this.displaySystemSettings(settings);
        } else {
            throw new Error('获取系统设置失败');
        }
    } catch (error) {
        console.error('加载系统设置错误:', error);
        document.getElementById('systemSettingsSection').innerHTML = '<p class="error-message">加载系统设置失败</p>';
    }
};

AdminApp.prototype.displaySystemSettings = function(settings) {
    const container = document.getElementById('systemSettingsSection');
    let html = `
        <h2>系统设置</h2>
        <div class="settings-container">
            <table>
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
    const canEdit = this.hasPermissionPoint('system-settings:edit');
    settings.forEach(setting => {
        const isBoolean = setting.setting_value === 'true' || setting.setting_value === 'false';
        const displayValue = isBoolean ? (setting.setting_value === 'true' ? '是' : '否') : setting.setting_value;
        html += `
            <tr data-key="${setting.setting_key}">
                <td>${setting.setting_key}</td>
                <td>${displayValue}</td>
                <td>${setting.description || ''}</td>
                <td>`;
        if (canEdit) {
            html += `<button class="edit-setting-btn" data-key="${setting.setting_key}" data-value="${setting.setting_value}">编辑</button>`;
        } else {
            html += `<span style='color:#aaa'>无权限</span>`;
        }
        html += `</td></tr>`;
    });
    html += `
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
    if (canEdit) {
        document.querySelectorAll('.edit-setting-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                const currentValue = e.target.dataset.value;
                this.showEditSettingModal(key, currentValue);
            });
        });
    }
};

AdminApp.prototype.showEditSettingModal = function(key, currentValue) {
    if (!this.hasPermissionPoint('system-settings:edit')) {
        alert('无权编辑系统设置');
        return;
    }
    const isBoolean = currentValue === 'true' || currentValue === 'false';
    let content = `
        <form id="editSettingForm">
            <div class="form-group">
                <label>设置键名</label>
                <input type="text" value="${key}" disabled>
            </div>
    `;
    if (isBoolean) {
        content += `
            <div class="form-group">
                <label>设置值</label>
                <select id="settingValue">
                    <option value="true" ${currentValue === 'true' ? 'selected' : ''}>是</option>
                    <option value="false" ${currentValue === 'false' ? 'selected' : ''}>否</option>
                </select>
            </div>
        `;
    } else {
        content += `
            <div class="form-group">
                <label>设置值</label>
                <input type="text" id="settingValue" value="${currentValue}">
            </div>
        `;
    }
    content += `
        <div class="form-actions">
            <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">取消</button>
            <button type="submit">保存</button>
        </div>
    </form>
    `;
    this.showModal('编辑系统设置', content);
    document.getElementById('editSettingForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const value = document.getElementById('settingValue').value;
        this.updateSystemSetting(key, value);
    });
};

AdminApp.prototype.updateSystemSetting = async function(key, value) {
    try {
        const response = await this.apiRequest(`/api/admin/system-settings/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value })
        });
        if (response && response.ok) {
            const data = await response.json();
            this.closeModal();
            this.loadSystemSettings();
            alert('设置已更新');
        } else {
            throw new Error('更新设置失败');
        }
    } catch (error) {
        console.error('更新系统设置错误:', error);
        alert('更新设置失败');
    }
}; 