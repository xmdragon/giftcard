/**
 * 礼品卡管理模块
 * 包含礼品卡列表加载、显示、添加等功能
 */

// 扩展 AdminApp 类
(function() {
    // 礼品卡状态翻译
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

    // 加载礼品卡列表
    AdminApp.prototype.loadGiftCards = async function() {
        const category = document.getElementById('categoryFilter').value;
        const status = document.getElementById('statusFilter').value;

        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (status) params.append('status', status);

        try {
            const response = await this.apiRequest(`/api/admin/gift-cards?${params.toString()}`);
            if (response && response.ok) {
                const giftCards = await response.json();
                this.displayGiftCards(giftCards);
            }
        } catch (error) {
            console.error('加载礼品卡错误:', error);
        }
    };

    // 显示礼品卡列表
    AdminApp.prototype.displayGiftCards = function(giftCards) {
        const container = document.getElementById('giftCardsList');

        if (giftCards.length === 0) {
            container.innerHTML = '<p>暂无礼品卡数据</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>分类</th>
                        <th>代码</th>
                        <th>类型</th>
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
                            <td>${card.card_type}</td>
                            <td><span class="status-badge status-${card.status}">${this.translateGiftCardStatus(card.status)}</span></td>
                            <td>${card.distributed_to_email || '未发放'}</td>
                            <td>${card.distributed_at ? new Date(card.distributed_at).toLocaleString() : '未发放'}</td>
                            <td>${new Date(card.created_at).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };

    // 显示添加礼品卡的模态框
    AdminApp.prototype.showAddGiftCardsModal = function() {
        const content = `
            <form id="addGiftCardsForm">
                <div class="form-group">
                    <label for="giftCardCategory">选择分类</label>
                    <select id="giftCardCategory" required>
                        <option value="">请选择分类</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="cardType">卡片类型</label>
                    <select id="cardType" required>
                        <option value="login">登录奖励</option>
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

        // 填充分类选项
        this.populateCategorySelect('giftCardCategory');

        // 绑定表单提交事件
        document.getElementById('addGiftCardsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddGiftCards();
        });
    };

    // 填充分类选择下拉框
    AdminApp.prototype.populateCategorySelect = async function(selectId) {
        try {
            const response = await this.apiRequest('/api/admin/gift-card-categories');
            if (response && response.ok) {
                const categories = await response.json();
                const select = document.getElementById(selectId);

                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('加载分类错误:', error);
        }
    };

    // 处理添加礼品卡
    AdminApp.prototype.handleAddGiftCards = async function() {
        const categoryId = document.getElementById('giftCardCategory').value;
        const cardType = document.getElementById('cardType').value;
        const codes = document.getElementById('giftCardCodes').value;

        try {
            const response = await this.apiRequest('/api/admin/gift-cards/batch', {
                method: 'POST',
                body: JSON.stringify({ categoryId, codes, cardType })
            });

            if (response && response.ok) {
                const result = await response.json();
                alert(`成功添加 ${result.count} 张礼品卡`);
                this.closeModal();
                this.loadGiftCards();
            }
        } catch (error) {
            console.error('添加礼品卡错误:', error);
            alert('添加失败，请重试');
        }
    };
})();