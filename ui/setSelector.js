/**
 * setSelector.js
 * Set Selection UI Component for Cardboard Capitalist
 * 
 * This component provides a dynamic interface for selecting from available
 * trading card sets, displaying unlock status, progress, and pack pricing.
 */

import { TCG_SETS } from '../config.js';
import { gameState } from '../state.js';

/**
 * Get information about all available sets
 * @returns {Object} SET_INFO object with set metadata
 */
export const SET_INFO = {
    genesis: {
        name: "Genesis",
        description: "The original Doodlemon trading card set",
        unlocked: true,
        releaseYear: 1,
        releaseDay: 1
    }
    // Future sets can be added here
};

/**
 * Get list of available sets based on game progression
 * @returns {Array} Array of available set keys
 */
export function getAvailableSets() {
    const availableSets = [];
    
    Object.keys(SET_INFO).forEach(setKey => {
        const setInfo = SET_INFO[setKey];
        const isUnlocked = setInfo.unlocked || 
            (gameState.date.year > setInfo.releaseYear || 
             (gameState.date.year === setInfo.releaseYear && gameState.date.day >= setInfo.releaseDay));
        
        if (isUnlocked) {
            availableSets.push(setKey);
        }
    });
    
    return availableSets;
}

/**
 * Calculate collection completion percentage for a specific set
 * @param {string} setKey - The set identifier
 * @returns {number} Completion percentage (0-100)
 */
export function getSetCompletion(setKey) {
    const set = TCG_SETS[setKey];
    if (!set) return 0;
    
    const uniqueCardsInSet = set.cards.length;
    const ownedCardsInSet = Object.keys(gameState.player.collection).filter(cardId => {
        const cardData = gameState.player.collection[cardId];
        return cardData.cardInfo.id.startsWith(getSetPrefix(setKey));
    }).length;
    
    return Math.round((ownedCardsInSet / uniqueCardsInSet) * 100);
}

/**
 * Get the card ID prefix for a set (e.g., "GS" for Genesis)
 * @param {string} setKey - The set identifier
 * @returns {string} The prefix used in card IDs
 */
function getSetPrefix(setKey) {
    const prefixes = {
        genesis: 'GS'
        // Add other set prefixes as needed
    };
    return prefixes[setKey] || setKey.toUpperCase();
}

/**
 * Get total packs owned for a specific set
 * @param {string} setKey - The set identifier
 * @returns {number} Number of unopened packs
 */
export function getPacksOwned(setKey) {
    return gameState.player.sealedInventory[setKey] || 0;
}

/**
 * Create the set selector UI component
 * @param {HTMLElement} container - Container element to render into
 * @param {Object} options - Configuration options
 * @param {Function} options.onSetSelect - Callback when set is selected
 * @param {string} options.mode - Display mode ('store', 'collection', 'pack-opening')
 * @param {string} options.selectedSet - Currently selected set
 */
export function createSetSelector(container, options = {}) {
    const { onSetSelect, mode = 'store', selectedSet } = options;
    
    const availableSets = getAvailableSets();
    
    if (availableSets.length === 0) {
        container.innerHTML = '<p class="text-gray-400">No sets available yet.</p>';
        return;
    }
    
    // If only one set is available, auto-select it and show simplified UI
    if (availableSets.length === 1) {
        const setKey = availableSets[0];
        if (onSetSelect) {
            onSetSelect(setKey);
        }
        
        if (mode === 'store') {
            renderSingleSetStore(container, setKey);
        } else if (mode === 'pack-opening') {
            renderSingleSetPackOpening(container, setKey);
        }
        return;
    }
    
    // Multiple sets available - show full selector
    renderMultiSetSelector(container, availableSets, { onSetSelect, mode, selectedSet });
}

/**
 * Render a single set for store mode (simplified when only one set available)
 * @param {HTMLElement} container - Container element
 * @param {string} setKey - The set key
 */
function renderSingleSetStore(container, setKey) {
    const set = TCG_SETS[setKey];
    const setInfo = SET_INFO[setKey];
    const packsOwned = getPacksOwned(setKey);
    const completion = getSetCompletion(setKey);
    
    container.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-white">${setInfo.name} Booster Packs</h3>
                <div class="text-sm text-gray-400">
                    Completion: ${completion}% | Owned: ${packsOwned} packs
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="bg-gray-700 p-4 rounded-lg text-center">
                    <img src="${set.pack.img}" alt="${setInfo.name} Pack" class="w-32 h-48 mx-auto mb-4 object-contain">
                    <h4 class="font-bold text-white mb-2">${setInfo.name} Booster Pack</h4>
                    <p class="text-gray-300 text-sm mb-2">${setInfo.description}</p>
                    <p class="text-green-400 font-bold mb-4">$${set.pack.price.toFixed(2)}</p>
                    <button class="buy-pack-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full" data-set="${setKey}">
                        Buy Pack
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render single set for pack opening mode
 * @param {HTMLElement} container - Container element  
 * @param {string} setKey - The set key
 */
function renderSingleSetPackOpening(container, setKey) {
    const set = TCG_SETS[setKey];
    const setInfo = SET_INFO[setKey];
    const packsOwned = getPacksOwned(setKey);
    
    if (packsOwned > 0) {
        container.innerHTML = `
            <div class="text-center">
                <h3 class="text-2xl font-bold text-white mb-4">${setInfo.name} Booster Pack</h3>
                <p class="text-gray-300 mb-6">You have ${packsOwned} pack${packsOwned > 1 ? 's' : ''} to open!</p>
                <div class="bg-gray-800 p-8 rounded-lg text-center">
                    <img src="${set.pack.img}" alt="${setInfo.name} Pack" class="w-32 h-48 mx-auto mb-6 object-contain" onerror="this.style.display='none'">
                    <button id="open-pack-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg" data-set="${setKey}">
                        Open Pack!
                    </button>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="text-center">
                <h3 class="text-2xl font-bold text-white mb-4">No Packs Available</h3>
                <p class="text-gray-300 mb-6">You don't have any ${setInfo.name} packs to open.</p>
                <button class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onclick="renderMainView('store')">
                    Go to Store
                </button>
            </div>
        `;
    }
}

/**
 * Render multi-set selector for when multiple sets are available
 * @param {HTMLElement} container - Container element
 * @param {Array} availableSets - Available set keys
 * @param {Object} options - Configuration options
 */
function renderMultiSetSelector(container, availableSets, options) {
    const { onSetSelect, mode, selectedSet } = options;
    
    container.innerHTML = `
        <div class="set-selector bg-gray-800 p-6 rounded-lg mb-6">
            <h3 class="text-xl font-bold text-white mb-4">Select a Set</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="set-selector-grid">
                ${availableSets.map(setKey => renderSetOption(setKey, selectedSet === setKey)).join('')}
            </div>
        </div>
        <div id="selected-set-content" class="min-h-[200px]">
            ${selectedSet ? renderSelectedSetContent(selectedSet, mode) : '<p class="text-gray-400 text-center">Select a set above to view options.</p>'}
        </div>
    `;
    
    // Add click handlers for set selection
    availableSets.forEach(setKey => {
        const setOption = container.querySelector(`[data-set-option="${setKey}"]`);
        if (setOption) {
            setOption.addEventListener('click', () => {
                // Update visual selection
                container.querySelectorAll('[data-set-option]').forEach(el => el.classList.remove('ring-2', 'ring-blue-500'));
                setOption.classList.add('ring-2', 'ring-blue-500');
                
                // Update content
                const contentContainer = container.querySelector('#selected-set-content');
                contentContainer.innerHTML = renderSelectedSetContent(setKey, mode);
                
                // Trigger callback
                if (onSetSelect) {
                    onSetSelect(setKey);
                }
            });
        }
    });
}

/**
 * Render individual set option for selection
 * @param {string} setKey - The set key
 * @param {boolean} isSelected - Whether this set is currently selected
 * @returns {string} HTML string for the set option
 */
function renderSetOption(setKey, isSelected = false) {
    const set = TCG_SETS[setKey];
    const setInfo = SET_INFO[setKey];
    const completion = getSetCompletion(setKey);
    const packsOwned = getPacksOwned(setKey);
    
    return `
        <div class="set-option bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors ${isSelected ? 'ring-2 ring-blue-500' : ''}" 
             data-set-option="${setKey}">
            <div class="text-center">
                <img src="${set.pack.img}" alt="${setInfo.name} Pack" class="w-20 h-28 mx-auto mb-3 object-contain">
                <h4 class="font-bold text-white mb-2">${setInfo.name}</h4>
                <p class="text-gray-300 text-sm mb-2">${setInfo.description}</p>
                <div class="text-xs text-gray-400 space-y-1">
                    <div>Progress: ${completion}%</div>
                    <div>Packs: ${packsOwned}</div>
                    <div>Price: $${set.pack.price.toFixed(2)}</div>
                </div>
                <div class="w-full bg-gray-600 rounded-full h-2 mt-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${completion}%"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render content for the selected set based on mode
 * @param {string} setKey - The selected set key
 * @param {string} mode - Display mode
 * @returns {string} HTML string for the selected set content
 */
function renderSelectedSetContent(setKey, mode) {
    switch (mode) {
        case 'store':
            return renderSetStoreContent(setKey);
        case 'pack-opening':
            return renderSetPackOpeningContent(setKey);
        case 'collection':
            return renderSetCollectionContent(setKey);
        default:
            return `<p class="text-gray-400">Mode "${mode}" not supported.</p>`;
    }
}

/**
 * Render store content for selected set
 * @param {string} setKey - The set key
 * @returns {string} HTML string
 */
function renderSetStoreContent(setKey) {
    const set = TCG_SETS[setKey];
    const setInfo = SET_INFO[setKey];
    
    return `
        <div class="bg-gray-800 p-6 rounded-lg">
            <h4 class="text-lg font-bold text-white mb-4">${setInfo.name} Products</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="bg-gray-700 p-4 rounded-lg text-center">
                    <img src="${set.pack.img}" alt="${setInfo.name} Pack" class="w-32 h-48 mx-auto mb-4 object-contain">
                    <h5 class="font-bold text-white mb-2">${setInfo.name} Booster Pack</h5>
                    <p class="text-green-400 font-bold mb-4">$${set.pack.price.toFixed(2)}</p>
                    <button class="buy-pack-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full" data-set="${setKey}">
                        Buy Pack
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render pack opening content for selected set
 * @param {string} setKey - The set key
 * @returns {string} HTML string
 */
function renderSetPackOpeningContent(setKey) {
    const set = TCG_SETS[setKey];
    const setInfo = SET_INFO[setKey];
    const packsOwned = getPacksOwned(setKey);
    
    if (packsOwned > 0) {
        return `
            <div class="bg-gray-800 p-8 rounded-lg text-center">
                <h4 class="text-lg font-bold text-white mb-4">Open ${setInfo.name} Pack</h4>
                <img src="${set.pack.img}" alt="${setInfo.name} Pack" class="w-32 h-48 mx-auto mb-6 object-contain" onerror="this.style.display='none'">
                <p class="text-gray-300 mb-4">You have ${packsOwned} pack${packsOwned > 1 ? 's' : ''} available</p>
                <button id="open-pack-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg" data-set="${setKey}">
                    Open Pack!
                </button>
            </div>
        `;
    } else {
        return `
            <div class="bg-gray-800 p-8 rounded-lg text-center">
                <h4 class="text-lg font-bold text-white mb-4">No ${setInfo.name} Packs</h4>
                <p class="text-gray-300 mb-6">You don't have any ${setInfo.name} packs to open.</p>
                <button class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onclick="renderMainView('store')">
                    Go to Store
                </button>
            </div>
        `;
    }
}

/**
 * Render collection content for selected set
 * @param {string} setKey - The set key
 * @returns {string} HTML string
 */
function renderSetCollectionContent(setKey) {
    const setInfo = SET_INFO[setKey];
    const completion = getSetCompletion(setKey);
    
    return `
        <div class="bg-gray-800 p-6 rounded-lg">
            <h4 class="text-lg font-bold text-white mb-4">${setInfo.name} Collection</h4>
            <div class="text-center">
                <p class="text-gray-300 mb-2">Collection Progress</p>
                <div class="w-full bg-gray-600 rounded-full h-4 mb-2">
                    <div class="bg-blue-600 h-4 rounded-full" style="width: ${completion}%"></div>
                </div>
                <p class="text-blue-400 font-bold">${completion}% Complete</p>
            </div>
        </div>
    `;
}

/**
 * Show notification to user
 * @param {string} message - The notification message
 * @param {string} type - Notification type ('success', 'error', 'info')
 */
export function showNotification(message, type = 'info') {
    // This would integrate with the existing logging system
    // For now, we'll use the existing logMessage function if available
    if (typeof window.logMessage === 'function') {
        window.logMessage(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}