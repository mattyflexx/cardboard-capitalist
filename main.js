console.log("main.js loading...");
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Global error:", message, "at", source, "line", lineno, error);
    return false;
};

// IMPORTS - These should be at the very top
import { TCG_SETS, ASSETS, LAYOUT_BLUEPRINTS, getAllDoodlemonForGame, loadCustomDoodlemon, buildEvolutionChain } from './config.js';
import { gameState, updateGameState, calculateNetWorth, getCardValue, determineCardCondition, updateMarket, initializeStats, updateStats, ACHIEVEMENTS, CARD_CONDITIONS } from './state.js';
import { initializeLazyLoading, createLazyCardImage, preloadCardImages } from './assetLoader.js';

// DOM ELEMENTS
const DOM = {
    mainView: document.getElementById('main-view'),
    viewTitle: document.getElementById('view-title'),
    playerCash: document.getElementById('player-cash'),
    playerNetWorth: document.getElementById('player-net-worth'),
    playerSleeves: document.getElementById('player-sleeves'),
    playerToploaders: document.getElementById('player-toploaders'),
    gameDate: document.getElementById('game-date'),
    logFeed: document.getElementById('log-feed'),
    loupeModal: document.getElementById('loupe-view-modal'),
    loupeCardContainer: document.getElementById('card-image-container'),
    closeLoupeBtn: document.getElementById('close-loupe-btn'),
    navContainer: document.getElementById('main-nav'),
    nextDayBtn: document.getElementById('next-day-btn'),
};

// GLOBAL VARIABLES
let tutorialActive = false;
let currentTutorialStep = 0;
const ASSET_PATH = 'assets/';

// MAIN INITIALIZATION FUNCTION
function initializeGame() {
    console.log("Game is initializing...");
    
    // Initialize lazy loading system
    initializeLazyLoading();
    
    // Generate image paths for all standard cards
    TCG_SETS.genesis.cards.forEach(card => {
        if (!card.img) {
            const paddedDexNum = String(card.doodledexNum).padStart(3, '0');
            const formattedName = card.name.toLowerCase().replace(/\s+/g, '-');
            card.img = `${ASSET_PATH}${paddedDexNum}-${formattedName}.png`;
        }
    });
    
    const gameLoaded = loadGame();
    
    if (!gameLoaded) {
        initializeStats();
        addCardToCollection(TCG_SETS.genesis.cards.find(c => c.id === 'GS032'));
        addCardToCollection(TCG_SETS.genesis.cards.find(c => c.id === 'GS-AA1'));
        addCardToCollection(TCG_SETS.genesis.cards.find(c => c.id === 'GS001'));
        addCardToCollection(TCG_SETS.genesis.cards.find(c => c.id === 'GS-IA1'));
        logMessage("Welcome to Cardboard Capitalist! Your trading card journey begins now.", "system");
    } else {
        // Clean up any expired market events from previous sessions
        cleanupExpiredMarketEvents();
        // Preload images for cards in collection
        const collectionImages = Object.values(gameState.player.collection)
            .map(cardData => cardData.cardInfo.img)
            .filter(img => img);
        preloadCardImages(collectionImages);
    }
    
    setupNavigation();
    setupEventListeners();
    renderMainView('collection');
    calculateNetWorth();
    updateUI();
    
    if (!gameState.settings?.tutorialCompleted) {
        setTimeout(startTutorial, 1000);
    }
    logMessage("Game loaded successfully. Good luck building your collection!", "system");
}

function renderMainView(viewName) {
    DOM.mainView.innerHTML = '';
    gameState.ui.currentView = viewName;
    
    switch(viewName) {
        case 'collection':
            DOM.viewTitle.textContent = 'Collection';
            renderCollectionView(DOM.mainView);
            break;
        case 'store':
            DOM.viewTitle.textContent = 'Store';
            renderStoreView(DOM.mainView);
            break;
        case 'doodledex':
            DOM.viewTitle.textContent = 'DoodleDex';
            renderDoodleDexView(DOM.mainView);
            break;
        case 'achievements':
            DOM.viewTitle.textContent = 'Achievements';
            renderAchievementsView(DOM.mainView);
            break;
        case 'stats':
            DOM.viewTitle.textContent = 'Statistics';
            renderStatsView(DOM.mainView);
            break;
        case 'settings':
            DOM.viewTitle.textContent = 'Settings';
            renderSettingsView(DOM.mainView);
            break;
        case 'card-management':
            if (gameState.ui.selectedCard) {
                DOM.viewTitle.textContent = 'Card Management';
                renderCardManagementView(DOM.mainView, gameState.ui.selectedCard.cardId, gameState.ui.selectedCard.instanceUid);
            } else {
                renderMainView('collection');
            }
            break;
        case 'pack-opening':
            if (gameState.ui.selectedPack) {
                DOM.viewTitle.textContent = 'Opening Pack';
                // Use animated view for Doodlemon (Genesis) packs
                if (gameState.ui.selectedPack === 'genesis') {
                    renderDoodlemonPackOpeningView(DOM.mainView, gameState.ui.selectedPack);
                } else {
                    renderPackOpeningView(DOM.mainView, gameState.ui.selectedPack);
                }
            } else {
                renderMainView('store');
            }
            break;
        default:
            DOM.viewTitle.textContent = 'Collection';
            renderCollectionView(DOM.mainView);
    }
    setupNavigation();
    updateUI();
}

function renderCollectionView(container) {
    const collectionDiv = document.createElement('div');
    collectionDiv.className = 'space-y-4';
    
    const filterControls = document.createElement('div');
    filterControls.className = 'bg-gray-800 p-4 rounded-lg flex flex-wrap gap-2';
    
    filterControls.innerHTML = `
    <div class="flex items-center">
        <label class="mr-2 text-sm">Sort by:</label>
        <select id="collection-sort" class="bg-gray-700 text-white rounded px-2 py-1 text-sm">
            <option value="id">Card ID</option>
            <option value="name">Name</option>
            <option value="rarity">Rarity</option>
            <option value="value">Value</option>
        </select>
    </div>
    <div class="flex items-center ml-4">
        <label class="mr-2 text-sm">Filter:</label>
        <select id="collection-filter-rarity" class="bg-gray-700 text-white rounded px-2 py-1 text-sm">
            <option value="all">All Rarities</option>
            <option value="Common">Common</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Holo Rare">Holo Rare</option>
            <option value="Alternate Art">Alternate Art</option>
            <option value="Insert Art">Insert Art</option>
            <option value="Chase">Chase</option>
        </select>
    </div>
    `;
    collectionDiv.appendChild(filterControls);
    
    const statsDiv = document.createElement('div');
    statsDiv.className = 'bg-gray-800 p-4 rounded-lg text-sm';
    const totalCards = Object.values(gameState.player.collection).reduce((sum, card) => sum + card.instances.length, 0);
    const uniqueCards = Object.keys(gameState.player.collection).length;
    statsDiv.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><p class="text-gray-400">Total Cards</p><p class="text-xl font-bold text-white">${totalCards}</p></div>
        <div><p class="text-gray-400">Unique Cards</p><p class="text-xl font-bold text-white">${uniqueCards}</p></div>
        <div><p class="text-gray-400">Collection Value</p><p class="text-xl font-bold text-green-400">$${calculateCollectionValue().toFixed(2)}</p></div>
        <div><p class="text-gray-400">Completion</p><p class="text-xl font-bold text-blue-400">${Math.round((uniqueCards / TCG_SETS.genesis.cards.length) * 100)}%</p></div>
    </div>
    `;
    collectionDiv.appendChild(statsDiv);
    
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4';
    grid.id = 'collection-grid';
    
    if (Object.keys(gameState.player.collection).length === 0) {
        grid.innerHTML = `<p class="col-span-full text-gray-400">Your collection is empty. Visit the store to buy some packs!</p>`;
    } else {
        renderFilteredCollection(grid);
    }
    
    collectionDiv.appendChild(grid);
    container.appendChild(collectionDiv);
    
    document.getElementById('collection-sort').addEventListener('change', () => renderFilteredCollection(document.getElementById('collection-grid')));
    document.getElementById('collection-filter-rarity').addEventListener('change', () => renderFilteredCollection(document.getElementById('collection-grid')));
}
function renderFilteredCollection(grid) {
    grid.innerHTML = '';
    
    const sortBy = document.getElementById('collection-sort')?.value || 'id';
    const rarityFilter = document.getElementById('collection-filter-rarity')?.value || 'all';
    
    let allInstances = [];
    Object.values(gameState.player.collection).forEach(cardData => {
        cardData.instances.forEach(instance => {
            allInstances.push({ cardInfo: cardData.cardInfo, instance });
        });
    });
    
    if (rarityFilter !== 'all') {
        allInstances = allInstances.filter(item => item.cardInfo.rarity === rarityFilter);
    }
    
    allInstances.sort((a, b) => {
        const cardA = a.cardInfo;
        const cardB = b.cardInfo;
        
        switch(sortBy) {
            case 'name': return cardA.name.localeCompare(cardB.name);
            case 'rarity': return cardA.rarity.localeCompare(cardB.rarity);
            case 'value': return getCardValue(cardB, b.instance) - getCardValue(cardA, a.instance);
            default: return cardA.id.localeCompare(cardB.id);
        }
    });
    
    if (allInstances.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-gray-400">No cards match your filter criteria.</p>`;
        return;
    }
    
    allInstances.forEach(item => {
        const cardElement = buildCardElement(item.cardInfo, item.instance);
        grid.appendChild(cardElement);
    });
}

function calculateCollectionValue() {
    let totalValue = 0;
    Object.values(gameState.player.collection).forEach(cardData => {
        cardData.instances.forEach(instance => {
            totalValue += getCardValue(cardData.cardInfo, instance);
        });
    });
    return totalValue;
}

function renderStoreView(container) {
    const storeDiv = document.createElement('div');
    storeDiv.className = 'space-y-6';
    
    storeDiv.innerHTML = `
    <div class="bg-gray-800 p-6 rounded-lg">
        <h3 class="text-xl font-bold mb-4 text-white">Booster Packs</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="bg-gray-700 p-4 rounded-lg text-center">
                <img src="${TCG_SETS.genesis.pack.img}" alt="Genesis Pack" class="w-32 h-48 mx-auto mb-4 object-contain">
                <h4 class="font-bold text-white mb-2">Genesis Booster Pack</h4>
                <p class="text-green-400 font-bold mb-4">$${TCG_SETS.genesis.pack.price.toFixed(2)}</p>
                <button class="buy-pack-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full" data-set="genesis">
                    Buy Pack
                </button>
            </div>
        </div>
    </div>
    <div class="bg-gray-800 p-6 rounded-lg">
        <h3 class="text-xl font-bold mb-4 text-white">Supplies</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-700 p-4 rounded-lg text-center">
                <h4 class="font-bold text-white mb-2">Card Sleeves (100 pack)</h4>
                <p class="text-green-400 font-bold mb-4">$5.00</p>
                <button class="buy-supply-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full" data-supply="sleeves">
                    Buy Sleeves
                </button>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg text-center">
                <h4 class="font-bold text-white mb-2">Toploaders (25 pack)</h4>
                <p class="text-green-400 font-bold mb-4">$3.00</p>
                <button class="buy-supply-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full" data-supply="toploaders">
                    Buy Toploaders
                </button>
            </div>
        </div>
    </div>
    `;
    
    container.appendChild(storeDiv);
}

function getDoodledexEntries() {
    try {
        return JSON.parse(localStorage.getItem('doodledexEntries') || '{}');
    } catch (error) {
        console.error('Error loading Doodledex entries:', error);
        return {};
    }
}

function renderDoodleDexView(container) {
    const dexDiv = document.createElement('div');
    dexDiv.className = 'space-y-4';
    
    const ownedDoodlemon = new Set();
    const allDoodlemon = getAllDoodlemonForGame();
    
    // Add Doodlemon from collection
    Object.values(gameState.player.collection).forEach(cardData => {
        ownedDoodlemon.add(cardData.cardInfo.doodledexNum);
    });
    
    // Add Doodlemon discovered through Art Director
    const doodledexEntries = getDoodledexEntries();
    Object.keys(doodledexEntries).forEach(id => {
        ownedDoodlemon.add(parseInt(id));
    });
    
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4';
    
    Object.keys(allDoodlemon).sort((a,b) => a - b).forEach(doodledexNum => {
        const dexEntry = document.createElement('div');
        const isCustom = allDoodlemon[doodledexNum].isCustom;
        const isOwned = ownedDoodlemon.has(parseInt(doodledexNum));
        const doodledexEntry = doodledexEntries[doodledexNum];
        
        // Determine if this is an Art Director entry
        const isArtDirectorEntry = doodledexEntry && doodledexEntry.source === 'Art Director';
        
        dexEntry.className = `bg-gray-800 p-4 rounded-lg text-center ${isCustom ? 'border-2 border-purple-500' : ''} ${isArtDirectorEntry ? 'border-2 border-green-500' : ''}`;
        
        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'aspect-square bg-gray-700 rounded-lg mb-2 flex items-center justify-center overflow-hidden';
        
        if (isOwned) {
            // Use Art Director image if available, otherwise use game asset
            let artUrl = allDoodlemon[doodledexNum].img;
            if (doodledexEntry && doodledexEntry.image) {
                artUrl = doodledexEntry.image;
            }
            
            if (artUrl) {
                // Use lazy loading for DoodleDex images
                const dexImg = createLazyCardImage(
                    artUrl,
                    allDoodlemon[doodledexNum].name,
                    'w-full h-full object-contain',
                    function(errorImg) {
                        errorImg.src = `${ASSET_PATH}fallback.png`;
                        errorImg.className = errorImg.className.replace('loading', 'error');
                    }
                );
                imageContainer.appendChild(dexImg);
            } else {
                imageContainer.innerHTML = '<span class="text-gray-500 text-2xl">?</span>';
            }
        } else {
            imageContainer.innerHTML = '<span class="text-gray-500 text-2xl">?</span>';
        }
        
        dexEntry.appendChild(imageContainer);
        
        // Add text content
        const infoP1 = document.createElement('p');
        infoP1.className = `text-sm ${isOwned ? 'text-white' : 'text-gray-500'}`;
        infoP1.textContent = `#${String(doodledexNum).padStart(3, '0')} ${isCustom ? '🆕' : ''} ${isArtDirectorEntry ? '🎨' : ''}`;
        dexEntry.appendChild(infoP1);
        
        const infoP2 = document.createElement('p');
        infoP2.className = `text-xs ${isOwned ? 'text-gray-300' : 'text-gray-600'}`;
        infoP2.textContent = isOwned ? allDoodlemon[doodledexNum].name : 'Unknown';
        dexEntry.appendChild(infoP2);
        
        if (isArtDirectorEntry) {
            const artDirectorP = document.createElement('p');
            artDirectorP.className = 'text-xs text-green-400';
            artDirectorP.textContent = 'Art Director';
            dexEntry.appendChild(artDirectorP);
        }
        
        grid.appendChild(dexEntry);
    });
    
    dexDiv.innerHTML = `<h3 class="text-lg font-bold text-white mb-4">Discovered: ${ownedDoodlemon.size}/${Object.keys(allDoodlemon).length}</h3>`;
    dexDiv.appendChild(grid);
    container.appendChild(dexDiv);
}
function renderPackOpeningView(container, setName) {
    const set = TCG_SETS[setName];
    if (!set) return;
    
    const packsAvailable = gameState.player.sealedInventory[setName] || 0;
    
    const packOpeningDiv = document.createElement('div');
    packOpeningDiv.className = 'flex flex-col items-center space-y-6 p-6';
    
    if (packsAvailable > 0) {
        packOpeningDiv.innerHTML = `
        <div class="text-center">
            <h3 class="text-2xl font-bold text-white mb-4">${set.name} Booster Pack</h3>
            <p class="text-gray-300 mb-6">You have ${packsAvailable} pack${packsAvailable > 1 ? 's' : ''} to open!</p>
        </div>
        <div class="bg-gray-800 p-8 rounded-lg text-center">
            <img src="${set.pack.img}" alt="${set.name} Pack" class="w-32 h-48 mx-auto mb-6 object-contain" onerror="this.style.display='none'">
            <button id="open-pack-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg" data-set="${setName}">
                Open Pack!
            </button>
        </div>
        <div class="text-center">
            <p class="text-gray-400 text-sm">Click the button above to open your pack and reveal your cards!</p>
        </div>
        `;
    } else {
        packOpeningDiv.innerHTML = `
        <div class="text-center">
            <h3 class="text-2xl font-bold text-white mb-4">No Packs Available</h3>
            <p class="text-gray-300 mb-6">You don't have any ${set.name} packs to open.</p>
            <button class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onclick="renderMainView('store')">
                Go to Store
            </button>
        </div>
        `;
    }
    
    container.appendChild(packOpeningDiv);
    
    // Add event listener for opening packs
    const openPackBtn = document.getElementById('open-pack-btn');
    if (openPackBtn) {
        openPackBtn.addEventListener('click', () => {
            openPack(setName);
            renderMainView('collection'); // Return to collection after opening
        });
    }
}

// Animated Pack Opening View for Doodlemon Packs
function renderDoodlemonPackOpeningView(container, setName) {
    const set = TCG_SETS[setName];
    if (!set) return;
    
    const packsAvailable = gameState.player.sealedInventory[setName] || 0;
    if (packsAvailable <= 0) {
        renderPackOpeningView(container, setName); // Fallback to simple view
        return;
    }
    
    // Pack opening state management
    const packOpeningState = {
        stage: 'initialization', // 'initialization', 'ripping', 'revealing', 'summary'
        cards: [],
        currentCardIndex: 0,
        revealedCards: []
    };
    
    container.innerHTML = ''; // Clear container
    
    // Create main pack opening container
    const packContainer = document.createElement('div');
    packContainer.className = 'pack-opening-container flex flex-col items-center justify-center min-h-full bg-gradient-to-b from-gray-900 to-gray-800 p-8';
    packContainer.id = 'pack-opening-container';
    
    // Initialize Stage 1: Scene Initialization
    renderPackStage1(packContainer, set, packOpeningState, setName);
    
    container.appendChild(packContainer);
}

// Stage 1: Scene Initialization - Centered sealed pack, await click
function renderPackStage1(container, set, state, setName) {
    container.innerHTML = `
    <div class="pack-scene text-center">
        <h2 class="text-3xl font-bold text-white mb-8">Ready to open your ${set.name} pack?</h2>
        
        <!-- Sealed Pack Display -->
        <div class="sealed-pack-container mb-8">
            <div class="pack-wrapper relative transition-transform duration-300 hover:scale-105">
                <img src="${set.pack.img}"
                    alt="${set.name} Pack"
                    class="pack-image w-48 h-72 mx-auto object-contain drop-shadow-2xl"
                    onerror="this.style.display='none'">
                <div class="pack-glow absolute inset-0 bg-blue-400 opacity-20 blur-lg rounded-lg"></div>
            </div>
        </div>
        
        <!-- Start Button -->
        <button id="start-pack-opening"
            class="start-btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl">
            <span class="flex items-center gap-3">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"></path>
                </svg>
                Rip Open Pack!
            </span>
        </button>
        
        <p class="text-gray-400 text-sm mt-4">Click to start the pack opening sequence</p>
    </div>
    `;
    
    // Use setTimeout to ensure DOM element exists before adding event listener
    setTimeout(() => {
        const startBtn = document.getElementById('start-pack-opening');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                // Generate pack contents (use existing logic)
                const packCards = generatePackCards(set);
                state.cards = packCards;
                state.stage = 'ripping';
                
                // Play pack rip SFX (stub)
                playPackTearSFX();
                
                // Move to Stage 2
                renderPackStage2(container, set, state, setName);
            });
        }
    }, 0);
}

// Stage 2: Pack Rip Animation - Animate tear and reveal card stack
function renderPackStage2(container, set, state, setName) {
    container.innerHTML = `
    <div class="pack-rip-scene text-center">
        <h2 class="text-2xl font-bold text-white mb-8">Opening pack...</h2>
        
        <!-- Pack Ripping Animation -->
        <div class="pack-rip-container mb-8 relative">
            <div class="pack-wrapper ripping-animation">
                <img src="${set.pack.img}"
                    alt="${set.name} Pack"
                    class="pack-image w-48 h-72 mx-auto object-contain opacity-75 transform scale-110"
                    style="filter: blur(1px);">
                
                <!-- Rip Effect Overlay -->
                <div class="rip-effects absolute inset-0 flex items-center justify-center">
                    <div class="rip-lines">
                        <div class="rip-line bg-white opacity-80 w-32 h-1 transform rotate-12 animate-pulse"></div>
                        <div class="rip-line bg-white opacity-60 w-24 h-1 transform -rotate-6 animate-pulse mt-2"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <p class="text-yellow-400 font-semibold animate-pulse">Tearing wrapper...</p>
    </div>
    `;
    
    // Simulate pack rip animation duration
    setTimeout(() => {
        state.stage = 'revealing';
        renderPackStage3(container, set, state, setName);
    }, 2000); // 2 second rip animation
}
// Stage 3: Card Reveal Loop - Click stack to reveal cards one by one
function renderPackStage3(container, set, state, setName) {
    const remainingCards = state.cards.length - state.currentCardIndex;
    const currentCard = state.currentCardIndex < state.cards.length ? state.cards[state.currentCardIndex] : null;
    
    if (!currentCard) {
        // All cards revealed, move to summary
        state.stage = 'summary';
        renderPackStage4(container, set, state, setName);
        return;
    }
    
    container.innerHTML = `
    <div class="card-reveal-scene text-center">
        <h2 class="text-2xl font-bold text-white mb-4">Revealing cards...</h2>
        <p class="text-gray-300 mb-8">${remainingCards} cards remaining</p>
        
        <!-- Card Stack Display -->
        <div class="card-stack-container mb-8 relative">
            <div class="card-stack cursor-pointer transform transition-transform duration-200 hover:scale-105" id="card-stack">
                <!-- Card Back Stack -->
                <div class="card-back-stack relative">
                    <img src="${ASSETS.cardBack}"
                        alt="Card Back"
                        class="card-back w-32 h-44 mx-auto object-contain drop-shadow-lg">
                    
                    <!-- Stack effect with multiple card backs offset -->
                    <img src="${ASSETS.cardBack}"
                        alt="Card Back"
                        class="card-back w-32 h-44 mx-auto object-contain absolute top-1 left-1 -z-10 opacity-90">
                    <img src="${ASSETS.cardBack}"
                        alt="Card Back"
                        class="card-back w-32 h-44 mx-auto object-contain absolute top-2 left-2 -z-20 opacity-80">
                </div>
                
                <!-- Cards remaining indicator -->
                <div class="cards-remaining-badge absolute -top-2 -right-2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    ${remainingCards}
                </div>
            </div>
        </div>
        
        <!-- Card Reveal Area -->
        <div class="card-reveal-area mb-8 min-h-[200px] flex items-center justify-center" id="card-reveal-area">
            <p class="text-gray-400">Click the card stack to reveal the next card!</p>
        </div>
        
        <!-- Summary Area for Revealed Cards -->
        <div class="revealed-cards-summary" id="revealed-cards-summary">
            <h3 class="text-lg font-bold text-white mb-4">Cards Revealed:</h3>
            <div class="revealed-cards-grid grid grid-cols-6 gap-2 max-w-4xl mx-auto">
                ${state.revealedCards.map(card => `
                    <div class="revealed-card-mini bg-gray-800 p-1 rounded">
                        <div class="text-xs text-center text-white">${card.name}</div>
                        <div class="text-xs text-center ${getRarityColor(card.rarity)}">${card.rarity}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `;
    
    // Add event listener to card stack
    setTimeout(() => {
        const cardStack = document.getElementById('card-stack');
        if (cardStack) {
            cardStack.addEventListener('click', () => {
                revealNextCard(container, set, state, setName);
            });
        }
    }, 0);
}


// Helper function to reveal the next card
function revealNextCard(container, set, state, setName) {
    const currentCard = state.cards[state.currentCardIndex];
    state.revealedCards.push(currentCard);
    
    // Add card to collection
    addCardToCollection(currentCard);
    
    // Play card reveal SFX based on rarity
    playCardRevealSFX(currentCard.rarity);
    
    // Update reveal area with the card
    const revealArea = document.getElementById('card-reveal-area');
    if (revealArea) {
        revealArea.innerHTML = '';
        const cardElement = buildCardElement(currentCard);
        cardElement.classList.add('revealed-card', 'animate-reveal');
        cardElement.style.width = '200px'; // Adjust size for reveal animation
        revealArea.appendChild(cardElement);
        
        // Show rarity flash effect
        const rarityFlash = document.createElement('div');
        rarityFlash.className = `rarity-flash ${getRarityFlashClass(currentCard.rarity)}`;
        revealArea.appendChild(rarityFlash);
    }
    
    // Update the summary grid
    const summaryGrid = document.querySelector('.revealed-cards-grid');
    if (summaryGrid) {
        const miniCard = document.createElement('div');
        miniCard.className = 'revealed-card-mini bg-gray-800 p-1 rounded';
        miniCard.innerHTML = `
            <div class="text-xs text-center text-white">${currentCard.name}</div>
            <div class="text-xs text-center ${getRarityColor(currentCard.rarity)}">${currentCard.rarity}</div>
        `;
        summaryGrid.appendChild(miniCard);
    }
    
    // Move to next card
    state.currentCardIndex++;
    
    // After a delay, move to next card or summary
    setTimeout(() => {
        renderPackStage3(container, set, state, setName);
    }, 1500); // 1.5 second delay before next card
}

// Stage 4: Pack Summary - Show all cards and completion options
function renderPackStage4(container, set, state, setName) {
    // Remove pack from inventory
    gameState.player.sealedInventory[setName]--;
    
    // Update stats
    updateStats('packsOpened', 1);
    updateStats('cardsAcquired', state.cards.length);
    
    // Check for achievements
    checkAchievements();
    
    // Save game
    saveGame();
    
    container.innerHTML = `
    <div class="pack-summary-scene text-center">
        <h2 class="text-3xl font-bold text-white mb-4">Pack Complete!</h2>
        <p class="text-gray-300 mb-8">You've opened a ${set.name} pack and added ${state.cards.length} cards to your collection.</p>
        
        <!-- Cards Summary -->
        <div class="cards-summary mb-8">
            <h3 class="text-xl font-bold text-white mb-4">Cards Obtained:</h3>
            <div class="cards-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
                ${state.cards.map(card => `
                    <div class="card-summary-item">
                        <div class="card-mini-container" style="width: 120px; margin: 0 auto;">
                            ${buildCardElementHTML(card)}
                        </div>
                        <div class="card-info mt-2">
                            <div class="text-sm text-white">${card.name}</div>
                            <div class="text-xs ${getRarityColor(card.rarity)}">${card.rarity}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons flex flex-wrap justify-center gap-4">
            <button id="open-another-pack" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Open Another Pack (${gameState.player.sealedInventory[setName] || 0} left)
            </button>
            <button id="go-to-collection" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                View Collection
            </button>
            <button id="go-to-store" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                Go to Store
            </button>
        </div>
    </div>
    `;
    
    // Add event listeners
    setTimeout(() => {
        document.getElementById('open-another-pack')?.addEventListener('click', () => {
            if (gameState.player.sealedInventory[setName] > 0) {
                renderDoodlemonPackOpeningView(container, setName);
            } else {
                renderMainView('store');
            }
        });
        
        document.getElementById('go-to-collection')?.addEventListener('click', () => {
            renderMainView('collection');
        });
        
        document.getElementById('go-to-store')?.addEventListener('click', () => {
            renderMainView('store');
        });
    }, 0);
}

// Helper function to generate HTML for a card element (simplified version for summary)
function buildCardElementHTML(cardInfo) {
    return `
    <div class="card-container" style="position: relative; width: 100%; aspect-ratio: 5/7; overflow: hidden;">
        <img src="${cardInfo.img || `${ASSET_PATH}fallback.png`}" alt="${cardInfo.name}" class="card-art" style="position: absolute; width: 80%; height: 32%; top: 7%; object-fit: cover; z-index: 1;">
        <img src="${ASSETS.frames[cardInfo.layout === 'Full-Art' ? 'fullArt' : 'standard']}" class="card-frame" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; z-index: 2;">
        <div class="card-text-overlay" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; z-index: 3;">
            <div class="card-name-box" style="position: absolute; left: 10%; top: 43%; width: 80%; text-align: center; color: white; font-weight: bold; font-size: 0.7rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">
                ${cardInfo.name}
            </div>
        </div>
        ${(cardInfo.rarity === 'Holo Rare' || cardInfo.rarity === 'Chase' || cardInfo.rarity === 'Alternate Art') ? 
            `<div class="card-holo-overlay" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; background: linear-gradient(125deg, transparent 0%, rgba(255,255,255,0.3) 30%, transparent 60%); background-size: 200% 200%; animation: holoShine 3s ease infinite; z-index: 4;"></div>` : ''}
    </div>
    `;
}

// Helper functions for card reveal effects
function getRarityColor(rarity) {
    switch(rarity) {
        case 'Common': return 'text-gray-400';
        case 'Uncommon': return 'text-green-400';
        case 'Holo Rare': return 'text-purple-400';
        case 'Alternate Art': return 'text-yellow-400';
        case 'Insert Art': return 'text-blue-400';
        case 'Chase': return 'text-red-400';
        default: return 'text-white';
    }
}

function getRarityFlashClass(rarity) {
    switch(rarity) {
        case 'Common': return 'flash-common';
        case 'Uncommon': return 'flash-uncommon';
        case 'Holo Rare': return 'flash-holo';
        case 'Alternate Art': return 'flash-alt-art';
        case 'Insert Art': return 'flash-insert';
        case 'Chase': return 'flash-chase';
        default: return '';
    }
}

// Sound effect stubs (replace with actual implementation if needed)
function playPackTearSFX() {
    // Play pack opening sound
    console.log("Playing pack tear sound effect");
}

function playCardRevealSFX(rarity) {
    // Play card reveal sound based on rarity
    console.log(`Playing ${rarity} card reveal sound effect`);
}

// Helper function to generate pack cards
function generatePackCards(set) {
    const packCards = [];
    const rarityWeights = {'Common': 70, 'Uncommon': 20, 'Holo Rare': 8, 'Alternate Art': 1.5, 'Chase': 0.5};
    
    for (let i = 0; i < 11; i++) {
        const rarity = weightedRandomChoice(rarityWeights);
        
        // For base cards (Common, Uncommon, Holo Rare), only include cards 001-040
        let availableCards;
        if (['Common', 'Uncommon', 'Holo Rare'].includes(rarity)) {
            availableCards = set.cards.filter(c => c.rarity === rarity && c.doodledexNum >= 1 && c.doodledexNum <= 40);
        } else {
            // For special cards (Alternate Art, Chase, Insert Art), include all
            availableCards = set.cards.filter(c => c.rarity === rarity);
        }
        
        if (availableCards.length > 0) {
            const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
            packCards.push(randomCard);
        }
    }
    
    return packCards;
}
function renderCardManagementView(container, cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) {
        renderMainView('collection');
        return;
    }
    
    const instance = cardData.instances.find(i => i.uid === instanceUid);
    if (!instance) {
        renderMainView('collection');
        return;
    }
    
    const cardValue = getCardValue(cardData.cardInfo, instance);
    
    const cardManagementDiv = document.createElement('div');
    cardManagementDiv.className = 'flex flex-col md:flex-row gap-6';
    
    // Card preview section
    const cardPreviewSection = document.createElement('div');
    cardPreviewSection.className = 'w-full md:w-1/3 flex flex-col items-center';
    
    const cardPreview = buildCardElement(cardData.cardInfo, instance);
    cardPreview.style.width = '250px';
    cardPreview.style.margin = '0 auto 1rem auto';
    
    cardPreviewSection.appendChild(cardPreview);
    
    // Card info section
    const cardInfoSection = document.createElement('div');
    cardInfoSection.className = 'w-full md:w-2/3';
    
    cardInfoSection.innerHTML = `
    <div class="bg-gray-800 p-6 rounded-lg mb-6">
        <h3 class="text-xl font-bold text-white mb-4">${cardData.cardInfo.name}</h3>
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <p class="text-gray-400 text-sm">Card ID</p>
                <p class="text-white">${cardData.cardInfo.id}</p>
            </div>
            <div>
                <p class="text-gray-400 text-sm">Rarity</p>
                <p class="text-white">${cardData.cardInfo.rarity}</p>
            </div>
            <div>
                <p class="text-gray-400 text-sm">Condition</p>
                <p class="text-white">${instance.condition}</p>
            </div>
            <div>
                <p class="text-gray-400 text-sm">Value</p>
                <p class="text-green-400 font-bold">$${cardValue.toFixed(2)}</p>
            </div>
        </div>
        <div class="mb-4">
            <p class="text-gray-400 text-sm">Acquired</p>
            <p class="text-white">Day ${instance.acquired.day}, Year ${instance.acquired.year}</p>
        </div>
        <div>
            <p class="text-gray-400 text-sm">Lore</p>
            <p class="text-white italic">${cardData.cardInfo.lore || "No lore available for this card."}</p>
        </div>
    </div>
    
    <div class="bg-gray-800 p-6 rounded-lg mb-6">
        <h3 class="text-xl font-bold text-white mb-4">Card Protection</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <p class="text-gray-400 text-sm mb-2">Sleeve Status</p>
                ${instance.sleeved ? 
                    `<div class="flex items-center text-green-400 mb-2">
                        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Card is sleeved
                    </div>
                    <button class="unsleeve-card-btn bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm" data-card-id="${cardId}" data-instance-uid="${instanceUid}">
                        Remove Sleeve
                    </button>` :
                    `<div class="flex items-center text-gray-400 mb-2">
                        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        Card is not sleeved
                    </div>
                    <button class="sleeve-card-btn bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm ${gameState.player.supplies.sleeves <= 0 ? 'opacity-50 cursor-not-allowed' : ''}" data-card-id="${cardId}" data-instance-uid="${instanceUid}" ${gameState.player.supplies.sleeves <= 0 ? 'disabled' : ''}>
                        Add Sleeve (${gameState.player.supplies.sleeves} available)
                    </button>`
                }
            </div>
            <div>
                <p class="text-gray-400 text-sm mb-2">Toploader Status</p>
                ${instance.toploadered ? 
                    `<div class="flex items-center text-green-400 mb-2">
                        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Card is in toploader
                    </div>
                    <button class="remove-toploader-btn bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm" data-card-id="${cardId}" data-instance-uid="${instanceUid}">
                        Remove Toploader
                    </button>` :
                    `<div class="flex items-center text-gray-400 mb-2">
                        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        Card is not in toploader
                    </div>
                    <button class="toploader-card-btn bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm ${gameState.player.supplies.toploaders <= 0 ? 'opacity-50 cursor-not-allowed' : ''}" data-card-id="${cardId}" data-instance-uid="${instanceUid}" ${gameState.player.supplies.toploaders <= 0 ? 'disabled' : ''}>
                        Add Toploader (${gameState.player.supplies.toploaders} available)
                    </button>`
                }
            </div>
        </div>
    </div>
    
    <div class="bg-gray-800 p-6 rounded-lg">
        <h3 class="text-xl font-bold text-white mb-4">Actions</h3>
        <div class="flex flex-wrap gap-3">
            <button class="sell-card-btn bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded" data-card-id="${cardId}" data-instance-uid="${instanceUid}">
                Sell for $${cardValue.toFixed(2)}
            </button>
            <button class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded" onclick="renderMainView('collection')">
                Back to Collection
            </button>
        </div>
    </div>
    `;
    
    cardPreviewSection.appendChild(document.createElement('div')); // Spacer
    
    cardManagementDiv.appendChild(cardPreviewSection);
    cardManagementDiv.appendChild(cardInfoSection);
    
    container.appendChild(cardManagementDiv);
}

function renderAchievementsView(container) {
    const achievementsDiv = document.createElement('div');
    achievementsDiv.className = 'space-y-6';
    
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    
    Object.entries(ACHIEVEMENTS).forEach(([id, achievement]) => {
        const achievementCard = document.createElement('div');
        achievementCard.className = `bg-gray-800 p-4 rounded-lg border-l-4 ${achievement.unlocked ? 'border-green-500' : 'border-gray-600'}`;
        
        achievementCard.innerHTML = `
        <div class="flex items-start">
            <div class="achievement-icon mr-4 ${achievement.unlocked ? 'text-green-400' : 'text-gray-500'}">
                ${achievement.unlocked ? 
                    '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' :
                    '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>'
                }
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-lg ${achievement.unlocked ? 'text-white' : 'text-gray-400'}">${achievement.name}</h3>
                <p class="text-sm ${achievement.unlocked ? 'text-gray-300' : 'text-gray-500'}">${achievement.description}</p>
                ${achievement.reward ? 
                    `<div class="mt-2 text-sm ${achievement.unlocked ? 'text-yellow-400' : 'text-gray-600'}">
                        Reward: ${achievement.reward.cash ? `$${achievement.reward.cash}` : ''}
                    </div>` : ''
                }
            </div>
        </div>
        `;
        
        grid.appendChild(achievementCard);
    });
    
    achievementsDiv.appendChild(grid);
    container.appendChild(achievementsDiv);
}
function renderStatsView(container) {
    const statsDiv = document.createElement('div');
    statsDiv.className = 'space-y-6';
    
    // Initialize stats if they don't exist
    initializeStats();
    
    statsDiv.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg">
            <h3 class="text-xl font-bold mb-4 text-white">Collection Stats</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Total Cards</p>
                    <p class="text-2xl font-bold text-white">${Object.values(gameState.player.collection).reduce((sum, card) => sum + card.instances.length, 0)}</p>
                </div>
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Unique Cards</p>
                    <p class="text-2xl font-bold text-white">${Object.keys(gameState.player.collection).length}</p>
                </div>
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Collection Value</p>
                    <p class="text-2xl font-bold text-green-400">$${calculateCollectionValue().toFixed(2)}</p>
                </div>
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Completion</p>
                    <p class="text-2xl font-bold text-blue-400">${Math.round((Object.keys(gameState.player.collection).length / TCG_SETS.genesis.cards.length) * 100)}%</p>
                </div>
            </div>
        </div>
        
        <div class="bg-gray-800 p-6 rounded-lg">
            <h3 class="text-xl font-bold mb-4 text-white">Game Stats</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Packs Opened</p>
                    <p class="text-2xl font-bold text-white">${gameState.stats.packsOpened || 0}</p>
                </div>
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Cards Acquired</p>
                    <p class="text-2xl font-bold text-white">${gameState.stats.cardsAcquired || 0}</p>
                </div>
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Cards Sold</p>
                    <p class="text-2xl font-bold text-white">${gameState.stats.cardsSold || 0}</p>
                </div>
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Days Played</p>
                    <p class="text-2xl font-bold text-white">${gameState.stats.daysPlayed || 0}</p>
                </div>
            </div>
        </div>
        
        <div class="bg-gray-800 p-6 rounded-lg">
            <h3 class="text-xl font-bold mb-4 text-white">Financial Stats</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Total Earned</p>
                    <p class="text-2xl font-bold text-green-400">$${(gameState.stats.totalEarned || 0).toFixed(2)}</p>
                </div>
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Total Spent</p>
                    <p class="text-2xl font-bold text-red-400">$${(gameState.stats.totalSpent || 0).toFixed(2)}</p>
                </div>
                <div class="stat-card bg-gray-700 p-4 rounded-lg text-center">
                    <p class="text-gray-400 text-sm">Net Profit</p>
                    <p class="text-2xl font-bold ${(gameState.stats.totalEarned || 0) - (gameState.stats.totalSpent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">
                        $${((gameState.stats.totalEarned || 0) - (gameState.stats.totalSpent || 0)).toFixed(2)}
                    </p>
                </div>
            </div>
        </div>
        
        <div class="bg-gray-800 p-6 rounded-lg">
            <h3 class="text-xl font-bold mb-4 text-white">Rarity Breakdown</h3>
            <div class="space-y-4">
                ${renderRarityBreakdown()}
            </div>
        </div>
    `;
    
    container.appendChild(statsDiv);
}

function renderRarityBreakdown() {
    const rarities = ['Common', 'Uncommon', 'Holo Rare', 'Alternate Art', 'Insert Art', 'Chase'];
    const rarityCount = {};
    
    // Initialize counts
    rarities.forEach(rarity => rarityCount[rarity] = 0);
    
    // Count cards by rarity
    Object.values(gameState.player.collection).forEach(cardData => {
        const rarity = cardData.cardInfo.rarity;
        if (rarityCount[rarity] !== undefined) {
            rarityCount[rarity] += cardData.instances.length;
        }
    });
    
    // Calculate total
    const totalCards = Object.values(rarityCount).reduce((sum, count) => sum + count, 0);
    
    // Generate HTML
    return rarities.map(rarity => {
        const count = rarityCount[rarity];
        const percentage = totalCards > 0 ? (count / totalCards * 100).toFixed(1) : 0;
        const barWidth = totalCards > 0 ? (count / totalCards * 100) : 0;
        
        return `
        <div class="rarity-bar">
            <div class="flex justify-between mb-1">
                <span class="text-sm ${getRarityColor(rarity)}">${rarity}</span>
                <span class="text-sm text-gray-400">${count} (${percentage}%)</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2.5">
                <div class="h-2.5 rounded-full ${getRarityBarColor(rarity)}" style="width: ${barWidth}%"></div>
            </div>
        </div>
        `;
    }).join('');
}


function getRarityBarColor(rarity) {
    switch(rarity) {
        case 'Common': return 'bg-gray-400';
        case 'Uncommon': return 'bg-green-400';
        case 'Holo Rare': return 'bg-purple-400';
        case 'Alternate Art': return 'bg-yellow-400';
        case 'Insert Art': return 'bg-blue-400';
        case 'Chase': return 'bg-red-400';
        default: return 'bg-gray-400';
    }
}

function renderSettingsView(container) {
    const settingsDiv = document.createElement('div');
    settingsDiv.className = 'space-y-6';
    
    settingsDiv.innerHTML = `
    <div class="bg-gray-800 p-6 rounded-lg">
        <h3 class="text-xl font-bold mb-6 text-white">Game Settings</h3>
        
        <div class="mb-6">
            <h4 class="text-lg font-semibold text-white mb-2">Save Management</h4>
            <div class="flex flex-wrap gap-3">
                <button id="export-save-btn" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
                    Export Save Data
                </button>
                <button id="reset-game-btn" class="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded">
                    Reset Game
                </button>
            </div>
        </div>
        
        <div class="mb-6">
            <h4 class="text-lg font-semibold text-white mb-2">Tutorial</h4>
            <button id="restart-tutorial-btn" class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">
                Restart Tutorial
            </button>
        </div>
        
        <div>
            <h4 class="text-lg font-semibold text-white mb-2">About</h4>
            <p class="text-gray-300 mb-2">Cardboard Capitalist v1.0</p>
            <p class="text-gray-400 text-sm">A trading card collection simulator game.</p>
        </div>
    </div>
    `;
    
    container.appendChild(settingsDiv);
    
    // Add event listeners
    document.getElementById('export-save-btn').addEventListener('click', exportSaveData);
    document.getElementById('reset-game-btn').addEventListener('click', confirmResetGame);
    document.getElementById('restart-tutorial-btn').addEventListener('click', startTutorial);
}

function confirmResetGame() {
    if (confirm("Are you sure you want to reset the game? All progress will be lost!")) {
        resetGame();
    }
}

function setupNavigation() {
    const navItems = [
        { id: 'collection', label: 'Collection', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
        { id: 'store', label: 'Store', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
        { id: 'doodledex', label: 'DoodleDex', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
        { id: 'achievements', label: 'Achievements', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
        { id: 'stats', label: 'Statistics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
    ];
    
    DOM.navContainer.innerHTML = '';
    
    navItems.forEach(item => {
        const navButton = document.createElement('button');
        navButton.className = `nav-btn flex items-center justify-center p-2 rounded-lg ${gameState.ui.currentView === item.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`;
        navButton.dataset.view = item.id;
        
        navButton.innerHTML = `
        <span class="sr-only">${item.label}</span>
        <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path>
        </svg>
        `;
        
        navButton.addEventListener('click', () => renderMainView(item.id));
        DOM.navContainer.appendChild(navButton);
    });
}

function setupEventListeners() {
    // Next day button
    DOM.nextDayBtn.addEventListener('click', advanceDay);
    
    // Card click event delegation
    document.addEventListener('click', function(e) {
        // Card inspection
        if (e.target.closest('.card-inspect-overlay')) {
            const cardElement = e.target.closest('.card-container');
            if (cardElement) {
                const cardId = cardElement.dataset.cardId;
                const instanceUid = cardElement.dataset.instanceUid;
                
                if (cardId) {
                    gameState.ui.selectedCard = { cardId, instanceUid };
                    renderMainView('card-management');
                }
            }
        }
        
        // Buy pack button
        if (e.target.closest('.buy-pack-btn')) {
            const setName = e.target.closest('.buy-pack-btn').dataset.set;
            buyPack(setName);
        }
        
        // Buy supplies button
        if (e.target.closest('.buy-supply-btn')) {
            const supplyType = e.target.closest('.buy-supply-btn').dataset.supply;
            buySupplies(supplyType);
        }
        
        // Sleeve card button
        if (e.target.closest('.sleeve-card-btn')) {
            const btn = e.target.closest('.sleeve-card-btn');
            const cardId = btn.dataset.cardId;
            const instanceUid = btn.dataset.instanceUid;
            sleeveCard(cardId, instanceUid);
        }
        
        // Unsleeve card button
        if (e.target.closest('.unsleeve-card-btn')) {
            const btn = e.target.closest('.unsleeve-card-btn');
            const cardId = btn.dataset.cardId;
            const instanceUid = btn.dataset.instanceUid;
            unsleeveCard(cardId, instanceUid);
        }
        
        // Toploader card button
        if (e.target.closest('.toploader-card-btn')) {
            const btn = e.target.closest('.toploader-card-btn');
            const cardId = btn.dataset.cardId;
            const instanceUid = btn.dataset.instanceUid;
            toploaderCard(cardId, instanceUid);
        }
        
        // Remove toploader button
        if (e.target.closest('.remove-toploader-btn')) {
            const btn = e.target.closest('.remove-toploader-btn');
            const cardId = btn.dataset.cardId;
            const instanceUid = btn.dataset.instanceUid;
            removeToploader(cardId, instanceUid);
        }
        
        // Sell card button
        if (e.target.closest('.sell-card-btn')) {
            const btn = e.target.closest('.sell-card-btn');
            const cardId = btn.dataset.cardId;
            const instanceUid = btn.dataset.instanceUid;
            sellCard(cardId, instanceUid);
        }
    });
}
function buildCardElement(cardInfo, instance) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-container';
    cardElement.dataset.cardId = cardInfo.id;
    if (instance) cardElement.dataset.instanceUid = instance.uid;

    // Handle Insert Art cards with special styling
    if (cardInfo.layout === 'Insert-Art') {
        cardElement.classList.add('card-insert-art');
        
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';
        
        // Use lazy loading for insert art card images
        const artImg = createLazyCardImage(
            cardInfo.img || `${ASSET_PATH}fallback.png`,
            cardInfo.name,
            'card-art'
        );
        cardInner.appendChild(artImg);
        
        // Use the provided .card-text-overlay CSS for insert cards
        const textOverlay = document.createElement('div');
        textOverlay.className = 'card-text-overlay';
        
        const nameBox = document.createElement('div');
        nameBox.className = 'card-name-box';
        nameBox.textContent = cardInfo.name;
        
        // Position the name box using the insertArt layout coordinates
        const layout = LAYOUT_BLUEPRINTS.insertArt;
        if (layout && layout.name) {
            nameBox.style.left = `${(layout.name.x / 750) * 100}%`;
            nameBox.style.top = `${(layout.name.y / 1050) * 100}%`;
            nameBox.style.width = `${(layout.name.width / 750) * 100}%`;
            nameBox.style.height = `${(layout.name.height / 1050) * 100}%`;
        }
        
        textOverlay.appendChild(nameBox);
        cardInner.appendChild(textOverlay);
        
        const textureOverlay = document.createElement('div');
        textureOverlay.className = 'card-texture-overlay';
        cardInner.appendChild(textureOverlay);
        
        // Add holo overlay for insert art cards
        const holoOverlay = document.createElement('div');
        holoOverlay.className = 'card-holo-overlay';
        cardInner.appendChild(holoOverlay);
        
        cardElement.appendChild(cardInner);
        
        const inspectOverlay = document.createElement('div');
        inspectOverlay.className = 'card-inspect-overlay';
        cardElement.appendChild(inspectOverlay);
        
        return cardElement;
    }

    // Standard and Full-Art card handling with lazy loading
    const artImg = createLazyCardImage(
        cardInfo.img || `${ASSET_PATH}fallback.png`,
        cardInfo.name,
        'card-art'
    );
    cardElement.appendChild(artImg);

    // Frame images are critical assets and should load immediately
    const frameImg = document.createElement('img');
    const frameType = cardInfo.layout === 'Full-Art' ? 'fullArt' : 'standard';
    frameImg.src = ASSETS.frames[frameType];
    frameImg.className = 'card-frame';
    cardElement.appendChild(frameImg);

    const textOverlay = document.createElement('div');
    textOverlay.className = 'card-text-overlay';
    const canvasWidth = 750;
    const canvasHeight = 1050;

    // Add evolution chain if applicable
    if (cardInfo.evolvesFrom || TCG_SETS.genesis.cards.some(card => card.evolvesFrom === cardInfo.id)) {
        const blueprint = LAYOUT_BLUEPRINTS[cardInfo.layout.toLowerCase()] || LAYOUT_BLUEPRINTS.standard;
        
        // Get the evolution chain
        const evolutionChain = buildEvolutionChain(cardInfo.id);
        
        if (evolutionChain.length > 1) { // Only show if there's an evolution relationship
            const chainContainer = document.createElement('div');
            chainContainer.className = 'evolution-chain-container';
            chainContainer.style.left = `${(blueprint.evolutionChain.x / canvasWidth) * 100}%`;
            chainContainer.style.top = `${(blueprint.evolutionChain.y / canvasHeight) * 100}%`;
            chainContainer.style.width = `${(blueprint.evolutionChain.width / canvasWidth) * 100}%`;
            chainContainer.style.height = `${(blueprint.evolutionChain.height / canvasHeight) * 100}%`;
            
            const chainElement = document.createElement('div');
            chainElement.className = 'evolution-chain';
            
            // Add each evolution to the chain
            evolutionChain.forEach((evo, index) => {
                // Add arrow between nodes (except before the first one)
                if (index > 0) {
                    const arrow = document.createElement('div');
                    arrow.className = 'evolution-arrow';
                    chainElement.appendChild(arrow);
                }
                
                // Create evolution node
                const node = document.createElement('div');
                node.className = `evolution-node ${evo.id === cardInfo.id ? 'current' : ''}`;
                node.style.backgroundImage = `url(${evo.img || `${ASSET_PATH}fallback.png`})`;
                
                // Add tooltip with name
                const tooltip = document.createElement('div');
                tooltip.className = 'evolution-tooltip';
                tooltip.textContent = evo.name;
                node.appendChild(tooltip);
                
                chainElement.appendChild(node);
            });
            
            chainContainer.appendChild(chainElement);
            textOverlay.appendChild(chainContainer);
        }
    }

    if (cardInfo.layout === 'Standard') {
        const blueprint = LAYOUT_BLUEPRINTS.standard;

        const nameBox = document.createElement('div');
        nameBox.className = 'card-name-box';
        nameBox.style.left = `${(blueprint.name.x / canvasWidth) * 100}%`;
        nameBox.style.top = `${(blueprint.name.y / canvasHeight) * 100}%`;
        nameBox.style.width = `${(blueprint.name.width / canvasWidth) * 100}%`;
        nameBox.style.height = `${(blueprint.name.height / canvasHeight) * 100}%`;
        nameBox.textContent = cardInfo.name;
        textOverlay.appendChild(nameBox);

        const loreBox = document.createElement('div');
        loreBox.className = 'card-lore-box';
        loreBox.style.left = `${(blueprint.lore.x / canvasWidth) * 100}%`;
        loreBox.style.top = `${(blueprint.lore.y / canvasHeight) * 100}%`;
        loreBox.style.width = `${(blueprint.lore.width / canvasWidth) * 100}%`;
        loreBox.style.height = `${(blueprint.lore.height / canvasHeight) * 100}%`;
        loreBox.textContent = cardInfo.lore || "A mysterious creature with unknown powers.";
        textOverlay.appendChild(loreBox);
    
    } else if (cardInfo.layout === 'Full-Art') {
        const blueprint = LAYOUT_BLUEPRINTS.fullArt;
        
        const nameBox = document.createElement('div');
        nameBox.className = 'card-name-box full-art-name-box'; 
        nameBox.style.left = `${(blueprint.name.x / canvasWidth) * 100}%`;
        nameBox.style.top = `${(blueprint.name.y / canvasHeight) * 100}%`;
        nameBox.style.width = `${(blueprint.name.width / canvasWidth) * 100}%`;
        nameBox.style.height = `${(blueprint.name.height / canvasHeight) * 100}%`;
        nameBox.textContent = cardInfo.name;
        textOverlay.appendChild(nameBox);
    }
    
    cardElement.appendChild(textOverlay);

    // Add holo effect for Holo Rare cards and all insert/chase cards
    if (cardInfo.rarity === 'Holo Rare' || cardInfo.rarity === 'Chase' || cardInfo.rarity === 'Alternate Art') {
        const holoOverlay = document.createElement('div');
        holoOverlay.className = 'card-holo-overlay full-card';
        cardElement.appendChild(holoOverlay);
    }

    const inspectOverlay = document.createElement('div');
    inspectOverlay.className = 'card-inspect-overlay';
    cardElement.appendChild(inspectOverlay);
    
    return cardElement;
}

function addCardToCollection(cardInfo) {
    if (!cardInfo) return;
    
    // Create a new instance of the card
    const cardInstance = {
        uid: generateUid(),
        condition: determineCardCondition(),
        sleeved: false,
        toploadered: false,
        acquired: { ...gameState.date },
        graded: null
    };
    
    // Add to collection
    if (gameState.player.collection[cardInfo.id]) {
        // Card already exists in collection, add new instance
        gameState.player.collection[cardInfo.id].instances.push(cardInstance);
    } else {
        // New card for collection
        gameState.player.collection[cardInfo.id] = {
            cardInfo: cardInfo,
            instances: [cardInstance]
        };
    }
    
    // Update stats
    updateStats('cardsAcquired', 1);
    
    // Check for achievements
    checkAchievements();
    
    // Log the acquisition
    logMessage(`Added ${cardInfo.name} (${cardInfo.rarity}) to your collection!`, "acquisition");
    
    return cardInstance;
}

function buyPack(setName) {
    const set = TCG_SETS[setName];
    if (!set) return;
    
    const packPrice = set.pack.price;
    
    if (gameState.player.cash < packPrice) {
        logMessage(`Not enough cash to buy a ${set.name} pack.`, "error");
        return;
    }
    
    // Deduct cash
    gameState.player.cash -= packPrice;
    updateStats('totalSpent', packPrice);
    
    // Add pack to inventory
    if (!gameState.player.sealedInventory[setName]) {
        gameState.player.sealedInventory[setName] = 0;
    }
    gameState.player.sealedInventory[setName]++;
    
    // Update UI
    calculateNetWorth();
    updateUI();
    
    // Log purchase
    logMessage(`Purchased a ${set.name} pack for $${packPrice.toFixed(2)}.`, "purchase");
    
    // Prompt to open pack
    if (confirm(`Pack added to your inventory. Would you like to open it now?`)) {
        gameState.ui.selectedPack = setName;
        renderMainView('pack-opening');
    }
    
    saveGame();
}

function buySupplies(supplyType) {
    let price = 0;
    let quantity = 0;
    
    switch(supplyType) {
        case 'sleeves':
            price = 5.00;
            quantity = 100;
            break;
        case 'toploaders':
            price = 3.00;
            quantity = 25;
            break;
        default:
            return;
    }
    
    if (gameState.player.cash < price) {
        logMessage(`Not enough cash to buy ${supplyType}.`, "error");
        return;
    }
    
    // Deduct cash
    gameState.player.cash -= price;
    updateStats('totalSpent', price);
    
    // Add supplies
    gameState.player.supplies[supplyType] += quantity;
    
    // Update UI
    calculateNetWorth();
    updateUI();
    
    // Log purchase
    logMessage(`Purchased ${quantity} ${supplyType} for $${price.toFixed(2)}.`, "purchase");
    
    saveGame();
}
function openPack(setName) {
    const set = TCG_SETS[setName];
    if (!set || !gameState.player.sealedInventory[setName] || gameState.player.sealedInventory[setName] <= 0) {
        return;
    }
    
    // Generate pack contents
    const packCards = generatePackCards(set);
    
    // Add cards to collection
    packCards.forEach(card => {
        addCardToCollection(card);
    });
    
    // Remove pack from inventory
    gameState.player.sealedInventory[setName]--;
    
    // Update stats
    updateStats('packsOpened', 1);
    
    // Check for achievements
    checkAchievements();
    
    // Save game
    saveGame();
    
    // Log pack opening
    logMessage(`Opened a ${set.name} pack and found ${packCards.length} cards!`, "pack");
    
    return packCards;
}

function sleeveCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid === instanceUid);
    if (!instance) return;
    
    if (instance.sleeved) {
        logMessage(`This card is already sleeved.`, "info");
        return;
    }
    
    if (gameState.player.supplies.sleeves <= 0) {
        logMessage(`You don't have any sleeves. Visit the store to buy more.`, "error");
        return;
    }
    
    // Apply sleeve
    instance.sleeved = true;
    gameState.player.supplies.sleeves--;
    
    // Update UI
    updateUI();
    renderMainView('card-management');
    
    // Log action
    logMessage(`Sleeved ${cardData.cardInfo.name}.`, "action");
    
    saveGame();
}

function unsleeveCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid === instanceUid);
    if (!instance) return;
    
    if (!instance.sleeved) {
        logMessage(`This card is not sleeved.`, "info");
        return;
    }
    
    // Remove sleeve
    instance.sleeved = false;
    gameState.player.supplies.sleeves++;
    
    // Update UI
    updateUI();
    renderMainView('card-management');
    
    // Log action
    logMessage(`Removed sleeve from ${cardData.cardInfo.name}.`, "action");
    
    saveGame();
}

function toploaderCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid === instanceUid);
    if (!instance) return;
    
    if (instance.toploadered) {
        logMessage(`This card is already in a toploader.`, "info");
        return;
    }
    
    if (gameState.player.supplies.toploaders <= 0) {
        logMessage(`You don't have any toploaders. Visit the store to buy more.`, "error");
        return;
    }
    
    // Apply toploader
    instance.toploadered = true;
    gameState.player.supplies.toploaders--;
    
    // Update UI
    updateUI();
    renderMainView('card-management');
    
    // Log action
    logMessage(`Added ${cardData.cardInfo.name} to a toploader.`, "action");
    
    saveGame();
}

function removeToploader(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid === instanceUid);
    if (!instance) return;
    
    if (!instance.toploadered) {
        logMessage(`This card is not in a toploader.`, "info");
        return;
    }
    
    // Remove toploader
    instance.toploadered = false;
    gameState.player.supplies.toploaders++;
    
    // Update UI
    updateUI();
    renderMainView('card-management');
    
    // Log action
    logMessage(`Removed toploader from ${cardData.cardInfo.name}.`, "action");
    
    saveGame();
}

function sellCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instanceIndex = cardData.instances.findIndex(i => i.uid === instanceUid);
    if (instanceIndex === -1) return;
    
    const instance = cardData.instances[instanceIndex];
    const cardValue = getCardValue(cardData.cardInfo, instance);
    
    // Confirm sale
    if (!confirm(`Are you sure you want to sell ${cardData.cardInfo.name} for $${cardValue.toFixed(2)}?`)) {
        return;
    }
    
    // Add cash
    gameState.player.cash += cardValue;
    updateStats('totalEarned', cardValue);
    updateStats('cardsSold', 1);
    
    // Return supplies if card was protected
    if (instance.sleeved) {
        gameState.player.supplies.sleeves++;
    }
    if (instance.toploadered) {
        gameState.player.supplies.toploaders++;
    }
    
    // Remove card instance
    cardData.instances.splice(instanceIndex, 1);
    
    // If no instances left, remove card from collection
    if (cardData.instances.length === 0) {
        delete gameState.player.collection[cardId];
    }
    
    // Update UI
    calculateNetWorth();
    updateUI();
    renderMainView('collection');
    
    // Log sale
    logMessage(`Sold ${cardData.cardInfo.name} for $${cardValue.toFixed(2)}.`, "sale");
    
    saveGame();

    function advanceDay() {
    // Increment day
    gameState.date.day++;
    
    // Check for year change (assuming 365 days per year)
    if (gameState.date.day > 365) {
        gameState.date.day = 1;
        gameState.date.year++;
    }
    
    // Update market
    const marketEvent = updateMarket();
    if (marketEvent) {
        logMessage(`Market Event: ${marketEvent.name} - ${marketEvent.effect}`, "market");
        updateStats('marketEvents', 1);
    }
    
    // Clean up expired market events
    cleanupExpiredMarketEvents();
    
    // Update stats
    updateStats('daysPlayed', 1);
    
    // Check for achievements
    checkAchievements();
    
    // Update UI
    updateUI();
    
    // Save game
    saveGame();
    
    // Log day advancement
    logMessage(`Advanced to Day ${gameState.date.day}, Year ${gameState.date.year}.`, "time");
}

function openPack(setName) {
    const set = TCG_SETS[setName];
    if (!set || !gameState.player.sealedInventory[setName] || gameState.player.sealedInventory[setName] <= 0) {
        return;
    }
    
    // Generate pack contents
    const packCards = generatePackCards(set);
    
    // Add cards to collection
    packCards.forEach(card => {
        addCardToCollection(card);
    });
    
    // Remove pack from inventory
    gameState.player.sealedInventory[setName]--;
    
    // Update stats
    updateStats('packsOpened', 1);
    
    // Check for achievements
    checkAchievements();
    
    // Save game
    saveGame();
    
    // Log pack opening
    logMessage(`Opened a ${set.name} pack and found ${packCards.length} cards!`, "pack");
    
    return packCards;
}

function sleeveCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid === instanceUid);
    if (!instance) return;
    
    if (instance.sleeved) {
        logMessage(`This card is already sleeved.`, "info");
        return;
    }
    
    if (gameState.player.supplies.sleeves <= 0) {
        logMessage(`You don't have any sleeves. Visit the store to buy more.`, "error");
        return;
    }
    
    // Apply sleeve
    instance.sleeved = true;
    gameState.player.supplies.sleeves--;
    
    // Update UI
    updateUI();
    renderMainView('card-management');
    
    // Log action
    logMessage(`Sleeved ${cardData.cardInfo.name}.`, "action");
    
    saveGame();
}

function unsleeveCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid === instanceUid);
    if (!instance) return;
    
    if (!instance.sleeved) {
        logMessage(`This card is not sleeved.`, "info");
        return;
    }
    
    // Remove sleeve
    instance.sleeved = false;
    gameState.player.supplies.sleeves++;
    
    // Update UI
    updateUI();
    renderMainView('card-management');
    
    // Log action
    logMessage(`Removed sleeve from ${cardData.cardInfo.name}.`, "action");
    
    saveGame();
}

function toploaderCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid === instanceUid);
    if (!instance) return;
    
    if (instance.toploadered) {
        logMessage(`This card is already in a toploader.`, "info");
        return;
    }
    
    if (gameState.player.supplies.toploaders <= 0) {
        logMessage(`You don't have any toploaders. Visit the store to buy more.`, "error");
        return;
    }
    
    // Apply toploader
    instance.toploadered = true;
    gameState.player.supplies.toploaders--;
    
    // Update UI
    updateUI();
    renderMainView('card-management');
    
    // Log action
    logMessage(`Added ${cardData.cardInfo.name} to a toploader.`, "action");
    
    saveGame();
}

function removeToploader(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid === instanceUid);
    if (!instance) return;
    
    if (!instance.toploadered) {
        logMessage(`This card is not in a toploader.`, "info");
        return;
    }
    
    // Remove toploader
    instance.toploadered = false;
    gameState.player.supplies.toploaders++;
    
    // Update UI
    updateUI();
    renderMainView('card-management');
    
    // Log action
    logMessage(`Removed toploader from ${cardData.cardInfo.name}.`, "action");
    
    saveGame();
}

function sellCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instanceIndex = cardData.instances.findIndex(i => i.uid === instanceUid);
    if (instanceIndex === -1) return;
    
    const instance = cardData.instances[instanceIndex];
    const cardValue = getCardValue(cardData.cardInfo, instance);
    
    // Confirm sale
    if (!confirm(`Are you sure you want to sell ${cardData.cardInfo.name} for $${cardValue.toFixed(2)}?`)) {
        return;
    }
    
    // Add cash
    gameState.player.cash += cardValue;
    updateStats('totalEarned', cardValue);
    updateStats('cardsSold', 1);
    
    // Return supplies if card was protected
    if (instance.sleeved) {
        gameState.player.supplies.sleeves++;
    }
    if (instance.toploadered) {
        gameState.player.supplies.toploaders++;
    }
    
    // Remove card instance
    cardData.instances.splice(instanceIndex, 1);
    
    // If no instances left, remove card from collection
    if (cardData.instances.length === 0) {
        delete gameState.player.collection[cardId];
    }
    
    // Update UI
    calculateNetWorth();
    updateUI();
    renderMainView('collection');
    
    // Log sale
    logMessage(`Sold ${cardData.cardInfo.name} for $${cardValue.toFixed(2)}.`, "sale");
    
    saveGame();
}

function advanceDay() {
    // Increment day
    gameState.date.day++;
    
    // Check for year change (assuming 365 days per year)
    if (gameState.date.day > 365) {
        gameState.date.day = 1;
        gameState.date.year++;
    }
    
    // Update market
    const marketEvent = updateMarket();
    if (marketEvent) {
        logMessage(`Market Event: ${marketEvent.name} - ${marketEvent.effect}`, "market");
        updateStats('marketEvents', 1);
    }
    
    // Clean up expired market events
    cleanupExpiredMarketEvents();
    
    // Update stats
    updateStats('daysPlayed', 1);
    
    // Check for achievements
    checkAchievements();
    
    // Update UI
    updateUI();
    
    // Save game
    saveGame();
    
    // Log day advancement
    logMessage(`Advanced to Day ${gameState.date.day}, Year ${gameState.date.year}.`, "time");
}

function cleanupExpiredMarketEvents() {
    gameState.market.events = gameState.market.events.filter(event => {
        return event.year > gameState.date.year || 
               (event.year === gameState.date.year && event.expires >= gameState.date.day);
    });
}

function checkAchievements() {
    Object.values(ACHIEVEMENTS).forEach(achievement => {
        if (!achievement.unlocked && achievement.requirement(gameState)) {
            // Unlock achievement
            achievement.unlocked = true;
            gameState.achievements[achievement.id] = {
                unlocked: true,
                date: { ...gameState.date }
            };
            
            // Apply reward
            if (achievement.reward) {
                if (achievement.reward.cash) {
                    gameState.player.cash += achievement.reward.cash;
                    logMessage(`Achievement reward: $${achievement.reward.cash} added to your account.`, "achievement");
                }
            }
            
            // Update stats
            updateStats('achievementsUnlocked', 1);
            
            // Log achievement
            logMessage(`Achievement Unlocked: ${achievement.name} - ${achievement.description}`, "achievement");
        }
    });
}

function updateUI() {
    // Update player stats
    DOM.playerCash.textContent = `$${gameState.player.cash.toFixed(2)}`;
    DOM.playerNetWorth.textContent = `$${gameState.player.netWorth.toFixed(2)}`;
    
    if (DOM.playerSleeves) {
        DOM.playerSleeves.textContent = gameState.player.supplies.sleeves;
    }
    
    if (DOM.playerToploaders) {
        DOM.playerToploaders.textContent = gameState.player.supplies.toploaders;
    }
    
    // Update date
    DOM.gameDate.textContent = `Day ${gameState.date.day}, Year ${gameState.date.year}`;
}

function logMessage(message, type = "info") {
    const logEntry = {
        message,
        type,
        timestamp: new Date().toISOString()
    };
    
    // Add to game log (limit to 100 entries)
    if (!gameState.log) gameState.log = [];
    gameState.log.unshift(logEntry);
    if (gameState.log.length > 100) gameState.log.pop();
    
    // Update log feed if it exists
    if (DOM.logFeed) {
        const logItem = document.createElement('div');
        logItem.className = `log-item log-${type} mb-2 text-sm`;
        logItem.innerHTML = `<span class="text-gray-400">[Day ${gameState.date.day}]</span> ${message}`;
        
        DOM.logFeed.prepend(logItem);
        
        // Limit displayed log items
        while (DOM.logFeed.children.length > 10) {
            DOM.logFeed.removeChild(DOM.logFeed.lastChild);
        }
    }
    
    // Console log for debugging
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function saveGame() {
    try {
        localStorage.setItem('cardboardCapitalistSave', JSON.stringify(gameState));
        return true;
    } catch (error) {
        console.error('Error saving game:', error);
        return false;
    }
}

function loadGame() {
    try {
        const savedGame = localStorage.getItem('cardboardCapitalistSave');
        if (savedGame) {
            const parsedSave = JSON.parse(savedGame);
            updateGameState(parsedSave);
            return true;
        }
    } catch (error) {
        console.error('Error loading game:', error);
    }
    return false;
}

function resetGame() {
    localStorage.removeItem('cardboardCapitalistSave');
    location.reload();
}

function exportSaveData() {
    const saveData = JSON.stringify(gameState);
    const blob = new Blob([saveData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardboard-capitalist-save-${gameState.date.year}-${gameState.date.day}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateUid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function weightedRandomChoice(weights) {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [item, weight] of Object.entries(weights)) {
        random -= weight;
        if (random <= 0) {
            return item;
        }
    }
    
    // Fallback to first item
    return Object.keys(weights)[0];
}

function startTutorial() {
    tutorialActive = true;
    currentTutorialStep = 0;
    
    const tutorialSteps = [
        {
            title: "Welcome to Cardboard Capitalist!",
            content: "This tutorial will guide you through the basics of the game. Click 'Next' to continue.",
            target: null
        },
        {
            title: "Your Collection",
            content: "This is your card collection. You can view, manage, and sell your cards here.",
            target: "#collection-grid"
        },
        {
            title: "Navigation",
            content: "Use these buttons to navigate between different sections of the game.",
            target: "#main-nav"
        },
        {
            title: "Store",
            content: "Visit the store to buy packs and supplies for your cards.",
            target: "[data-view='store']"
        },
        {
            title: "Next Day",
            content: "Click this button to advance to the next day. Market conditions may change each day.",
            target: "#next-day-btn"
        },
        {
            title: "Card Management",
            content: "Click on any card to inspect it, add protection, or sell it.",
            target: ".card-container"
        },
        {
            title: "That's it!",
            content: "You're now ready to start your trading card journey. Good luck!",
            target: null
        }
    ];
    
    showTutorialStep(tutorialSteps[currentTutorialStep], tutorialSteps);
}

function showTutorialStep(step, allSteps) {
    // Create or get tutorial overlay
    let tutorialOverlay = document.getElementById('tutorial-overlay');
    if (!tutorialOverlay) {
        tutorialOverlay = document.createElement('div');
        tutorialOverlay.id = 'tutorial-overlay';
        tutorialOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        document.body.appendChild(tutorialOverlay);
    }
    
    // Create tutorial modal
    const tutorialModal = document.createElement('div');
    tutorialModal.className = 'bg-gray-800 p-6 rounded-lg max-w-md mx-auto';
    
    tutorialModal.innerHTML = `
    <h3 class="text-xl font-bold text-white mb-4">${step.title}</h3>
    <p class="text-gray-300 mb-6">${step.content}</p>
    <div class="flex justify-between">
        <button id="tutorial-prev" class="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded ${currentTutorialStep === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
            Previous
        </button>
        <button id="tutorial-next" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
            ${currentTutorialStep === allSteps.length - 1 ? 'Finish' : 'Next'}
        </button>
    </div>
    `;
    
    tutorialOverlay.innerHTML = '';
    tutorialOverlay.appendChild(tutorialModal);
    
    // Highlight target element if specified
    if (step.target) {
        const targetElement = document.querySelector(step.target);
        if (targetElement) {
            targetElement.classList.add('tutorial-highlight');
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // Add event listeners
    document.getElementById('tutorial-prev').addEventListener('click', () => {
        if (currentTutorialStep > 0) {
            // Remove highlight from current target
            if (step.target) {
                const targetElement = document.querySelector(step.target);
                if (targetElement) targetElement.classList.remove('tutorial-highlight');
            }
            
            currentTutorialStep--;
            showTutorialStep(allSteps[currentTutorialStep], allSteps);
        }
    });
    
    document.getElementById('tutorial-next').addEventListener('click', () => {
        // Remove highlight from current target
        if (step.target) {
            const targetElement = document.querySelector(step.target);
            if (targetElement) targetElement.classList.remove('tutorial-highlight');
        }
        
        if (currentTutorialStep < allSteps.length - 1) {
            currentTutorialStep++;
            showTutorialStep(allSteps[currentTutorialStep], allSteps);
        } else {
            // End tutorial
            endTutorial();
        }
    });
}

function endTutorial() {
    tutorialActive = false;
    
    // Remove tutorial overlay
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    if (tutorialOverlay) {
        tutorialOverlay.remove();
    }
    
    // Mark tutorial as completed
    if (!gameState.settings) gameState.settings = {};
    gameState.settings.tutorialCompleted = true;
    
    saveGame();
}

// Initialize the game when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// Emergency fix for event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log("Emergency event listener fix running");
    
    // Fix navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            console.log("Navigation clicked:", view);
            renderMainView(view);
        });
    });
    
    // Fix next day button
    const nextDayBtn = document.getElementById('next-day-btn');
    if (nextDayBtn) {
        nextDayBtn.addEventListener('click', function() {
            console.log("Next day clicked");
            advanceDay();
        });
    }
    
    // Fix card inspection
    document.addEventListener('click', function(e) {
        if (e.target.closest('.card-inspect-overlay')) {
            const cardElement = e.target.closest('.card-container');
            if (cardElement) {
                const cardId = cardElement.dataset.cardId;
                const instanceUid = cardElement.dataset.instanceUid;
                
                if (cardId) {
                    console.log("Card clicked:", cardId);
                    gameState.ui.selectedCard = { cardId, instanceUid };
                    renderMainView('card-management');
                }
            }
        }
    });
});
