// 简化的礼品卡管理模块
AdminApp.prototype.initGiftCardsSection = function() {
    console.log('Simple initGiftCardsSection called');
    
    // 权限检查
    if (this.currentAdmin && this.currentAdmin.role !== 'super' && !this.hasPermission('gift-cards')) {
        const container = document.getElementById('giftCardsList');
        if (container) {
            container.innerHTML = '<div class="error">您没有权限查看礼品卡数据</div>';
        }
        return;
    }
    
    // 绑定事件
    this.bindGiftCardsEvents();
    
    // 加载数据
    this.loadGiftCardsSimple();
    
    // 加载分类数据用于筛选
    this.loadCategoriesForFilter();
};

AdminApp.prototype.bindGiftCardsEvents = function() {
    console.log('Binding gift cards events');
    
    // 批量添加按钮
    const addBtn = document.getElementById('addGiftCardsBtn');
    if (addBtn) {
        addBtn.replaceWith(addBtn.cloneNode(true));
        const newAddBtn = document.getElementById('addGiftCardsBtn');
        newAddBtn.addEventListener('click', () => {
            console.log('Add gift cards button clicked');
            this.showAddGiftCardsModal();
        });
    }
    
    // 筛选按钮
    const filterBtn = document.getElementById('filterGiftCards');
    if (filterBtn) {
        filterBtn.replaceWith(filterBtn.cloneNode(true));
        const newFilterBtn = document.getElementById('filterGiftCards');
        newFilterBtn.addEventListener('click', () => {
            console.log('Filter gift cards button clicked');
            this.loadGiftCardsSimple();
        });
    }
};

AdminApp.prototype.loadGiftCardsSimple = async function() {
    console.log('loadGiftCardsSimple called');
    
    const container = document.getElementById('giftCardsList');
    if (!container) {
        console.error('giftCardsList container not found');
        return;
    }
    
    // 显示加载状态
    const tbody = container.querySelector('tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8">正在加载礼品卡数据...</td></tr>';
    }
    
    try {
        // 获取筛选条件
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const emailFilter = document.getElementById('emailFilter')?.value || '';
        
        const params = new URLSearchParams({
            page: 1,
            limit: 100,
            category: categoryFilter,
            status: statusFilter,
            email: emailFilter
        });
        
        const response = await fetch(`/api/admin/gift-cards?${params}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Gift cards data received:', data);
            this.displayGiftCardsSimple(data.giftCards || data);
        } else {
            console.error('API request failed:', response.status);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="8" class="error">加载失败: ${response.status}</td></tr>`;
            }
        }
    } catch (error) {
        console.error('Load gift cards error:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="error">加载失败: ${error.message}</td></tr>`;
        }
    }
};

AdminApp.prototype.displayGiftCardsSimple = function(giftCards) {
    const container = document.getElementById('giftCardsList');
    if (!container) {
        console.error('giftCardsList container not found');
        return;
    }
    
    const tbody = container.querySelector('tbody');
    if (!tbody) {
        console.error('giftCardsList tbody not found');
        return;
    }
    
    console.log('Displaying gift cards:', giftCards.length);
    
    if (!giftCards || giftCards.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">暂无礼品卡数据</td></tr>';
        return;
    }
    
    let html = '';
    giftCards.forEach(card => {
        const createdAt = new Date(card.created_at).toLocaleString('zh-CN');
        const distributedAt = card.distributed_at ? 
            new Date(card.distributed_at).toLocaleString('zh-CN') : '-';
        
        let statusText = '';
        let statusClass = '';
        switch(card.status) {
            case 'available':
                statusText = '可用';
                statusClass = 'status-available';
                break;
            case 'distributed':
                statusText = '已发放';
                statusClass = 'status-distributed';
                break;
            case 'used':
                statusText = '已使用';
                statusClass = 'status-used';
                break;
            default:
                statusText = card.status;
                statusClass = 'status-unknown';
        }
        
        html += `
            <tr>
                <td>${card.id}</td>
                <td>${card.category_name || '-'}</td>
                <td><code>${card.code}</code></td>
                <td>${card.card_type || '普通'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${card.distributed_to_email || '-'}</td>
                <td>${distributedAt}</td>
                <td>${createdAt}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    console.log('Gift cards table rendered successfully');
};

AdminApp.prototype.loadCategoriesForFilter = async function() {
    try {
        const response = await fetch('/api/admin/categories', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (response.ok) {
            const categories = await response.json();
            this.populateCategoryFilter(categories);
        }
    } catch (error) {
        console.error('Load categories error:', error);
    }
};

AdminApp.prototype.populateCategoryFilter = function(categories) {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter || !categories) return;
    
    // 保留第一个"所有分类"选项
    const firstOption = categoryFilter.querySelector('option[value=""]');
    categoryFilter.innerHTML = '';
    if (firstOption) {
        categoryFilter.appendChild(firstOption);
    } else {
        categoryFilter.innerHTML = '<option value="">所有分类</option>';
    }
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categoryFilter.appendChild(option);
    });
};

AdminApp.prototype.showAddGiftCardsModal = function() {
    const content = `
        <div class="modal-header">
            <h3>批量添加礼品卡</h3>
        </div>
        <form id="addGiftCardsForm" class="modal-form">
            <div class="form-group">
                <label>选择分类</label>
                <select id="giftCardCategory" class="form-control" required>
                    <option value="">请选择分类</option>
                </select>
            </div>
            <div class="form-group">
                <label>礼品卡代码（每行一个）</label>
                <textarea id="giftCardCodes" class="form-control" rows="10" 
                    placeholder="GIFT001&#10;GIFT002&#10;GIFT003" required></textarea>
                <small class="form-text text-muted">每行输入一个礼品卡代码</small>
            </div>
            <div class="form-actions" style="margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="adminApp.closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">添加</button>
            </div>
        </form>
    `;
    
    this.showModal('批量添加礼品卡', content);
    
    // 加载分类到模态框中的选择框
    this.loadCategoriesForModal();
    
    // 绑定表单提交事件
    document.getElementById('addGiftCardsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitAddGiftCards();
    });
};

AdminApp.prototype.loadCategoriesForModal = async function() {
    try {
        const response = await fetch('/api/admin/categories', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (response.ok) {
            const categories = await response.json();
            const select = document.getElementById('giftCardCategory');
            if (select) {
                // 保留第一个默认选项（如"请选择"），清空其他选项
                const firstOption = select.querySelector('option[value=""]');
                select.innerHTML = '';
                if (firstOption) {
                    select.appendChild(firstOption);
                } else {
                    // 如果没有默认选项，添加一个
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = '请选择分类';
                    select.appendChild(defaultOption);
                }

                // 添加分类选项
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Load categories for modal error:', error);
    }
};

AdminApp.prototype.submitAddGiftCards = async function() {
    const categoryId = document.getElementById('giftCardCategory').value;
    const codesText = document.getElementById('giftCardCodes').value;
    
    if (!categoryId || !codesText) {
        alert('请填写所有必填字段');
        return;
    }
    
    const codes = codesText.split('\n').map(code => code.trim()).filter(code => code);
    if (codes.length === 0) {
        alert('请输入至少一个礼品卡代码');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/gift-cards/batch', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                category_id: categoryId,
                codes: codes
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`成功添加 ${result.added || codes.length} 张礼品卡`);
            this.closeModal();
            this.loadGiftCardsSimple();
        } else {
            const error = await response.json();
            alert('添加失败: ' + (error.error || '未知错误'));
        }
    } catch (error) {
        console.error('Add gift cards error:', error);
        alert('添加失败: ' + error.message);
    }
};