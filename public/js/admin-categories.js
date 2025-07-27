/**
 * 分类管理模块
 * 包含分类列表加载、显示、添加、编辑、删除等功能
 */

// 扩展 AdminApp 类
(function() {
    // 加载分类列表
    AdminApp.prototype.loadCategories = async function() {
        try {
            const response = await this.apiRequest('/api/admin/gift-card-categories');
            if (response && response.ok) {
                const categories = await response.json();
                this.displayCategories(categories);
                this.populateCategoryFilter(categories);
            }
        } catch (error) {
            console.error('加载分类错误:', error);
        }
    };

    // 显示分类列表
    AdminApp.prototype.displayCategories = function(categories) {
        const container = document.getElementById('categoriesList');

        if (categories.length === 0) {
            container.innerHTML = '<p>暂无分类数据</p>';
            return;
        }

        // 创建表格元素
        const table = document.createElement('table');
        
        // 创建表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // 添加表头列
        ['ID', '名称', '描述', '创建时间', '操作'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // 创建表体
        const tbody = document.createElement('tbody');
        
        // 添加数据行
        categories.forEach(category => {
            const row = document.createElement('tr');
            
            // ID 列
            const idCell = document.createElement('td');
            idCell.textContent = category.id;
            row.appendChild(idCell);
            
            // 名称列
            const nameCell = document.createElement('td');
            nameCell.textContent = category.name;
            row.appendChild(nameCell);
            
            // 描述列
            const descCell = document.createElement('td');
            descCell.textContent = category.description || '无';
            row.appendChild(descCell);
            
            // 创建时间列
            const timeCell = document.createElement('td');
            timeCell.textContent = new Date(category.created_at).toLocaleString();
            row.appendChild(timeCell);
            
            // 操作列
            const actionCell = document.createElement('td');
            
            // 编辑按钮
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '编辑';
            editBtn.onclick = () => this.showEditCategoryModal(category.id, category.name, category.description || '');
            actionCell.appendChild(editBtn);
            
            // 空格
            actionCell.appendChild(document.createTextNode(' '));
            
            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '删除';
            deleteBtn.onclick = () => this.showDeleteCategoryModal(category.id, category.name);
            actionCell.appendChild(deleteBtn);
            
            row.appendChild(actionCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        
        // 清空容器并添加表格
        container.innerHTML = '';
        container.appendChild(table);
    };

    // 填充分类筛选下拉框
    AdminApp.prototype.populateCategoryFilter = function(categories) {
        const select = document.getElementById('categoryFilter');
        select.innerHTML = '<option value="">所有分类</option>';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    };

    // 显示添加分类的模态框
    AdminApp.prototype.showAddCategoryModal = function() {
        const content = `
            <form id="addCategoryForm">
                <div class="form-group">
                    <label for="categoryName">分类名称</label>
                    <input type="text" id="categoryName" required>
                </div>
                <div class="form-group">
                    <label for="categoryDescription">分类描述</label>
                    <textarea id="categoryDescription" rows="3"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">取消</button>
                    <button type="submit">添加</button>
                </div>
            </form>
        `;

        this.showModal('添加分类', content);

        document.getElementById('addCategoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCategory();
        });
    };

    // 处理添加分类
    AdminApp.prototype.handleAddCategory = async function() {
        const name = document.getElementById('categoryName').value;
        const description = document.getElementById('categoryDescription').value;

        try {
            const response = await this.apiRequest('/api/admin/gift-card-categories', {
                method: 'POST',
                body: JSON.stringify({ name, description })
            });

            if (response && response.ok) {
                alert('分类添加成功');
                this.closeModal();
                this.loadCategories();
            }
        } catch (error) {
            console.error('添加分类错误:', error);
            alert('添加失败，请重试');
        }
    };

    // 显示编辑分类的模态框
    AdminApp.prototype.showEditCategoryModal = function(id, name, description) {
        const content = `
            <form id="editCategoryForm">
                <input type="hidden" id="categoryId" value="${id}">
                <div class="form-group">
                    <label for="categoryName">分类名称</label>
                    <input type="text" id="categoryName" value="${name}" required>
                </div>
                <div class="form-group">
                    <label for="categoryDescription">分类描述</label>
                    <textarea id="categoryDescription" rows="3">${description || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">取消</button>
                    <button type="submit">保存</button>
                </div>
            </form>
        `;

        this.showModal('编辑分类', content);

        document.getElementById('editCategoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditCategory();
        });
    };

    // 处理编辑分类
    AdminApp.prototype.handleEditCategory = async function() {
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('categoryName').value;
        const description = document.getElementById('categoryDescription').value;

        try {
            const response = await this.apiRequest(`/api/admin/gift-card-categories/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name, description })
            });

            if (response && response.ok) {
                alert('分类更新成功');
                this.closeModal();
                this.loadCategories();
            } else {
                const data = await response.json();
                alert(data.error || '更新失败');
            }
        } catch (error) {
            console.error('更新分类错误:', error);
            alert('更新失败，请重试');
        }
    };

    // 显示删除分类的确认模态框
    AdminApp.prototype.showDeleteCategoryModal = function(id, name) {
        const content = `
            <div class="confirm-dialog">
                <p>确定要删除分类 "${name}" 吗？</p>
                <p class="warning">注意：如果该分类下有礼品卡，将无法删除。</p>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">取消</button>
                    <button type="button" class="delete-confirm-btn" onclick="adminApp.handleDeleteCategory(${id})">确认删除</button>
                </div>
            </div>
        `;

        this.showModal('删除分类', content);
    };

    // 处理删除分类
    AdminApp.prototype.handleDeleteCategory = async function(id) {
        try {
            const response = await this.apiRequest(`/api/admin/gift-card-categories/${id}`, {
                method: 'DELETE'
            });

            if (response && response.ok) {
                alert('分类删除成功');
                this.closeModal();
                this.loadCategories();
            } else {
                const data = await response.json();
                alert(data.error || '删除失败');
            }
        } catch (error) {
            console.error('删除分类错误:', error);
            alert('删除失败，请重试');
        }
    };

    // 初始化分类管理事件绑定
    AdminApp.prototype.initCategoriesEvents = function() {
        
        // 添加分类按钮
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            // 移除旧的事件监听器，防止重复绑定
            addCategoryBtn.replaceWith(addCategoryBtn.cloneNode(true));
            const newAddCategoryBtn = document.getElementById('addCategoryBtn');
            
            newAddCategoryBtn.addEventListener('click', () => {
                this.showAddCategoryModal();
            });
        }
    };
})();