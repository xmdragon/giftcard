/**
 * Gift Card Management Module
 * Includes gift card list loading, display, adding, etc.
 */

// Extend AdminApp class
(function() {
    // Gift card status translation
    AdminApp.prototype.translateGiftCardStatus = function(status) {
        const statusMap = {
            'available': '可用',
            'distributed': '已发放',
            'used': '已使用',
            'expired': '已过期',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    };
    
    // Gift card type translation
    AdminApp.prototype.translateGiftCardType = function(type) {
        const typeMap = {
            'login': '登录奖励',
            'checkin': '签到奖励'
        };
        return typeMap[type] || type;
    };
    
    // Format date time as "month-day hour:minute"
    AdminApp.prototype.formatDateTime = function(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const month = date.getMonth() + 1; // 月份从0开始，需要+1
        const day = date.getDate();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${month}-${day} ${hours}:${minutes}`;
    };

    // Gift card management state
    AdminApp.prototype.giftCardState = {
        currentPage: 1,
        totalPages: 1,
        total: 0,
        limit: 20
    };

    // Load gift card list
    AdminApp.prototype.loadGiftCards = async function(page = 1) {
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const emailFilter = document.getElementById('emailFilter');
        
        const category = categoryFilter ? categoryFilter.value : '';
        const status = statusFilter ? statusFilter.value : '';
        const email = emailFilter ? emailFilter.value : '';

        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (status) params.append('status', status);
        if (email) params.append('email', email);
        params.append('page', page);
        params.append('limit', this.giftCardState.limit);

        try {
            const response = await this.apiRequest(`/api/admin/gift-cards?${params.toString()}`);
            if (response && response.ok) {
                const data = await response.json();
                this.displayGiftCards(data.giftCards, data.pagination);
            }
        } catch (error) {
            console.error('Error loading gift cards:', error);
        }
    };

    // Display gift card list
    AdminApp.prototype.displayGiftCards = function(giftCards, pagination) {
        const container = document.getElementById('giftCardsList');
        
        if (!container) {
            console.error('Gift cards list container not found');
            return;
        }

        if (giftCards.length === 0) {
            container.innerHTML = '<p>暂无礼品卡数据</p>';
            return;
        }

        // Update state
        this.giftCardState.currentPage = pagination.page;
        this.giftCardState.totalPages = pagination.totalPages;
        this.giftCardState.total = pagination.total;

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>分类</th>
                        <th>卡号</th>
                        <th>状态</th>
                        <th>发放给</th>
                        <th>发放时间</th>
                        <th>创建时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${giftCards.map(card => `
                        <tr>
                            <td>${card.id}</td>
                            <td>${card.category_name || '无分类'}</td>
                            <td><code>${card.code}</code></td>
                            <td><span class="status-badge status-${card.status}">${this.translateGiftCardStatus(card.status)}</span></td>
                            <td>${card.distributed_to_email || '未发放'}</td>
                            <td>${card.distributed_at ? this.formatDateTime(card.distributed_at) : '未发放'}</td>
                            <td>${this.formatDateTime(card.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${this.renderGiftCardPagination()}
        `;
    };

    // Render gift card pagination
    AdminApp.prototype.renderGiftCardPagination = function() {
        const { currentPage, totalPages, total } = this.giftCardState;
        
        if (totalPages <= 1) return '';

        let paginationHtml = '<div class="pagination">';
        
        // Previous button
        if (currentPage > 1) {
            paginationHtml += `<button onclick="adminApp.loadGiftCards(${currentPage - 1})">上一页</button>`;
        }
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                paginationHtml += `<span class="current-page">${i}</span>`;
            } else {
                paginationHtml += `<button onclick="adminApp.loadGiftCards(${i})">${i}</button>`;
            }
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHtml += `<button onclick="adminApp.loadGiftCards(${currentPage + 1})">下一页</button>`;
        }
        
        paginationHtml += `<span class="total-info">总计: ${total} 条记录</span>`;
        paginationHtml += '</div>';
        
        return paginationHtml;
    };

    // Show add gift cards modal
    AdminApp.prototype.showAddGiftCardsModal = function() {
        const content = `
            <form id="addGiftCardsForm">
                <div class="form-group">
                    <label for="giftCardCategory">选择分类</label>
                    <select id="giftCardCategory" required>
                        <option value="">请选择一个分类</option>
                    </select>
                </div>
                <div class="form-group" style="display:none;">
                    <label for="cardType">卡片类型</label>
                    <select id="cardType">
                        <option value="login" selected>登录奖励</option>
                        <option value="checkin">签到奖励</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="giftCardCodes">礼品卡代码（每行一个）</label>
                    <textarea id="giftCardCodes" placeholder="请输入礼品卡代码，每行一个" required></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">取消</button>
                    <button type="submit">添加</button>
                </div>
            </form>
        `;

        this.showModal('批量添加礼品卡', content);

        // Populate category options
        this.populateCategorySelect('giftCardCategory');

        // Bind form submission event
        const addGiftCardsForm = document.getElementById('addGiftCardsForm');
        if (addGiftCardsForm) {
            addGiftCardsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddGiftCards();
            });
        }
    };

    // Populate category select dropdown
    AdminApp.prototype.populateCategorySelect = async function(selectId) {
        try {
            const response = await this.apiRequest('/api/admin/gift-card-categories');
            if (response && response.ok) {
                const categories = await response.json();
                const select = document.getElementById(selectId);
                
                if (!select) {
                    console.error(`未找到分类选择元素 '${selectId}'`);
                    return;
                }

                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    // Handle add gift cards
    AdminApp.prototype.handleAddGiftCards = async function() {
        const categoryField = document.getElementById('giftCardCategory');
        const cardTypeField = document.getElementById('cardType');
        const codesField = document.getElementById('giftCardCodes');
        
        if (!categoryField || !cardTypeField || !codesField) {
            alert('未找到礼品卡表单元素');
            return;
        }
        
        const categoryId = categoryField.value;
        const cardType = cardTypeField.value;
        const codes = codesField.value;

        try {
            const response = await this.apiRequest('/api/admin/gift-cards/batch', {
                method: 'POST',
                body: JSON.stringify({ categoryId, codes, cardType })
            });

            if (response && response.ok) {
                const result = await response.json();
                alert(`成功添加 ${result.count} 张礼品卡`);
                this.closeModal();
                this.loadGiftCards(1); // Reset to first page
            }
        } catch (error) {
            console.error('Error adding gift cards:', error);
            alert('添加失败，请重试');
        }
    };
})();