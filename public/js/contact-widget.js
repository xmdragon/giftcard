// Contact Widget Manager
(function() {
    async function loadContactInfo() {
        try {
            const response = await fetch('/api/contact-info');
            const data = await response.json();
            
            const widget = document.getElementById('contactWidget');
            const whatsappBtn = document.getElementById('whatsappBtn');
            const telegramBtn = document.getElementById('telegramBtn');
            
            let hasContact = false;
            
            // Setup WhatsApp button
            if (data.whatsapp && data.whatsapp.trim()) {
                whatsappBtn.href = data.whatsapp;
                whatsappBtn.style.display = 'flex';
                hasContact = true;
            }
            
            // Setup Telegram button
            if (data.telegram && data.telegram.trim()) {
                telegramBtn.href = data.telegram;
                telegramBtn.style.display = 'flex';
                hasContact = true;
            }
            
            // Show widget if at least one contact is available
            if (hasContact) {
                widget.style.display = 'flex';
            }
        } catch (error) {
            console.error('Failed to load contact info:', error);
        }
    }
    
    // Load contact info when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadContactInfo);
    } else {
        loadContactInfo();
    }
})();