// === Entry Point ===
import './src/setup.js';
import { initNotifications, toggleNotificationPanel, closeNotificationPanel, clearAllNotifications, openNotificationPanel } from './src/notification.js';

// 初始化通知系统
initNotifications();

// 全局通知面板控制
window._toggleNotifications = toggleNotificationPanel;
window._closeNotifications = closeNotificationPanel;
window._clearAllNotifications = clearAllNotifications;

// 通知徽标点击
const notifBadge = document.getElementById('notif-badge');
if (notifBadge) {
    notifBadge.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleNotificationPanel();
    });
}

// 通知面板点击外部关闭
const notifPanel = document.getElementById('notification-panel');
if (notifPanel) {
    notifPanel.addEventListener('click', function(e) {
        if (e.target === notifPanel) {
            closeNotificationPanel();
        }
    });
}

// ==================== 搜索功能 ====================
let searchOpen = false;
let searchDebounce = null;

function openSearch() {
    const bar = document.getElementById('search-bar');
    const input = document.getElementById('search-input');
    if (!bar || !input) return;
    searchOpen = true;
    bar.style.display = 'block';
    input.value = '';
    input.focus();
    document.getElementById('search-results').innerHTML = '';
}

function closeSearch() {
    const bar = document.getElementById('search-bar');
    if (!bar) return;
    searchOpen = false;
    bar.style.display = 'none';
    document.getElementById('search-results').innerHTML = '';
}

window._openSearch = openSearch;
window._closeSearch = closeSearch;

// 搜索输入处理
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        clearTimeout(searchDebounce);
        const query = this.value.trim();
        if (!query) {
            document.getElementById('search-results').innerHTML = '';
            return;
        }
        searchDebounce = setTimeout(() => {
            performSearch(query);
        }, 150);
    });

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSearch();
        }
    });
}

function performSearch(query) {
    const resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;

    // 搜索本地应用列表
    const items = window._totalItems || [];
    const matches = items.filter(it => {
        if (!it.data) return false;
        const name = (it.data.appName || '').toLowerCase();
        const pkg = (it.data.packageName || '').toLowerCase();
        const q = query.toLowerCase();
        return name.includes(q) || pkg.includes(q);
    }).slice(0, 10);

    if (matches.length === 0) {
        resultsEl.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:13px">未找到应用</div>';
        return;
    }

    resultsEl.innerHTML = '';
    matches.forEach(it => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        const initial = (it.data.appName || '?').charAt(0).toUpperCase();
        item.innerHTML = `
            <div class="search-result-icon">${initial}</div>
            <div>
                <div class="search-result-name">${escapeHtmlSearch(it.data.appName)}</div>
                <div class="search-result-pkg">${it.data.packageName || ''}</div>
            </div>
        `;
        item.addEventListener('click', function() {
            if (it.data.packageName === '__time__') {
                closeSearch();
                return;
            }
            if (it.data.packageName === '__settings__') {
                closeSearch();
                return;
            }
            try {
                if (typeof NativeBridge !== 'undefined') {
                    NativeBridge.launchApp(it.data.packageName);
                }
            } catch (e) {}
            closeSearch();
        });
        resultsEl.appendChild(item);
    });
}

function escapeHtmlSearch(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 双击空白区域打开搜索
let lastTapTime = 0;
document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTapTime < 300) {
        // 双击
        if (!searchOpen && !e.target.closest('#search-bar') && !e.target.closest('#settings-overlay') && !e.target.closest('#notification-panel') && !e.target.closest('#context-menu')) {
            openSearch();
        }
    }
    lastTapTime = now;
});

// ESC 关闭搜索
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && searchOpen) {
        closeSearch();
    }
});

// ==================== 通知下滑手势 ====================
// 从屏幕顶部 5% 区域下滑 → 打开通知面板
(function() {
    let touchStartY = 0;
    let touchStartX = 0;
    let isNotifSwipe = false;
    const NOTIF_ZONE = 0.05; // 顶部5%区域

    document.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        if (t.clientY < window.innerHeight * NOTIF_ZONE) {
            touchStartY = t.clientY;
            touchStartX = t.clientX;
            isNotifSwipe = true;
        } else {
            isNotifSwipe = false;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (!isNotifSwipe) return;
        const t = e.touches[0];
        const dy = t.clientY - touchStartY;
        const dx = Math.abs(t.clientX - touchStartX);
        // 下滑超过30px且水平移动不大
        if (dy > 30 && dx < 50) {
            isNotifSwipe = false;
            openNotificationPanel();
        }
    }, { passive: true });

    document.addEventListener('touchend', function() {
        isNotifSwipe = false;
    }, { passive: true });
})();

// 点击搜索栏外部关闭
document.addEventListener('click', function(e) {
    if (searchOpen && !e.target.closest('#search-bar') && !e.target.closest('.search-result-item')) {
        closeSearch();
    }
});
