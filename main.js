// IMPORTS - These should be at the very top
import { TCG_SETS, ASSETS, LAYOUT_BLUEPRINTS, getAllDoodlemonForGame, loadCustomDoodlemon } from './config.js';
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
                    <div class="revealed-card-thumbnail">
                        <img src="${card.img}"
                            alt="${card.name}"
                            class="w-12 h-16 object-contain rounded border border-gray-600"
                            onerror="this.style.display='none'">
                                                    <p class="text-xs text-gray-400 mt-1 truncate">${card.name}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `;
    
    // Add click handler for card stack using setTimeout to ensure DOM element exists
    setTimeout(() => {
        const cardStack = document.getElementById('card-stack');
        if (cardStack) {
            cardStack.addEventListener('click', () => {
                revealNextCard(container, set, state, currentCard, setName);
            });
        }
    }, 0);
}

// Reveal individual card with animation and rarity effects
function revealNextCard(container, set, state, card, setName) {
    const revealArea = document.getElementById('card-reveal-area');
    
    // Animate card moving from stack to center
    revealArea.innerHTML = `
    <div class="revealing-card-container">
        <div class="card-flip-animation">
            <!-- Front (card back) -->
            <div class="card-face card-back-face">
                <img src="${ASSETS.cardBack}"
                    alt="Card Back"
                    class="w-32 h-44 object-contain">
            </div>
            
            <!-- Back (actual card) -->
            <div class="card-face card-front-face">
                <img src="${card.img}"
                    alt="${card.name}"
                    class="w-32 h-44 object-contain"
                    onerror="this.style.display='none'">
            </div>
        </div>
        
        <!-- Card Info -->
        <div class="card-info mt-4">
            <h3 class="text-xl font-bold text-white">${card.name}</h3>
            <p class="text-sm ${getRarityColorClass(card.rarity)}">${card.rarity}</p>
        </div>
    </div>
    `;
    
    // Play card flip SFX (stub)
    playCardFlipSFX();
    
    // Trigger rarity-based effects
    triggerRarityEffects(card);
    
    // Add card to revealed cards
    state.revealedCards.push(card);
    state.currentCardIndex++;
    
    // Add card to collection (using existing logic)
    addCardToCollection(card);
    
    // Auto-advance after showing card for a moment
    setTimeout(() => {
        renderPackStage3(container, set, state, setName);
    }, 2500); // Show each card for 2.5 seconds
}

// Stage 4: Final Summary View - Display all cards, continue button
function renderPackStage4(container, set, state, setName) {
    container.innerHTML = `
    <div class="pack-summary-scene text-center">
        <h2 class="text-3xl font-bold text-white mb-8">Pack Opening Complete!</h2>
        
        <!-- All Cards Display -->
        <div class="pack-results mb-8">
            <h3 class="text-xl font-bold text-white mb-6">Your ${set.name} Pack Contents:</h3>
            <div class="cards-fan-display grid grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 max-w-7xl mx-auto">
                ${state.cards.map(card => `
                    <div class="pack-card-result transform transition-transform duration-200 hover:scale-110 hover:z-10 relative">
                        <img src="${card.img}"
                            alt="${card.name}"
                            class="w-full h-auto object-contain rounded-lg shadow-lg"
                            onerror="this.style.display='none'">
                        <div class="card-overlay absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 rounded-lg transition-all duration-200">
                            <div class="card-info-popup hidden absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white p-2 rounded text-xs whitespace-nowrap z-20">
                                <p class="font-bold">${card.name}</p>
                                <p class="${getRarityColorClass(card.rarity)}">${card.rarity}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Pack Statistics -->
        <div class="pack-stats mb-8 bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
            <h4 class="text-lg font-bold text-white mb-4">Pack Breakdown:</h4>
            <div class="stats-grid grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                ${getPackBreakdown(state.cards)}
            </div>
        </div>
        
        <!-- Continue Button -->
        <button id="continue-pack-opening"
            class="continue-btn bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg transform transition-all duration-200 hover:scale-105">
            <span class="flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
                Continue to Collection
            </span>
        </button>
    </div>
    `;
    
    // Add continue button handler using setTimeout to ensure DOM element exists
    setTimeout(() => {
        const continueBtn = document.getElementById('continue-pack-opening');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                // Animate cards off screen (stub)
                animateCardsOff();
                
                // Update pack inventory
                gameState.player.sealedInventory[setName]--;
                
                // Log pack opening completion
                logMessage(`Opened a ${set.name} pack! Got ${state.cards.length} cards.`, "success");
                state.cards.forEach(card => logMessage(`• ${card.name} (${card.rarity})`, "info"));
                
                // Update stats and UI
                updateStats('packsOpened', 1);
                updateStats('cardsAcquired', state.cards.length);
                calculateNetWorth();
                updateUI();
                
                // Return to collection
                renderMainView('collection');
            });
        }
    }, 0);
}

// Helper Functions for Pack Opening Animations
function generatePackCards(set) {
    // Use existing pack generation logic
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

function getRarityColorClass(rarity) {
    const rarityColors = {
        'Common': 'text-gray-400',
        'Uncommon': 'text-green-400',
        'Holo Rare': 'text-purple-400',
        'Alternate Art': 'text-yellow-400',
        'Chase': 'text-red-400'
    };
    
    return rarityColors[rarity] || 'text-gray-400';
}

function getPackBreakdown(cards) {
    const breakdown = {};
    
    cards.forEach(card => {
        breakdown[card.rarity] = (breakdown[card.rarity] || 0) + 1;
    });
    
    return Object.entries(breakdown).map(([rarity, count]) => `
        <div class="stat-item">
            <div class="stat-value text-xl font-bold ${getRarityColorClass(rarity)}">${count}</div>
            <div class="stat-label text-sm text-gray-400">${rarity}</div>
        </div>
    `).join('');
}

function triggerRarityEffects(card) {
    // TODO: Replace with actual animation/effect implementations
    switch(card.rarity) {
        case 'Holo Rare':
            triggerTier1Effect(); // Shimmer/confetti, quick burst, positive SFX
            break;
        case 'Chase':
        case 'Alternate Art':
            triggerTier2Effect(); // Flash, beams, fireworks, major SFX
            break;
        default:
            // No effect for Common/Uncommon
            break;
    }
}

// Stub Functions for Animation and Sound Effects
// TODO: Replace these with actual implementations
function playPackTearSFX() {
    console.log('🔊 Playing pack tear sound effect');
    // TODO: Implement actual sound effect
}

function playCardFlipSFX() {
    console.log('🔊 Playing card flip sound effect');
    // TODO: Implement actual sound effect
}

function triggerTier1Effect() {
    console.log('✨ Triggering Tier 1 effect (HoloRare): shimmer/confetti, quick burst, positive SFX');
    // Create confetti/shimmer effect
    createConfettiEffect();
    // Add screen flash effect
    createFlashEffect('holo');
    // Add card reveal area sparkle effects
    addSparkleToRevealArea();
}

function triggerTier2Effect() {
    console.log('🎆 Triggering Tier 2 effect (Chase/AlternateArt): flash, beams, fireworks, major SFX');
    // Create intense fireworks effect
    createFireworksEffect();
    // Add dramatic screen flash
    createFlashEffect('chase');
    // Add beam effects radiating from card
    createBeamEffects();
    // Add extra celebration particles
    createCelebrationExplosion();
}

// Create confetti particles effect
function createConfettiEffect() {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-particle';
        confetti.style.cssText = `
            position: fixed;
            width: 6px;
            height: 6px;
            background-color: ${colors[Math.floor(Math.random() * colors.length)]};
            top: ${Math.random() * 100}vh;
            left: ${Math.random() * 100}vw;
            z-index: 9999;
            border-radius: 50%;
            animation: confettiFall ${2 + Math.random() * 2}s ease-out forwards;
            transform: rotate(${Math.random() * 360}deg);
        `;
        
        document.body.appendChild(confetti);
        
        // Remove after animation
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 4000);
    }
}

// Create fireworks effect for chase cards
function createFireworksEffect() {
    const colors = ['#FF0080', '#FFD700', '#00FF80', '#8040FF', '#FF4040'];
    
    for (let burst = 0; burst < 3; burst++) {
        setTimeout(() => {
            const centerX = 50 + (Math.random() - 0.5) * 40; // Spread around center
            const centerY = 40 + (Math.random() - 0.5) * 30;
            
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.className = 'firework-particle';
                
                const angle = (i / 20) * Math.PI * 2;
                const velocity = 30 + Math.random() * 20;
                const endX = centerX + Math.cos(angle) * velocity;
                const endY = centerY + Math.sin(angle) * velocity;
                
                particle.style.cssText = `
                    position: fixed;
                    width: 3px;
                    height: 3px;
                    background-color: ${colors[Math.floor(Math.random() * colors.length)]};
                    top: ${centerY}vh;
                    left: ${centerX}vw;
                    z-index: 9999;
                    border-radius: 50%;
                    box-shadow: 0 0 6px currentColor;
                    animation: fireworkBurst 1.5s ease-out forwards;
                    --endX: ${endX}vw;
                    --endY: ${endY}vh;
                `;
                
                document.body.appendChild(particle);
                
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 1500);
            }
        }, burst * 300);
    }
}

// Create screen flash effect
function createFlashEffect(type) {
    const flash = document.createElement('div');
    flash.className = `screen-flash ${type}`;
    
    const flashColor = type === 'chase' ? '#FFD700' : '#E6E6FA';
    const duration = type === 'chase' ? '0.6s' : '0.4s';
    
    flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: ${flashColor};
        opacity: 0;
        z-index: 9998;
        pointer-events: none;
        animation: flashEffect ${duration} ease-out;
    `;
    
    document.body.appendChild(flash);
    
    setTimeout(() => {
        if (flash.parentNode) {
            flash.parentNode.removeChild(flash);
        }
    }, 600);
}

// Add sparkle effect to reveal area
function addSparkleToRevealArea() {
    const revealArea = document.getElementById('card-reveal-area');
    if (!revealArea) return;
    
    for (let i = 0; i < 15; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background-color: #FFD700;
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            z-index: 100;
            animation: sparkleEffect 1.5s ease-out forwards;
            box-shadow: 0 0 8px #FFD700;
        `;
        
        revealArea.style.position = 'relative';
        revealArea.appendChild(sparkle);
        
        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.parentNode.removeChild(sparkle);
            }
        }, 1500);
    }
}

// Create beam effects radiating from card
function createBeamEffects() {
    const revealArea = document.getElementById('card-reveal-area');
    if (!revealArea) return;
    
    for (let i = 0; i < 8; i++) {
        const beam = document.createElement('div');
        beam.className = 'beam-effect';
        const angle = (i / 8) * 360;
        
        beam.style.cssText = `
            position: absolute;
            width: 3px;
            height: 100px;
            background: linear-gradient(to bottom, #FFD700, transparent);
            top: 50%;
            left: 50%;
            transform-origin: 0 0;
            transform: translate(-50%, -50%) rotate(${angle}deg);
            z-index: 99;
            animation: beamPulse 1s ease-out forwards;
            box-shadow: 0 0 10px #FFD700;
        `;
        
        revealArea.style.position = 'relative';
        revealArea.appendChild(beam);
        
        setTimeout(() => {
            if (beam.parentNode) {
                beam.parentNode.removeChild(beam);
            }
        }, 1000);
    }
}

// Create celebration explosion for chase cards
function createCelebrationExplosion() {
    const colors = ['#FF1493', '#00CED1', '#FFD700', '#FF69B4', '#32CD32'];
    
    for (let i = 0; i < 100; i++) {
        const particle = document.createElement('div');
        particle.className = 'celebration-particle';
        const size = 2 + Math.random() * 4;
        
        particle.style.cssText = `
            position: fixed;
            width: ${size}px;
            height: ${size}px;
            background-color: ${colors[Math.floor(Math.random() * colors.length)]};
            top: 50vh;
            left: 50vw;
            z-index: 9999;
            border-radius: 50%;
            animation: explosionParticle ${1 + Math.random()}s ease-out forwards;
            --randomX: ${(Math.random() - 0.5) * 200}vw;
            --randomY: ${(Math.random() - 0.5) * 200}vh;
        `;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 2000);
    }
}

function animateCardsOff() {
    console.log('🎬 Animating cards off screen');
    // TODO: Implement card exit animations
}

function renderCardManagementView(container, cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid == instanceUid);
    if (!instance) return;
    
    const cardInfo = cardData.cardInfo;
    
    const managementDiv = document.createElement('div');
    managementDiv.className = 'flex flex-col md:flex-row gap-6';
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'w-full md:w-1/3';
    previewDiv.appendChild(buildCardElement(cardInfo, instance));
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'w-full md:w-2/3 space-y-4';
    
    actionsDiv.innerHTML = `
        <h3 class="text-xl font-bold text-white">${cardInfo.name}</h3>
        <div class="bg-gray-800 p-4 rounded-lg">
            <p class="text-gray-300 mb-2">Condition: <span class="font-bold">${instance.condition}</span></p>
            <p class="text-gray-300 mb-2">Protection:
                <span class="font-bold">${instance.sleeved ? 'Sleeved' : 'Unsleeved'}</span>,
                <span class="font-bold">${instance.toploadered ? 'In Toploader' : 'No Toploader'}</span>
            </p>
            <p class="text-gray-300">Estimated Value: <span class="font-bold text-green-400">$${getCardValue(cardInfo, instance).toFixed(2)}</span></p>
        </div>
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="font-bold text-white mb-2">Protection Options</h4>
            <div class="flex gap-2 mb-2">
                ${!instance.sleeved ? `<button class="sleeve-card-btn bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm" data-card-id="${cardId}" data-instance-uid="${instanceUid}">Add Sleeve</button>` : `<button class="unsleeve-card-btn bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-sm" data-card-id="${cardId}" data-instance-uid="${instanceUid}">Remove Sleeve</button>`}
                ${!instance.toploadered ? `<button class="toploader-card-btn bg-purple-600 hover:bg-purple-700 text-white py-1 px-3 rounded text-sm" data-card-id="${cardId}" data-instance-uid="${instanceUid}">Add Toploader</button>` : `<button class="remove-toploader-btn bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-sm" data-card-id="${cardId}" data-instance-uid="${instanceUid}">Remove Toploader</button>`}
            </div>
            <p class="text-xs text-gray-400">Protection improves condition stability and prevents damage.</p>
        </div>
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="font-bold text-white mb-2">Market Options</h4>
            <button class="sell-card-btn bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded" data-card-id="${cardId}" data-instance-uid="${instanceUid}">Sell Card</button>
            <p class="text-xs text-gray-400 mt-1">Sell this card for its current market value.</p>
        </div>
    `;
    
    managementDiv.appendChild(previewDiv);
    managementDiv.appendChild(actionsDiv);
    container.appendChild(managementDiv);
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

function renderAchievementsView(container) {
    const achievementsDiv = document.createElement('div');
    achievementsDiv.className = 'space-y-4';
    
    const achievementsList = Object.values(ACHIEVEMENTS);
    const unlockedCount = achievementsList.filter(a => a.unlocked).length;
    
    achievementsDiv.innerHTML = `
        <div class="bg-gray-800 p-4 rounded-lg mb-6">
            <h3 class="text-lg font-bold text-white mb-2">Progress</h3>
            <p class="text-gray-300">Unlocked: ${unlockedCount} / ${achievementsList.length}</p>
            <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div class="bg-blue-600 h-2 rounded-full" style="width: ${(unlockedCount / achievementsList.length) * 100}%"></div>
            </div>
        </div>
    `;
    
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    
    achievementsList.forEach(achievement => {
        const achievementCard = document.createElement('div');
        achievementCard.className = `bg-gray-800 p-4 rounded-lg border-l-4 ${achievement.unlocked ? 'border-green-500' : 'border-gray-600'}`;
        
        achievementCard.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="text-2xl">${achievement.unlocked ? '🏆' : '🔒'}</div>
                <div class="flex-1">
                    <h4 class="font-bold text-white mb-1">${achievement.name}</h4>
                    <p class="text-gray-300 text-sm mb-2">${achievement.description}</p>
                    ${achievement.reward?.cash ? `<p class="text-green-400 text-xs">Reward: $${achievement.reward.cash}</p>` : ''}
                    ${achievement.unlocked ? '<p class="text-green-500 text-xs font-bold">UNLOCKED</p>' : '<p class="text-gray-500 text-xs">Locked</p>'}
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
    const rarities = ['Common', 'Uncommon', 'Holo Rare', 'Alternate Art', 'Chase'];
    const rarityCount = {};
    
    // Count cards by rarity
    Object.values(gameState.player.collection).forEach(cardData => {
        const rarity = cardData.cardInfo.rarity;
        rarityCount[rarity] = (rarityCount[rarity] || 0) + cardData.instances.length;
    });
    
    // Calculate total cards
    const totalCards = Object.values(rarityCount).reduce((sum, count) => sum + count, 0);
    
    // Generate HTML for each rarity bar
    return rarities.map(rarity => {
        const count = rarityCount[rarity] || 0;
        const percentage = totalCards > 0 ? (count / totalCards) * 100 : 0;
        
        // Determine color based on rarity
        let barColor;
        switch(rarity) {
            case 'Common': barColor = 'bg-gray-400'; break;
            case 'Uncommon': barColor = 'bg-green-500'; break;
            case 'Holo Rare': barColor = 'bg-purple-500'; break;
            case 'Alternate Art': barColor = 'bg-yellow-500'; break;
            case 'Chase': barColor = 'bg-red-500'; break;
            default: barColor = 'bg-blue-500';
        }
        
        return `
            <div>
                <div class="flex justify-between mb-1">
                    <span class="text-sm text-white">${rarity}</span>
                    <span class="text-sm text-gray-400">${count} (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2.5">
                    <div class="${barColor} h-2.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderSettingsView(container) {
    const settingsDiv = document.createElement('div');
    settingsDiv.className = 'space-y-6';
    
    settingsDiv.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg">
            <h3 class="text-xl font-bold mb-4 text-white">Game Settings</h3>
            <div class="space-y-4">
                <div class="flex items-center">
                    <input type="checkbox" id="tutorial-toggle" class="mr-2" ${gameState.settings?.tutorialCompleted ? '' : 'checked'}>
                    <label for="tutorial-toggle" class="text-white">Show Tutorial</label>
                </div>
                <div class="flex items-center">
                    <input type="checkbox" id="animations-toggle" class="mr-2" ${gameState.settings?.disableAnimations ? '' : 'checked'}>
                    <label for="animations-toggle" class="text-white">Enable Animations</label>
                </div>
                <div class="flex items-center">
                    <input type="checkbox" id="sound-toggle" class="mr-2" ${gameState.settings?.disableSound ? '' : 'checked'}>
                    <label for="sound-toggle" class="text-white">Enable Sound Effects</label>
                </div>
            </div>
        </div>
        
        <div class="bg-gray-800 p-6 rounded-lg">
            <h3 class="text-xl font-bold mb-4 text-white">Save & Reset</h3>
            <div class="space-y-4">
                <div>
                    <button id="save-game-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2">
                        Save Game
                    </button>
                    <button id="export-save-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Export Save Data
                    </button>
                </div>
                <div>
                    <button id="reset-game-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                        Reset Game
                    </button>
                    <p class="text-xs text-gray-400 mt-1">Warning: This will delete all your progress!</p>
                </div>
            </div>
        </div>
        
        <div class="bg-gray-800 p-6 rounded-lg">
            <h3 class="text-xl font-bold mb-4 text-white">About</h3>
            <p class="text-gray-300 mb-2">Cardboard Capitalist v0.9.0</p>
            <p class="text-gray-400 text-sm">A trading card collection simulator.</p>
            <p class="text-gray-400 text-sm mt-4">Created by Matt Flexx</p>
        </div>
    `;
    
    container.appendChild(settingsDiv);
    
    // Add event listeners
    document.getElementById('save-game-btn').addEventListener('click', () => {
        saveGame();
        logMessage("Game saved successfully!", "success");
    });
    
    document.getElementById('export-save-btn').addEventListener('click', () => {
        exportSaveData();
    });
    
    document.getElementById('reset-game-btn').addEventListener('click', () => {
        if (confirm("Are you sure you want to reset your game? All progress will be lost!")) {
            resetGame();
            logMessage("Game reset successfully. Starting fresh!", "system");
            renderMainView('collection');
        }
    });
    
    document.getElementById('tutorial-toggle').addEventListener('change', (e) => {
        if (!gameState.settings) gameState.settings = {};
        gameState.settings.tutorialCompleted = !e.target.checked;
        saveGame();
    });
    
    document.getElementById('animations-toggle').addEventListener('change', (e) => {
        if (!gameState.settings) gameState.settings = {};
        gameState.settings.disableAnimations = !e.target.checked;
        saveGame();
    });
    
    document.getElementById('sound-toggle').addEventListener('change', (e) => {
        if (!gameState.settings) gameState.settings = {};
        gameState.settings.disableSound = !e.target.checked;
        saveGame();
    });
}

function setupNavigation() {
    DOM.navContainer.innerHTML = '';
    
    const navItems = [
        { id: 'collection', label: 'Collection', icon: '📚' },
        { id: 'store', label: 'Store', icon: '🛒' },
        { id: 'doodledex', label: 'DoodleDex', icon: '📱' },
        { id: 'achievements', label: 'Achievements', icon: '🏆' },
        { id: 'stats', label: 'Statistics', icon: '📊' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];
    
    navItems.forEach(item => {
        const navButton = document.createElement('button');
        navButton.className = `nav-btn w-full text-left px-3 py-2 rounded flex items-center ${gameState.ui.currentView === item.id ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`;
        navButton.innerHTML = `<span class="mr-2">${item.icon}</span> ${item.label}`;
        navButton.addEventListener('click', () => renderMainView(item.id));
        DOM.navContainer.appendChild(navButton);
    });
}

function setupEventListeners() {
    // Next day button
    DOM.nextDayBtn.addEventListener('click', advanceDay);
    
    // Close loupe view button
    DOM.closeLoupeBtn.addEventListener('click', closeLoupeView);
    
    // Global event delegation for card interactions
    document.addEventListener('click', (e) => {
        // Card inspection
        if (e.target.closest('.card-inspect-overlay')) {
            const cardElement = e.target.closest('.card-container');
            if (cardElement) {
                const cardId = cardElement.dataset.cardId;
                const instanceUid = cardElement.dataset.instanceUid;
                
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Click to open loupe view
                    openLoupeView(cardId);
                } else {
                    // Normal click to open card management
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

function openLoupeView(cardId) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    DOM.loupeCardContainer.innerHTML = '';
    
    const cardElement = buildCardElement(cardData.cardInfo);
    cardElement.classList.add('loupe-card');
    
    DOM.loupeCardContainer.appendChild(cardElement);
    DOM.loupeModal.classList.remove('hidden');
}

function closeLoupeView() {
    DOM.loupeModal.classList.add('hidden');
}

function advanceDay() {
    gameState.date.day++;
    if (gameState.date.day > 30) {
        gameState.date.day = 1;
        gameState.date.year++;
    }
    
    // Process market events
    cleanupExpiredMarketEvents();
    const newEvent = updateMarket();
    if (newEvent) {
        logMessage(`Market Event: ${newEvent.name} - ${newEvent.effect}`, "market");
        updateStats('marketEvents', 1);
    }
    
    // Check for achievements
    checkAchievements();
    
    // Update stats
    updateStats('daysPlayed', 1);
    
    // Save game
    saveGame();
    
    // Update UI
    calculateNetWorth();
    updateUI();
    
    logMessage(`Day ${gameState.date.day}, Year ${gameState.date.year} has begun.`, "time");
}

function cleanupExpiredMarketEvents() {
    const currentDay = gameState.date.day;
    const currentYear = gameState.date.year;
    
    gameState.market.events = gameState.market.events.filter(event => {
        return event.year > currentYear || (event.year === currentYear && event.expires >= currentDay);
    });
}

function checkAchievements() {
    let newAchievements = false;
    
    Object.entries(ACHIEVEMENTS).forEach(([id, achievement]) => {
        if (!achievement.unlocked && achievement.requirement(gameState)) {
            achievement.unlocked = true;
            gameState.achievements[id] = true;
            
            // Apply rewards
            if (achievement.reward) {
                if (achievement.reward.cash) {
                    gameState.player.cash += achievement.reward.cash;
                    logMessage(`Achievement reward: $${achievement.reward.cash}`, "reward");
                }
            }
            
            logMessage(`Achievement Unlocked: ${achievement.name}`, "achievement");
            newAchievements = true;
            updateStats('achievementsUnlocked', 1);
        }
    });
    
    return newAchievements;
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
    
    logMessage(`Purchased a ${set.name} pack for $${packPrice.toFixed(2)}.`, "purchase");
    
    // Prompt to open pack
    if (confirm(`You bought a ${set.name} pack! Would you like to open it now?`)) {
        gameState.ui.selectedPack = setName;
        renderMainView('pack-opening');
    }
    
    saveGame();
}

function buySupplies(supplyType) {
    let price, quantity;
    
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
    
    logMessage(`Purchased ${quantity} ${supplyType} for $${price.toFixed(2)}.`, "purchase");
    saveGame();
}

function openPack(setName) {
    const set = TCG_SETS[setName];
    if (!set || !gameState.player.sealedInventory[setName] || gameState.player.sealedInventory[setName] <= 0) {
        return;
    }
    
    // Generate pack contents
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
    
    // Add cards to collection
    packCards.forEach(card => {
        addCardToCollection(card);
    });
    
    // Remove pack from inventory
    gameState.player.sealedInventory[setName]--;
    
    // Update stats
    updateStats('packsOpened', 1);
    updateStats('cardsAcquired', packCards.length);
    
    // Log results
    logMessage(`Opened a ${set.name} pack! Got ${packCards.length} cards.`, "success");
    packCards.forEach(card => logMessage(`• ${card.name} (${card.rarity})`, "info"));
    
    // Check for achievements
    checkAchievements();
    
    // Update UI
    calculateNetWorth();
    updateUI();
    
    saveGame();
    return packCards;
}

function addCardToCollection(card) {
    if (!card) return;
    
    // Generate a unique ID for this card instance
    const instanceUid = generateUid();
    const condition = determineCardCondition();
    
    // Add to collection
    if (!gameState.player.collection[card.id]) {
        gameState.player.collection[card.id] = {
            cardInfo: card,
            instances: []
        };
    }
    
    gameState.player.collection[card.id].instances.push({
        uid: instanceUid,
        condition: condition,
        sleeved: false,
        toploadered: false,
        acquired: {
            day: gameState.date.day,
            year: gameState.date.year
        }
    });
    
    // Check if this is a high value card
    const cardValue = getCardValue(card);
    if (cardValue > (gameState.stats.highestValueCard?.value || 0)) {
        gameState.stats.highestValueCard = {
            name: card.name,
            value: cardValue
        };
    }
    
    return instanceUid;
}

function sleeveCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid == instanceUid);
    if (!instance || instance.sleeved) return;
    
    if (gameState.player.supplies.sleeves <= 0) {
        logMessage("You don't have any sleeves left. Buy more from the store.", "error");
        return;
    }
    
    instance.sleeved = true;
    gameState.player.supplies.sleeves--;
    
    logMessage(`Sleeved your ${cardData.cardInfo.name}.`, "info");
    
    // Update UI
    calculateNetWorth();
    updateUI();
    renderMainView('card-management');
    
    saveGame();
}

function unsleeveCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid == instanceUid);
    if (!instance || !instance.sleeved) return;
    
    instance.sleeved = false;
    gameState.player.supplies.sleeves++;
    
    logMessage(`Removed sleeve from your ${cardData.cardInfo.name}.`, "info");
    
    // Update UI
    calculateNetWorth();
    updateUI();
    renderMainView('card-management');
    
    saveGame();
}

function toploaderCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid == instanceUid);
    if (!instance || instance.toploadered) return;
    
    if (gameState.player.supplies.toploaders <= 0) {
        logMessage("You don't have any toploaders left. Buy more from the store.", "error");
        return;
    }
    
    instance.toploadered = true;
    gameState.player.supplies.toploaders--;
    
    logMessage(`Added toploader to your ${cardData.cardInfo.name}.`, "info");
    
    // Update UI
    calculateNetWorth();
    updateUI();
    renderMainView('card-management');
    
    saveGame();
}

function removeToploader(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instance = cardData.instances.find(i => i.uid == instanceUid);
    if (!instance || !instance.toploadered) return;
    
    instance.toploadered = false;
    gameState.player.supplies.toploaders++;
    
    logMessage(`Removed toploader from your ${cardData.cardInfo.name}.`, "info");
    
    // Update UI
    calculateNetWorth();
    updateUI();
    renderMainView('card-management');
    
    saveGame();
}

function sellCard(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const instanceIndex = cardData.instances.findIndex(i => i.uid == instanceUid);
    if (instanceIndex === -1) return;
    
    const instance = cardData.instances[instanceIndex];
    const cardValue = getCardValue(cardData.cardInfo, instance);
    
    if (confirm(`Are you sure you want to sell this ${cardData.cardInfo.name} for $${cardValue.toFixed(2)}?`)) {
        // Remove card instance
        cardData.instances.splice(instanceIndex, 1);
        
        // If no instances left, remove card from collection
        if (cardData.instances.length === 0) {
            delete gameState.player.collection[cardId];
        }
        
        // Add cash
        gameState.player.cash += cardValue;
        
        // Return sleeve/toploader if applicable
        if (instance.sleeved) {
            gameState.player.supplies.sleeves++;
        }
        if (instance.toploadered) {
            gameState.player.supplies.toploaders++;
        }
        
        // Update stats
        updateStats('cardsSold', 1);
        updateStats('totalEarned', cardValue);
        
        logMessage(`Sold ${cardData.cardInfo.name} for $${cardValue.toFixed(2)}.`, "success");
        
        // Check for achievements
        checkAchievements();
        
        // Update UI
        calculateNetWorth();
        updateUI();
        renderMainView('collection');
        
        saveGame();
    }
}

function updateUI() {
    DOM.playerCash.textContent = `$${gameState.player.cash.toFixed(2)}`;
    DOM.playerNetWorth.textContent = `$${gameState.player.netWorth.toFixed(2)}`;
    DOM.playerSleeves.textContent = gameState.player.supplies.sleeves;
    DOM.playerToploaders.textContent = gameState.player.supplies.toploaders;
    DOM.gameDate.textContent = `Day ${gameState.date.day}, Year ${gameState.date.year}`;
}

function logMessage(message, type = "info") {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry text-sm mb-1 ${getLogTypeClass(type)}`;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'text-gray-500 mr-1';
    timestamp.textContent = `[${gameState.date.day}:${gameState.date.year}]`;
    
    const content = document.createElement('span');
    content.textContent = message;
    
    logEntry.appendChild(timestamp);
    logEntry.appendChild(content);
    
    DOM.logFeed.appendChild(logEntry);
    DOM.logFeed.scrollTop = DOM.logFeed.scrollHeight;
    
    // Limit log entries
    while (DOM.logFeed.children.length > 100) {
        DOM.logFeed.removeChild(DOM.logFeed.firstChild);
    }
}

function getLogTypeClass(type) {
    switch(type) {
        case "error": return "text-red-400";
        case "success": return "text-green-400";
        case "purchase": return "text-blue-400";
        case "market": return "text-purple-400";
        
        case "achievement": return "text-yellow-400";
        case "reward": return "text-green-300";
        case "time": return "text-cyan-400";
        case "system": return "text-gray-300";
        default: return "text-gray-400";
    }
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
            
            // Ensure achievements are properly loaded
            Object.entries(ACHIEVEMENTS).forEach(([id, achievement]) => {
                achievement.unlocked = !!gameState.achievements[id];
            });
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading game:', error);
        return false;
    }
}

function exportSaveData() {
    try {
        const saveData = JSON.stringify(gameState);
        const blob = new Blob([saveData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cardboard-capitalist-save-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        logMessage("Save data exported successfully!", "success");
    } catch (error) {
        console.error('Error exporting save data:', error);
        logMessage("Failed to export save data.", "error");
    }
}

function resetGame() {
    try {
        localStorage.removeItem('cardboardCapitalistSave');
        location.reload();
        return true;
    } catch (error) {
        console.error('Error resetting game:', error);
        return false;
    }
}

function startTutorial() {
    tutorialActive = true;
    currentTutorialStep = 0;
    showTutorialStep();
}

function showTutorialStep() {
    const tutorialSteps = [
        {
            title: "Welcome to Cardboard Capitalist!",
            content: "This game simulates the experience of collecting and trading cards. Let's get you started with the basics.",
            position: "center"
        },
        {
            title: "Your Collection",
            content: "This is your collection view. As you acquire cards, they'll appear here. You can click on any card to manage it.",
            position: "main-view"
        },
        {
            title: "Player Stats",
            content: "Here you can see your cash, net worth, and supplies. You'll need these to buy packs and protect your cards.",
            position: "player-stats"
        },
        {
            title: "Time Controls",
            content: "Click 'Next Day' to advance time. Market conditions change daily, affecting card values.",
            position: "time-controls"
        },
        {
            title: "Navigation",
            content: "Use these buttons to navigate between different sections of the game.",
            position: "main-nav"
        },
        {
            title: "Activity Log",
            content: "Important events and actions are recorded here so you can keep track of your progress.",
            position: "log-feed"
        },
        {
            title: "Getting Started",
            content: "To begin, visit the Store to buy some packs, then open them to start building your collection!",
            position: "center"
        }
    ];
    
    if (currentTutorialStep >= tutorialSteps.length) {
        endTutorial();
        return;
    }
    
    const step = tutorialSteps[currentTutorialStep];
    
    // Remove any existing tutorial overlay
    const existingOverlay = document.getElementById('tutorial-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create tutorial overlay
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center';
    
    // Create tutorial box
    const tutorialBox = document.createElement('div');
    tutorialBox.className = 'bg-gray-800 p-6 rounded-lg max-w-md mx-auto border-2 border-blue-500 shadow-lg';
    
    tutorialBox.innerHTML = `
        <h3 class="text-xl font-bold text-white mb-2">${step.title}</h3>
        <p class="text-gray-300 mb-4">${step.content}</p>
        <div class="flex justify-between">
            <button id="tutorial-prev" class="bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-sm" ${currentTutorialStep === 0 ? 'disabled' : ''}>
                Previous
            </button>
            <button id="tutorial-next" class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
                ${currentTutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
            </button>
        </div>
    `;
    
    // Position the tutorial box
    if (step.position !== "center") {
        const targetElement = document.getElementById(step.position);
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            tutorialBox.style.position = 'absolute';
            
            // Position near the target element
            if (rect.top > window.innerHeight / 2) {
                // Position above
                tutorialBox.style.bottom = `${window.innerHeight - rect.top + 10}px`;
            } else {
                // Position below
                tutorialBox.style.top = `${rect.bottom + 10}px`;
            }
            
            if (rect.left > window.innerWidth / 2) {
                // Position to the left
                tutorialBox.style.right = `${window.innerWidth - rect.left + 10}px`;
            } else {
                // Position to the right
                tutorialBox.style.left = `${rect.right + 10}px`;
            }
            
            // Highlight the target element
            targetElement.classList.add('tutorial-highlight');
            setTimeout(() => {
                targetElement.classList.remove('tutorial-highlight');
            }, 300);
        }
    }
    
    overlay.appendChild(tutorialBox);
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('tutorial-prev').addEventListener('click', () => {
        if (currentTutorialStep > 0) {
            currentTutorialStep--;
            showTutorialStep();
        }
    });
    
    document.getElementById('tutorial-next').addEventListener('click', () => {
        currentTutorialStep++;
        if (currentTutorialStep < tutorialSteps.length) {
            showTutorialStep();
        } else {
            endTutorial();
        }
    });
}

function endTutorial() {
    tutorialActive = false;
    
    // Remove tutorial overlay
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Mark tutorial as completed
    if (!gameState.settings) gameState.settings = {};
    gameState.settings.tutorialCompleted = true;
    saveGame();
    
    logMessage("Tutorial completed! You're ready to start your collection journey.", "system");
}

// Utility Functions
function generateUid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
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

// Initialize the game when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}


                        
