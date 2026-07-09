import { state } from './state.js';

// ==================== 通知管理 ====================
const MAX_NOTIFICATIONS = 20;
let notifications = [];
let notificationPanelOpen = false;

export function initNotifications() {
    // 监听原生推送的新通知
    window._onNotificationPosted = function(info) {
        if (!info) return;
        // 去重（同包名+标题）
        const idx = notifications.findIndex(n => n.packageName === info.packageName && n.title === info.title);
        if (idx >= 0) {
            notifications[idx] = info;
        } else {
            notifications.unshift(info);
        }
        if (notifications.length > MAX_NOTIFICATIONS) {
            notifications = notifications.slice(0, MAX_NOTIFICATIONS);
        }
        updateNotificationBadge();
        // 如果面板打开，刷新列表
        if (notificationPanelOpen) renderNotificationList();
    };

    // 初始加载已有通知
    loadActiveNotifications();
}

function loadActiveNotifications() {
    try {
        if (typeof NativeBridge === 'undefined') return;
        const raw = NativeBridge.getActiveNotifications();
        const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (result.success && result.notifications) {
            notifications = result.notifications.filter(n => !n.isOngoing && n.title);
            updateNotificationBadge();
        }
    } catch (e) {
        console.warn('[Notif] loadActive error:', e);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const count = notifications.length;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotificationList() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    if (notifications.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:40px 0;color:rgba(255,255,255,0.3);font-size:14px">暂无通知</div>';
        return;
    }

    list.innerHTML = '';
    notifications.forEach((notif, idx) => {
        const item = document.createElement('div');
        item.className = 'notif-item';
        const timeStr = formatNotifTime(notif.postTime);
        item.innerHTML = `
            <div class="notif-header">
                <span class="notif-title">${escapeHtml(notif.title)}</span>
                <span class="notif-time">${timeStr}</span>
            </div>
            <div class="notif-text">${escapeHtml(notif.text || '')}</div>
            <div class="notif-pkg">${getAppName(notif.packageName)}</div>
        `;
        item.addEventListener('click', function() {
            try {
                if (typeof NativeBridge !== 'undefined') {
                    NativeBridge.launchApp(notif.packageName);
                }
            } catch (e) {}
            closeNotificationPanel();
        });
        list.appendChild(item);
    });
}

function formatNotifTime(postTime) {
    if (!postTime) return '';
    const now = Date.now();
    const diff = now - postTime;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    const d = new Date(postTime);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
           String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function getAppName(packageName) {
    if (window._totalItems) {
        const item = window._totalItems.find(it => it.data && it.data.packageName === packageName);
        if (item) return item.data.appName;
    }
    return packageName;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function toggleNotificationPanel() {
    if (notificationPanelOpen) {
        closeNotificationPanel();
    } else {
        openNotificationPanel();
    }
}

export function openNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    if (!panel) return;
    notificationPanelOpen = true;
    panel.style.display = 'flex';
    renderNotificationList();
    // 加载最新通知
    loadActiveNotifications();
    renderNotificationList();
}

export function closeNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    if (!panel) return;
    notificationPanelOpen = false;
    panel.style.display = 'none';
}

export function clearAllNotifications() {
    notifications = [];
    updateNotificationBadge();
    renderNotificationList();
    // 通知原生清除所有
    try {
        if (typeof NativeBridge !== 'undefined' && notifications.length > 0) {
            // Clear each package's notifications
            const pkgs = [...new Set(notifications.map(n => n.packageName))];
            pkgs.forEach(pkg => NativeBridge.clearNotification(pkg));
        }
    } catch (e) {}
    notifications = [];
    updateNotificationBadge();
    renderNotificationList();
}

export { notifications, notificationPanelOpen };
