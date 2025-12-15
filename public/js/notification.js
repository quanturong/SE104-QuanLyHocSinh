// Global notification functions
function showNotification(message, type) {
  const modal = document.getElementById('notification-modal');
  const titleEl = document.getElementById('notification-title');
  const messageEl = document.getElementById('notification-message');
  const iconEl = document.getElementById('notification-icon');
  
  if (!modal || !messageEl) return;
  
  // Remove previous type classes
  modal.classList.remove('error', 'success', 'info');
  
  // Clean message - remove regulation codes like (QĐ1), (QĐ2), etc.
  const cleanMessage = message.replace(/\s*\(QĐ\d+\)\s*/g, '').trim();
  messageEl.textContent = cleanMessage;
  
  // Set title, icon and style based on type
  const iconSvg = document.getElementById('notification-icon-svg');
  if (type === 'error') {
    titleEl.textContent = 'Lỗi';
    titleEl.style.color = '#ef4444';
    if (iconSvg) {
      iconSvg.innerHTML = `
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#ef4444"/>
      `;
      iconSvg.style.color = '#ef4444';
    }
    iconEl.style.background = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
    iconEl.style.display = 'flex';
    iconEl.style.alignItems = 'center';
    iconEl.style.justifyContent = 'center';
    modal.classList.add('error');
  } else if (type === 'success') {
    titleEl.textContent = 'Thành công';
    titleEl.style.color = '#10b981';
    if (iconSvg) {
      iconSvg.innerHTML = `
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#10b981"/>
      `;
      iconSvg.style.color = '#10b981';
    }
    iconEl.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
    iconEl.style.display = 'flex';
    iconEl.style.alignItems = 'center';
    iconEl.style.justifyContent = 'center';
    modal.classList.add('success');
  } else {
    titleEl.textContent = 'Thông báo';
    titleEl.style.color = '#3b82f6';
    if (iconSvg) {
      iconSvg.innerHTML = `
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="#3b82f6"/>
      `;
      iconSvg.style.color = '#3b82f6';
    }
    iconEl.style.background = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
    iconEl.style.display = 'flex';
    iconEl.style.alignItems = 'center';
    iconEl.style.justifyContent = 'center';
    modal.classList.add('info');
  }
  
  // Show modal with animation
  modal.style.display = 'grid';
  
  // Remove error/success from URL
  const url = new URL(window.location);
  url.searchParams.delete('error');
  url.searchParams.delete('success');
  window.history.replaceState({}, '', url);
}

function closeNotification() {
  const modal = document.getElementById('notification-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Close on overlay click
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('notification-modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeNotification();
      }
    });
  }
  
  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('notification-modal');
      if (modal && modal.style.display !== 'none') {
        closeNotification();
      }
    }
  });
});

