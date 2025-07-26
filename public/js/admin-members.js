/**
 * 会员管理模块
 * 包含会员列表加载、显示、搜索、分页、删除等功能
 */

// 扩展 AdminApp 类
(function () {
    // 会员管理状态
    AdminApp.prototype.membersState = {
        currentPage: 1,
        pageSize: 20,
        searchEmail: '',
        totalPages: 1,
        total: 0
    };

    // 初始化会员管理区域
    AdminApp.prototype.initMembersSection = function () {
        console.log('initMembersSection called');
        
        // 权限检查 - 修复权限检查逻辑
        if (this.currentAdmin && this.currentAdmin.role !== 'super' && !this.hasPermission('members')) {
            const container = document.getElementById('membersList');
            if (container) {
                container.innerHTML = '<div class="error">您没有权限查看会员数据</div>';
            }
            return;
        }
        
        // 初始化事件绑定
        this.initMembersEvents();
        
        // 加载会员数据
        this.loadMembers();
    };

    // 初始化会员管理事件
    AdminApp.prototype.initMembersEvents = function () {
        console.log('initMembersEvents called');
        // 刷新会员列表按钮
        const refreshMembersBtn = document.getElementById('refreshMembers');
        if (refreshMembersBtn) {
            refreshMembersBtn.addEventListener('click', () => {
                this.loadMembers();
            });
        }

        // 搜索按钮
        const searchBtn = document.getElementById('searchMembersBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchMembers();
            });
        }

        // 清除搜索按钮
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearMembersSearch();
            });
        }

        // 搜索框回车事件
        const searchInput = document.getElementById('memberEmailSearch');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchMembers();
                }
            });
        }

        // 注意：分页按钮现在通过 renderMembersPagination 动态生成和绑定
    };

    // 加载会员列表
    AdminApp.prototype.loadMembers = async function () {
        console.log('loadMembers called');
        const membersList = document.getElementById('membersList');
        if (!membersList) {
            console.error('membersList container not found');
            return;
        }
        
        membersList.innerHTML = '加载中...';
        
        try {
            const params = new URLSearchParams({
                page: this.membersState.currentPage,
                limit: this.membersState.pageSize,
                email: this.membersState.searchEmail
            });

            const response = await this.apiRequest(`/api/admin/members?${params}`);

            if (response && response.ok) {
                const data = await response.json();

                // 检查数据格式
                if (data && typeof data === 'object') {
                    // 新格式：包含 members 和 pagination
                    if (data.members && Array.isArray(data.members)) {
                        this.displayMembers(data.members);
                        if (data.pagination) {
                            this.updateMembersPagination(data.pagination);
                        }
                    }
                    // 旧格式：直接是会员数组
                    else if (Array.isArray(data)) {
                        this.displayMembers(data);
                        // 为旧格式创建默认分页信息
                        this.updateMembersPagination({
                            page: 1,
                            limit: data.length,
                            total: data.length,
                            totalPages: 1
                        });
                    } else {
                        console.error('未知的数据格式:', data);
                        this.displayMembers([]);
                    }
                } else {
                    console.error('API返回的数据格式不正确:', data);
                    this.displayMembers([]);
                }
            } else {
                console.error('API请求失败:', response ? response.status : '无响应');
                this.displayMembers([]);
            }
        } catch (error) {
            console.error('加载会员列表错误:', error);
            this.displayMembers([]);
        }
    };

    // 搜索会员
    AdminApp.prototype.searchMembers = function () {
        const searchInput = document.getElementById('memberEmailSearch');
        this.membersState.searchEmail = searchInput.value.trim();
        this.membersState.currentPage = 1;
        this.loadMembers();
    };

    // 清除搜索
    AdminApp.prototype.clearMembersSearch = function () {
        document.getElementById('memberEmailSearch').value = '';
        this.membersState.searchEmail = '';
        this.membersState.currentPage = 1;
        this.loadMembers();
    };

    // 更新分页信息
    AdminApp.prototype.updateMembersPagination = function (pagination) {
        this.membersState.currentPage = pagination.page;
        this.membersState.totalPages = pagination.totalPages;
        this.membersState.total = pagination.total;

        // 重新渲染分页控件
        this.renderMembersPagination(pagination);
    };

    // 渲染会员分页控件
    AdminApp.prototype.renderMembersPagination = function(pagination) {
        const container = document.getElementById('membersPagination');
        if (!container) return;
        
        if (pagination.totalPages <= 1) {
            container.innerHTML = `<span class="pagination-info">总计: ${pagination.total} 条记录</span>`;
            return;
        }
        
        let html = '<div class="pagination-info">第 ' + pagination.page + ' 页，共 ' + pagination.totalPages + ' 页 (总计 ' + pagination.total + ' 条记录)</div>';
        html += '<div class="pagination-buttons">';
        
        // 上一页按钮
        if (pagination.page > 1) {
            html += `<button onclick="adminApp.loadMembersPage(${pagination.page - 1})">上一页</button>`;
        }
        
        // 页码按钮
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.totalPages, pagination.page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === pagination.page ? ' active' : '';
            html += `<button class="page-btn${activeClass}" onclick="adminApp.loadMembersPage(${i})">${i}</button>`;
        }
        
        // 下一页按钮
        if (pagination.page < pagination.totalPages) {
            html += `<button onclick="adminApp.loadMembersPage(${pagination.page + 1})">下一页</button>`;
        }
        
        // 每页条数选择
        html += '<select id="pageSizeSelectNew" style="margin-left: 10px;">';
        html += '<option value="10"' + (this.membersState.pageSize === 10 ? ' selected' : '') + '>每页 10 条</option>';
        html += '<option value="20"' + (this.membersState.pageSize === 20 ? ' selected' : '') + '>每页 20 条</option>';
        html += '<option value="50"' + (this.membersState.pageSize === 50 ? ' selected' : '') + '>每页 50 条</option>';
        html += '</select>';
        
        html += '</div>';
        container.innerHTML = html;
        
        // 绑定每页条数选择事件
        const pageSizeSelect = document.getElementById('pageSizeSelectNew');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.membersState.pageSize = parseInt(e.target.value);
                this.membersState.currentPage = 1;
                this.loadMembersPage(1);
            });
        }
    };

    // 加载指定页码的会员数据
    AdminApp.prototype.loadMembersPage = function(page) {
        this.membersState.currentPage = page;
        this.loadMembers();
    };

    // 删除会员
    AdminApp.prototype.deleteMember = async function (memberId, memberEmail) {
        if (!confirm(`确定要删除会员 "${memberEmail}" 吗？\n\n此操作将删除该会员的所有相关数据，包括：\n- 登录记录\n- 签到记录\n- 验证记录\n- 已分配的礼品卡将重置为可用状态\n\n此操作不可撤销！`)) {
            return;
        }

        try {
            const response = await this.apiRequest(`/api/admin/members/${memberId}`, {
                method: 'DELETE'
            });

            if (response && response.ok) {
                alert('会员删除成功');
                this.loadMembers(); // 重新加载会员列表
            } else {
                const error = await response.json();
                alert(`删除失败: ${error.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('删除会员错误:', error);
            alert('删除失败，请稍后重试');
        }
    };

    // 格式化时间为 月-日 时:分 格式
    AdminApp.prototype.formatDateTime = function (dateString) {
        if (!dateString) return '未设置';

        const date = new Date(dateString);
        const month = date.getMonth() + 1; // 月份从0开始，需要+1
        const day = date.getDate();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${month}-${day} ${hours}:${minutes}`;
    };

    // 显示会员列表
    AdminApp.prototype.displayMembers = function (members) {
        const container = document.getElementById('membersList');

        if (members.length === 0) {
            container.innerHTML = '<p>暂无会员数据</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>邮箱</th>
                        <th data-i18n="member_password">会员密码</th>
                        <th>注册时间</th>
                        <th>最后登录</th>
                        <th>最新IP</th>
                        <th>登录次数</th>
                        <th>签到次数</th>
                        <th>礼品卡数量</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${members.map(member => `
                        <tr>
                            <td>${member.id}</td>
                            <td>${member.email}</td>
                            <td><strong style="color: #0071e3; font-family: monospace;">${member.password || '未设置'}</strong></td>
                            <td>${this.formatDateTime(member.created_at)}</td>
                            <td>${member.last_login_time ? this.formatDateTime(member.last_login_time) : '未登录'}</td>
                            <td><code>${member.latest_ip || '无'}</code></td>
                            <td>${member.login_count}</td>
                            <td>${member.checkin_count}</td>
                            <td>${member.gift_cards_received}</td>
                            <td><span class="status-badge status-active">正常</span></td>
                            <td>
                                ${member.latest_ip ? `<button class="ban-ip-btn" onclick="adminApp.showBanIpModal('${member.latest_ip}')">禁止IP</button>` : ''}
                                <button class="delete-btn" onclick="adminApp.deleteMember(${member.id}, '${member.email}')">删除</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };
})();