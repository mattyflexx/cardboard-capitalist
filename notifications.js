/**
 * notifications.js
 * Centralized notification system for user feedback
 * Provides toast-style notifications with different types and specialized functions
 */

// Notification types with their styling
const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error', 
    INFO: 'info',
    WARNING: 'warning',
    ACHIEVEMENT: 'achievement',
    PACK_OPENED: 'pack-opened',
    SET_UNLOCKED: 'set-unlocked'
};

// Notification queue and settings
let notificationQueue = [];
let notificationId = 0;
const MAX_NOTIFICATIONS = 5;
const DEFAULT_DURATION = 4000; // 4 seconds

/**
 * Initialize the notification system
 * Creates the notification container if it doesn't exist
 */
function initializeNotificationSystem() {
    if (!document.getElementById('notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
}

/**
 * Core notification function
 * @param {string} message - The notification message
 * @param {string} type - Type of notification (success, error, info, warning, etc.)
 * @param {number} duration - Duration in milliseconds (0 for permanent)
 * @param {Object} options - Additional options
 */
export function showNotification(message, type = NOTIFICATION_TYPES.INFO, duration = DEFAULT_DURATION, options = {}) {
    initializeNotificationSystem();
    
    const notification = createNotificationElement(message, type, options);
    const container = document.getElementById('notification-container');
    
    // Add to queue and DOM
    notificationQueue.push(notification);
    container.appendChild(notification);
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
        notification.classList.add('notification-show');
    });
    
    // Remove old notifications if queue is too long
    if (notificationQueue.length > MAX_NOTIFICATIONS) {
        const oldNotification = notificationQueue.shift();
        removeNotification(oldNotification);
    }
    
    // Auto-dismiss if duration is set
    if (duration > 0) {
        setTimeout(() => {
            removeNotification(notification);
        }, duration);
    }
    
    return notification;
}

/**
 * Create notification DOM element
 * @param {string} message - The notification message
 * @param {string} type - Notification type
 * @param {Object} options - Additional options (icon, action, etc.)
 */
function createNotificationElement(message, type, options = {}) {
    const notification = document.createElement('div');
    const id = `notification-${++notificationId}`;
    
    notification.id = id;
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    
    // Get icon for notification type
    const icon = options.icon || getIconForType(type);
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${icon}</div>
            <div class="notification-message">${message}</div>
            <button class="notification-close" aria-label="Close notification" onclick="removeNotificationById('${id}')">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        ${options.action ? `<div class="notification-action">${options.action}</div>` : ''}
    `;
    
    // Add click handler for the close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeNotification(notification);
    });
    
    return notification;
}

/**
 * Get appropriate icon for notification type
 * @param {string} type - Notification type
 */
function getIconForType(type) {
    const icons = {
        [NOTIFICATION_TYPES.SUCCESS]: '✅',
        [NOTIFICATION_TYPES.ERROR]: '❌', 
        [NOTIFICATION_TYPES.INFO]: 'ℹ️',
        [NOTIFICATION_TYPES.WARNING]: '⚠️',
        [NOTIFICATION_TYPES.ACHIEVEMENT]: '🏆',
        [NOTIFICATION_TYPES.PACK_OPENED]: '📦',
        [NOTIFICATION_TYPES.SET_UNLOCKED]: '🔓'
    };
    return icons[type] || 'ℹ️';
}

/**
 * Remove notification from DOM and queue
 * @param {HTMLElement} notification - The notification element to remove
 */
function removeNotification(notification) {
    if (!notification || !notification.parentNode) return;
    
    notification.classList.add('notification-hide');
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
        // Remove from queue
        const index = notificationQueue.indexOf(notification);
        if (index > -1) {
            notificationQueue.splice(index, 1);
        }
    }, 300); // Match CSS transition duration
}

/**
 * Remove notification by ID (used by close button onclick)
 * @param {string} id - Notification element ID
 */
window.removeNotificationById = function(id) {
    const notification = document.getElementById(id);
    if (notification) {
        removeNotification(notification);
    }
};

/**
 * Specialized notification for pack opening
 * @param {string} setName - Name of the card set
 * @param {number} cardCount - Number of cards in the pack
 * @param {Array} rareCards - Array of rare cards found
 */
export function showPackOpenedNotification(setName, cardCount, rareCards = []) {
    let message = `Opened ${setName} pack! Got ${cardCount} cards.`;
    
    if (rareCards.length > 0) {
        const rareNames = rareCards.map(card => card.name).join(', ');
        message += ` Found rare cards: ${rareNames}!`;
    }
    
    const options = {
        icon: '🎉',
        action: rareCards.length > 0 ? '<button class="notification-btn" onclick="showCollection()">View Collection</button>' : null
    };
    
    return showNotification(message, NOTIFICATION_TYPES.PACK_OPENED, 6000, options);
}

/**
 * Specialized notification for set completion/unlock
 * @param {string} setName - Name of the completed set
 * @param {number} completionPercentage - Completion percentage
 */
export function showSetUnlockedNotification(setName, completionPercentage) {
    const message = `${setName} set ${completionPercentage}% complete!`;
    
    const options = {
        icon: '🔓',
        action: '<button class="notification-btn" onclick="showDoodledex()">View DoodleDex</button>'
    };
    
    return showNotification(message, NOTIFICATION_TYPES.SET_UNLOCKED, 5000, options);
}

/**
 * Specialized notification for achievements
 * @param {Object} achievement - Achievement object with name, description, reward
 */
export function showAchievementNotification(achievement) {
    let message = `Achievement Unlocked: ${achievement.name}`;
    if (achievement.reward?.cash) {
        message += ` (+$${achievement.reward.cash})`;
    }
    
    const options = {
        icon: '🏆',
        action: '<button class="notification-btn" onclick="showAchievements()">View Achievements</button>'
    };
    
    return showNotification(message, NOTIFICATION_TYPES.ACHIEVEMENT, 7000, options);
}

/**
 * Helper functions for notification action buttons
 */
window.showCollection = function() {
    if (window.renderMainView) {
        window.renderMainView('collection');
    }
};

window.showDoodledex = function() {
    if (window.renderMainView) {
        window.renderMainView('doodledex');
    }
};

window.showAchievements = function() {
    if (window.renderMainView) {
        window.renderMainView('achievements');
    }
};

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
    const container = document.getElementById('notification-container');
    if (container) {
        container.innerHTML = '';
    }
    notificationQueue = [];
}

/**
 * Quick helper functions for common notification types
 */
export function showSuccessNotification(message, duration = DEFAULT_DURATION) {
    return showNotification(message, NOTIFICATION_TYPES.SUCCESS, duration);
}

export function showErrorNotification(message, duration = DEFAULT_DURATION) {
    return showNotification(message, NOTIFICATION_TYPES.ERROR, duration);
}

export function showInfoNotification(message, duration = DEFAULT_DURATION) {
    return showNotification(message, NOTIFICATION_TYPES.INFO, duration);
}

export function showWarningNotification(message, duration = DEFAULT_DURATION) {
    return showNotification(message, NOTIFICATION_TYPES.WARNING, duration);
}

// Initialize when module loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotificationSystem);
} else {
    initializeNotificationSystem();
}