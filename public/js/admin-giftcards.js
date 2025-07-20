/**
 * Gift Card Management Module
 * Includes gift card list loading, display, adding, etc.
 */

// Extend AdminApp class
(function() {
    // Gift card status translation
    AdminApp.prototype.translateGiftCardStatus = function(status) {
        const statusMap = {
            'available': 'Available',
            'distributed': 'Distributed',
            'used': 'Used',
            'expired': 'Expired',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
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
            container.innerHTML = '<p>No gift card data</p>';
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
                        <th>Category</th>
                        <th>Code</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Distributed To</th>
                        <th>Distribution Time</th>
                        <th>Created At</th>
                    </tr>
                </thead>
                <tbody>
                    ${giftCards.map(card => `
                        <tr>
                            <td>${card.id}</td>
                            <td>${card.category_name || 'No Category'}</td>
                            <td><code>${card.code}</code></td>
                            <td>${card.card_type}</td>
                            <td><span class="status-badge status-${card.status}">${this.translateGiftCardStatus(card.status)}</span></td>
                            <td>${card.distributed_to_email || 'Not Distributed'}</td>
                            <td>${card.distributed_at ? new Date(card.distributed_at).toLocaleString() : 'Not Distributed'}</td>
                            <td>${new Date(card.created_at).toLocaleString()}</td>
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
            paginationHtml += `<button onclick="adminApp.loadGiftCards(${currentPage - 1})">Previous</button>`;
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
            paginationHtml += `<button onclick="adminApp.loadGiftCards(${currentPage + 1})">Next</button>`;
        }
        
        paginationHtml += `<span class="total-info">Total: ${total} items</span>`;
        paginationHtml += '</div>';
        
        return paginationHtml;
    };

    // Show add gift cards modal
    AdminApp.prototype.showAddGiftCardsModal = function() {
        const content = `
            <form id="addGiftCardsForm">
                <div class="form-group">
                    <label for="giftCardCategory">Select Category</label>
                    <select id="giftCardCategory" required>
                        <option value="">Please select a category</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="cardType">Card Type</label>
                    <select id="cardType" required>
                        <option value="login">Login Reward</option>
                        <option value="checkin">Check-in Reward</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="giftCardCodes">Gift Card Codes (one per line)</label>
                    <textarea id="giftCardCodes" placeholder="Please enter gift card codes, one per line" required></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">Cancel</button>
                    <button type="submit">Add</button>
                </div>
            </form>
        `;

        this.showModal('Batch Add Gift Cards', content);

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
                    console.error(`Category select element with id '${selectId}' not found`);
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
            alert('Gift card form elements not found');
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
                alert(`Successfully added ${result.count} gift cards`);
                this.closeModal();
                this.loadGiftCards(1); // Reset to first page
            }
        } catch (error) {
            console.error('Error adding gift cards:', error);
            alert('Add failed, please try again');
        }
    };
})();