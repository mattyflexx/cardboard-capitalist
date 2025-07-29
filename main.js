import { TCG_SETS, ASSETS, LAYOUT_BLUEPRINTS, getAllDoodlemonForGame } from './config.js';
import { gameState, updateGameState, calculateNetWorth, getCardValue, determineCardCondition, updateMarket, initializeStats, updateStats, ACHIEVEMENTS, CARD_CONDITIONS } from './state.js';
import { initializeLazyLoading, createLazyCardImage, preloadCardImages } from './assetLoader.js';

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

let tutorialActive = false;
let currentTutorialStep = 0;

const ASSET_PATH = 'assets/';

function initializeGame() {
    console.log("Game is initializing...");
    
    // Initialize lazy loading system
    initializeLazyLoading();
    
    // Generate image paths for all standard cards with robust fallback system.
    TCG_SETS.genesis.cards.forEach(card => {
        if (!card.img) {
            const paddedDexNum = String(card.doodledexNum).padStart(3, '0');
            
            // Convert the card name to lowercase and replace spaces with hyphens to match filenames.
            const formattedName = card.name.toLowerCase().replace(/\s+/g, '-');
            card.img = `${ASSET_PATH}${paddedDexNum}-${formattedName}.png`;
            
            // Store original formatted name for fallback logging
            card.originalFormattedName = formattedName;
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
        <option value="date_acquired">Date Acquired</option>
        <option value="condition">Condition</option>
      </select>
      <select id="collection-order" class="bg-gray-700 text-white rounded px-2 py-1 text-sm ml-2">
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
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
    <div class="flex items-center ml-4">
      <label class="mr-2 text-sm">Condition:</label>
      <select id="collection-filter-condition" class="bg-gray-700 text-white rounded px-2 py-1 text-sm">
        <option value="all">All Conditions</option>
        <option value="Mint">Mint</option>
        <option value="Near Mint">Near Mint</option>
        <option value="Excellent">Excellent</option>
        <option value="Good">Good</option>
        <option value="Poor">Poor</option>
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
  document.getElementById('collection-order').addEventListener('change', () => renderFilteredCollection(document.getElementById('collection-grid')));
  document.getElementById('collection-filter-rarity').addEventListener('change', () => renderFilteredCollection(document.getElementById('collection-grid')));
  document.getElementById('collection-filter-condition').addEventListener('change', () => renderFilteredCollection(document.getElementById('collection-grid')));
}

function renderFilteredCollection(grid) {
  grid.innerHTML = '';
  
  const sortBy = document.getElementById('collection-sort')?.value || 'id';
  const sortOrder = document.getElementById('collection-order')?.value || 'asc';
  const rarityFilter = document.getElementById('collection-filter-rarity')?.value || 'all';
  const conditionFilter = document.getElementById('collection-filter-condition')?.value || 'all';
  
  let allInstances = [];
  Object.values(gameState.player.collection).forEach(cardData => {
      cardData.instances.forEach(instance => {
          allInstances.push({ cardInfo: cardData.cardInfo, instance });
      });
  });

  // Apply filters
  if (rarityFilter !== 'all') {
    allInstances = allInstances.filter(item => item.cardInfo.rarity === rarityFilter);
  }
  
  if (conditionFilter !== 'all') {
    allInstances = allInstances.filter(item => item.instance.condition === conditionFilter);
  }
  
  // Enhanced sorting
  allInstances.sort((a, b) => {
    const cardA = a.cardInfo;
    const cardB = b.cardInfo;
    let comparison = 0;
    
    switch(sortBy) {
      case 'name': 
        comparison = cardA.name.localeCompare(cardB.name);
        break;
      case 'rarity': 
        const rarityOrder = ['Common', 'Uncommon', 'Holo Rare', 'Alternate Art', 'Insert Art', 'Chase'];
        comparison = rarityOrder.indexOf(cardA.rarity) - rarityOrder.indexOf(cardB.rarity);
        break;
      case 'value': 
        comparison = getCardValue(cardB, b.instance) - getCardValue(cardA, a.instance);
        break;
      case 'date_acquired':
        comparison = new Date(a.instance.dateAcquired) - new Date(b.instance.dateAcquired);
        break;
      case 'condition':
        const conditionOrder = ['Poor', 'Good', 'Excellent', 'Near Mint', 'Mint'];
        comparison = conditionOrder.indexOf(a.instance.condition) - conditionOrder.indexOf(b.instance.condition);
        break;
      default: 
        comparison = cardA.id.localeCompare(cardB.id);
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
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

    // 1. Add Lazy-Loaded Art Image
    const artImg = createLazyCardImage(
        cardInfo.img,
        cardInfo.name,
        'card-art'
    );
    cardElement.appendChild(artImg);

    // 2. Add Frame
    const frameImg = document.createElement('img');
    const frameType = cardInfo.layout === 'Full-Art' ? 'fullArt' : 'standard';
    frameImg.src = ASSETS.frames[frameType];
    frameImg.className = 'card-frame';
    cardElement.appendChild(frameImg);

    // 3. Add Text Overlay
    const textOverlay = document.createElement('div');
    textOverlay.className = 'card-text-overlay';

    const blueprint = LAYOUT_BLUEPRINTS[cardInfo.layout === 'Insert-Art' ? 'insertArt' : cardInfo.layout.toLowerCase()] || LAYOUT_BLUEPRINTS.standard;
    const canvasWidth = 750;
    const canvasHeight = 1050;

    // Name Box
    if (blueprint.name) {
        const nameBox = document.createElement('div');
        nameBox.className = 'card-name-box';
        if (cardInfo.layout === 'Full-Art') {
            nameBox.classList.add('full-art-name-box');
        }
        nameBox.style.left = `${(blueprint.name.x / canvasWidth) * 100}%`;
        nameBox.style.top = `${(blueprint.name.y / canvasHeight) * 100}%`;
        nameBox.style.width = `${(blueprint.name.width / canvasWidth) * 100}%`;
        nameBox.style.height = `${(blueprint.name.height / canvasHeight) * 100}%`;
        nameBox.textContent = cardInfo.name;
        textOverlay.appendChild(nameBox);
    }

    // Lore Box (only for standard layout)
    if (cardInfo.layout === 'Standard' && blueprint.lore) {
        const loreBox = document.createElement('div');
        loreBox.className = 'card-lore-box';
        loreBox.style.left = `${(blueprint.lore.x / canvasWidth) * 100}%`;
        loreBox.style.top = `${(blueprint.lore.y / canvasHeight) * 100}%`;
        loreBox.style.width = `${(blueprint.lore.width / canvasWidth) * 100}%`;
        loreBox.style.height = `${(blueprint.lore.height / canvasHeight) * 100}%`;
        loreBox.textContent = cardInfo.lore || "A mysterious creature.";
        textOverlay.appendChild(loreBox);
    }
    cardElement.appendChild(textOverlay);

    // 4. Add Holo Effect if applicable
    if (['Holo Rare', 'Chase', 'Alternate Art', 'Insert Art'].includes(cardInfo.rarity)) {
        const holoOverlay = document.createElement('div');
        holoOverlay.className = 'card-holo-overlay';
        if (cardInfo.rarity !== 'Insert Art') {
            holoOverlay.classList.add('full-card');
        }
        cardElement.appendChild(holoOverlay);
    }

    // 5. Add Inspect Overlay for Clicks
    const inspectOverlay = document.createElement('div');
    inspectOverlay.className = 'card-inspect-overlay';
    cardElement.appendChild(inspectOverlay);

    return cardElement;
}


    // Standard and Full-Art card handling with lazy loading
    const artImg = createLazyCardImage(
        cardInfo.img || `${ASSET_PATH}fallback.png`,
        cardInfo.name,
        'card-art',
        function(errorImg) {
            errorImg.src = `${ASSET_PATH}fallback.png`;
            errorImg.className = errorImg.className.replace('loading', 'error');
        }
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
  
  const stats = gameState.stats || {};
  
  statsDiv.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="bg-gray-800 p-4 rounded-lg text-center">
        <p class="text-gray-400 text-sm mb-1">Packs Opened</p>
        <p class="text-2xl font-bold text-white">${stats.packsOpened || 0}</p>
      </div>
      <div class="bg-gray-800 p-4 rounded-lg text-center">
        <p class="text-gray-400 text-sm mb-1">Cards Acquired</p>
        <p class="text-2xl font-bold text-white">${stats.cardsAcquired || 0}</p>
      </div>
      <div class="bg-gray-800 p-4 rounded-lg text-center">
        <p class="text-gray-400 text-sm mb-1">Cards Sold</p>
        <p class="text-2xl font-bold text-white">${stats.cardsSold || 0}</p>
      </div>
      <div class="bg-gray-800 p-4 rounded-lg text-center">
        <p class="text-gray-400 text-sm mb-1">Total Earned</p>
        <p class="text-2xl font-bold text-green-400">$${(stats.totalEarned || 0).toFixed(2)}</p>
      </div>
      <div class="bg-gray-800 p-4 rounded-lg text-center">
        <p class="text-gray-400 text-sm mb-1">Total Spent</p>
        <p class="text-2xl font-bold text-red-400">$${(stats.totalSpent || 0).toFixed(2)}</p>
      </div>
      <div class="bg-gray-800 p-4 rounded-lg text-center">
        <p class="text-gray-400 text-sm mb-1">Days Played</p>
        <p class="text-2xl font-bold text-white">${stats.daysPlayed || 0}</p>
      </div>
    </div>
    <div class="bg-gray-800 p-4 rounded-lg">
      <h3 class="text-lg font-bold text-white mb-2">Highest Value Card</h3>
      <p class="text-gray-300">${stats.highestValueCard?.name || 'None'}</p>
      ${stats.highestValueCard?.value ? `<p class="text-green-400">$${stats.highestValueCard.value.toFixed(2)}</p>` : ''}
    </div>
    <div class="bg-gray-800 p-4 rounded-lg">
      <h3 class="text-lg font-bold text-white mb-2">Achievements</h3>
      <p class="text-gray-300">Unlocked: ${stats.achievementsUnlocked || 0}</p>
    </div>
  `;
  
  container.appendChild(statsDiv);
}

function renderSettingsView(container) {
  const settingsDiv = document.createElement('div');
  settingsDiv.className = 'space-y-6';
  
  const settings = gameState.settings || {};
  
  settingsDiv.innerHTML = `
    <div class="bg-gray-800 p-6 rounded-lg">
      <h3 class="text-lg font-bold text-white mb-4">Game Settings</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <label class="text-gray-300">Auto-save</label>
          <input type="checkbox" id="auto-save-toggle" ${settings.autoSave ? 'checked' : ''} class="rounded">
        </div>
        <div class="flex items-center justify-between">
          <label class="text-gray-300">Tutorial Completed</label>
          <span class="text-gray-400">${settings.tutorialCompleted ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
    
    <div class="bg-gray-800 p-6 rounded-lg">
      <h3 class="text-lg font-bold text-white mb-4">Save Management</h3>
      <div class="space-y-2">
        <button id="save-game-btn" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          Save Game
        </button>
        <button id="reset-game-btn" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
          Reset Game
        </button>
      </div>
      <p class="text-gray-400 text-xs mt-2">Warning: Reset will delete all progress permanently!</p>
    </div>
    
    <div class="bg-gray-800 p-6 rounded-lg">
      <h3 class="text-lg font-bold text-white mb-4">Controls</h3>
      <div class="text-sm text-gray-300 space-y-1">
        <p><kbd class="bg-gray-700 px-2 py-1 rounded">1</kbd> - Collection</p>
        <p><kbd class="bg-gray-700 px-2 py-1 rounded">2</kbd> - Store</p>
        <p><kbd class="bg-gray-700 px-2 py-1 rounded">3</kbd> - DoodleDex</p>
        <p><kbd class="bg-gray-700 px-2 py-1 rounded">Ctrl+S</kbd> - Save Game</p>
        <p><kbd class="bg-gray-700 px-2 py-1 rounded">Ctrl+Click</kbd> - Card Management</p>
        <p><kbd class="bg-gray-700 px-2 py-1 rounded">Right Click</kbd> - Card Management</p>
      </div>
    </div>
  `;
  
  container.appendChild(settingsDiv);
  
  // Add event listeners
  document.getElementById('auto-save-toggle')?.addEventListener('change', (e) => {
    if (!gameState.settings) gameState.settings = {};
    gameState.settings.autoSave = e.target.checked;
    if (e.target.checked) saveGame();
  });
  
  document.getElementById('save-game-btn')?.addEventListener('click', () => {
    saveGame();
  });
  
  document.getElementById('reset-game-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
      localStorage.removeItem('cardboardCapitalistSave');
      location.reload();
    }
  });
}

function openLoupeView(cardId, instanceUid) {
    const cardData = gameState.player.collection[cardId];
    if (!cardData) return;
    
    const cardInstance = cardData.instances.find(inst => inst.uid == instanceUid);
    const cardInfo = cardData.cardInfo;
    
    if (!cardInstance || !cardInfo.img) return;
    
    DOM.loupeCardContainer.innerHTML = '';
    const cardElement = buildCardElement(cardInfo, cardInstance);
    cardElement.querySelector('.card-inspect-overlay')?.remove();
    DOM.loupeCardContainer.appendChild(cardElement);
    DOM.loupeModal.classList.remove('hidden');
}

function closeLoupeView() {
    DOM.loupeModal.classList.add('hidden');
}

function buyPack(setName) {
    const set = TCG_SETS[setName];
    if (!set || gameState.player.cash < set.pack.price) return false;
    
    gameState.player.cash -= set.pack.price;
    updateStats('totalSpent', set.pack.price);
    gameState.player.sealedInventory[setName]++;
    logMessage(`Bought a ${set.name} booster pack for $${set.pack.price.toFixed(2)}!`, "success");
    return true;
}

function openPack(setName) {
    const set = TCG_SETS[setName];
    if (!set || gameState.player.sealedInventory[setName] <= 0) return;
    
    gameState.player.sealedInventory[setName]--;
    const packCards = [];
    const rarityWeights = {'Common': 70, 'Uncommon': 20, 'Holo Rare': 8, 'Alternate Art': 1.5, 'Chase': 0.5};
    
    for (let i = 0; i < 11; i++) {
        const rarity = weightedRandomChoice(rarityWeights);
        const availableCards = set.cards.filter(c => c.rarity === rarity);
        if (availableCards.length > 0) {
            const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
            packCards.push(randomCard);
            addCardToCollection(randomCard);
        }
    }
    
    updateStats('packsOpened', 1);
    updateStats('cardsAcquired', packCards.length);
    logMessage(`Opened a ${set.name} pack! Got ${packCards.length} cards.`, "success");
    packCards.forEach(card => logMessage(`• ${card.name} (${card.rarity})`, "info"));
    
    calculateNetWorth();
    updateUI();
    
    if (gameState.ui.currentView === 'collection') renderMainView('collection');
}

function weightedRandomChoice(weights) {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    for (const [choice, weight] of Object.entries(weights)) {
        random -= weight;
        if (random <= 0) return choice;
    }
    return Object.keys(weights)[0];
}

function buySupply(supplyType) {
    const supplies = { sleeves: { price: 5.00, amount: 100 }, toploaders: { price: 3.00, amount: 25 } };
    const supply = supplies[supplyType];
    if (!supply || gameState.player.cash < supply.price) return;
    
    gameState.player.cash -= supply.price;
    gameState.player.supplies[supplyType] += supply.amount;
    logMessage(`Bought ${supply.amount} ${supplyType} for $${supply.price.toFixed(2)}!`, "success");
    updateUI();
}

function nextDay() {
    gameState.date.day++;
    if (gameState.date.day > 365) {
        gameState.date.day = 1;
        gameState.date.year++;
    }
    
    const dailyIncome = 5.00;
    gameState.player.cash += dailyIncome;
    logMessage(`You earned $${dailyIncome.toFixed(2)} from your day job.`, "success");
    
    processMarketEvents();
    
    const dailyEvent = generateDailyEvent();
    if (dailyEvent) {
        logMessage(dailyEvent.message, dailyEvent.type);
        if (dailyEvent.reward) applyDailyReward(dailyEvent.reward);
    }
    
    const marketEvent = updateMarket();
    if (marketEvent) logMessage(`Market Event: ${marketEvent.name} - ${marketEvent.effect}`, "info");
    
    updateStats('daysPlayed', 1);
    
    const newAchievements = checkAchievements();
    if (newAchievements.length > 0) {
        newAchievements.forEach(achievement => {
            logMessage(`Achievement Unlocked: ${achievement.name}`, "success");
            showToastNotification(`🏆 ${achievement.name}`, "achievement", 6000);
            if (achievement.reward?.cash) {
                logMessage(`Reward: $${achievement.reward.cash} added to your account`, "success");
                showToastNotification(`💰 +$${achievement.reward.cash}`, "success", 4000);
            }
            if (achievement.reward?.supplies) Object.entries(achievement.reward.supplies).forEach(([item, amount]) => {
                logMessage(`Reward: ${amount} ${item} added to your supplies`, "success");
                showToastNotification(`📦 +${amount} ${item}`, "success", 4000);
            });
        });
    }
    
    if (gameState.settings?.autoSave) saveGame();
    
    calculateNetWorth();
    updateUI();
}

function processMarketEvents() {
    // Filter out expired events with proper year transition handling
    gameState.market.events = gameState.market.events.filter(event => {
        // Event is expired if:
        // 1. Current year is greater than event year, OR
        // 2. Same year but current day is greater than expiration day
        const isExpired = (gameState.date.year > event.year) || 
                         (gameState.date.year === event.year && gameState.date.day > event.expires);
        
        if (isExpired) {
            console.log(`📅 Removing expired market event: ${event.name} (Year ${event.year}, Day ${event.expires})`);
        }
        
        return !isExpired;
    });
    
    // Warn about events ending tomorrow
    gameState.market.events.forEach(event => {
        if (event.year === gameState.date.year && event.expires === gameState.date.day + 1) {
            logMessage(`Market event "${event.name}" is ending tomorrow.`, "info");
        }
    });
}

// Cleanup function to remove lingering expired events at game session start
function cleanupExpiredMarketEvents() {
    const initialCount = gameState.market.events.length;
    processMarketEvents(); // This will remove expired events
    const finalCount = gameState.market.events.length;
    
    if (initialCount > finalCount) {
        const removedCount = initialCount - finalCount;
        console.log(`🧹 Cleaned up ${removedCount} expired market event(s) at game start`);
        logMessage(`Cleaned up ${removedCount} expired market event(s).`, "info");
    }
}

function generateDailyEvent() {
    const events = [
        { name: "Found a Pack", chance: 0.05, message: "You found a Genesis booster pack at the back of a store shelf!", type: "success", reward: { type: "pack", set: "genesis", amount: 1 } },
        { name: "Free Sleeves", chance: 0.1, message: "A local card shop was giving away free sleeves with any purchase.", type: "success", reward: { type: "supplies", item: "sleeves", amount: 25 } },
        { name: "Card Damage", chance: 0.03, message: "Oh no! You accidentally damaged one of your unprotected cards.", type: "error", reward: { type: "damage" } },
        { name: "Market Tip", chance: 0.08, message: "A friend gave you a tip about upcoming market changes.", type: "info", reward: { type: "marketInsight" } },
        { name: "Lucky Find", chance: 0.02, message: "You found some cash on the ground!", type: "success", reward: { type: "cash", amount: 10 } }
    ];
    const totalChance = events.reduce((sum, event) => sum + event.chance, 0);
    const rand = Math.random() * totalChance;
    let cumulativeChance = 0;
    for (const event of events) {
        cumulativeChance += event.chance;
        if (rand <= cumulativeChance) return event;
    }
    return null;
}

function applyDailyReward(reward) {
    switch(reward.type) {
        case "pack":
            gameState.player.sealedInventory[reward.set] += reward.amount;
            logMessage(`Added ${reward.amount} ${reward.set} pack(s) to your inventory.`, "success");
            break;
        case "supplies":
            gameState.player.supplies[reward.item] += reward.amount;
            logMessage(`Added ${reward.amount} ${reward.item} to your supplies.`, "success");
            break;
        case "damage":
            const unprotectedCards = [];
            Object.entries(gameState.player.collection).forEach(([cardId, cardData]) => {
                cardData.instances.forEach(instance => {
                    if (!instance.sleeved && !instance.toploadered) unprotectedCards.push({ cardId, instanceUid: instance.uid });
                });
            });
            if (unprotectedCards.length > 0) {
                const randomCard = unprotectedCards[Math.floor(Math.random() * unprotectedCards.length)];
                const cardData = gameState.player.collection[randomCard.cardId];
                const instance = cardData.instances.find(i => i.uid === randomCard.instanceUid);
                const conditions = Object.values(CARD_CONDITIONS).map(c => c.name);
                const currentIndex = conditions.indexOf(instance.condition);
                if (currentIndex < conditions.length - 1) {
                    instance.condition = conditions[currentIndex + 1];
                    logMessage(`Your ${cardData.cardInfo.name} condition decreased to ${instance.condition}.`, "error");
                }
            }
            break;
        case "marketInsight":
            if (gameState.market.events.length > 0) logMessage(`Market Insight: ${gameState.market.events[0].name} will affect ${gameState.market.events[0].affectedRarities?.join(', ') || 'certain cards'}.`, "info");
            else logMessage("Market Insight: The market seems stable for now.", "info");
            break;
        case "cash":
            gameState.player.cash += reward.amount;
            logMessage(`Added $${reward.amount.toFixed(2)} to your cash.`, "success");
            break;
    }
}

function updateUI() {
    DOM.playerCash.textContent = `$${gameState.player.cash.toFixed(2)}`;
    DOM.playerNetWorth.textContent = `$${gameState.player.netWorth.toFixed(2)}`;
    DOM.playerSleeves.textContent = gameState.player.supplies.sleeves;
    DOM.playerToploaders.textContent = gameState.player.supplies.toploaders;
    DOM.gameDate.textContent = `Year ${gameState.date.year}, Day ${gameState.date.day}`;
}

function logMessage(message, type = 'normal') {
    const p = document.createElement('p');
    const colorClasses = { success: 'text-green-500', error: 'text-red-500', info: 'text-blue-400', system: 'text-purple-400 italic' };
    p.className = colorClasses[type] || 'text-gray-400';
    p.innerHTML = `> ${message}`;
    DOM.logFeed.prepend(p);
    if (DOM.logFeed.children.length > 100) DOM.logFeed.removeChild(DOM.logFeed.lastChild);
}

function addCardToCollection(cardInfo, condition = 'Near Mint') {
    if (!cardInfo) return;
    const cardId = cardInfo.id;
    if (!gameState.player.collection[cardId]) gameState.player.collection[cardId] = { cardInfo: cardInfo, instances: [] };
    gameState.player.collection[cardId].instances.push({ uid: Date.now() + Math.random(), condition: condition, sleeved: false, toploaded: false });
}

function sleeveCard(cardId, instanceUid) {
  const cardData = gameState.player.collection[cardId];
  if (!cardData) return false;
  const instance = cardData.instances.find(i => i.uid == instanceUid);
  if (!instance || instance.sleeved || gameState.player.supplies.sleeves <= 0) return false;
  instance.sleeved = true;
  gameState.player.supplies.sleeves--;
  logMessage(`You sleeved your ${cardData.cardInfo.name}.`, "success");
  return true;
}

function toploaderCard(cardId, instanceUid) {
  const cardData = gameState.player.collection[cardId];
  if (!cardData) return false;
  const instance = cardData.instances.find(i => i.uid == instanceUid);
  if (!instance || instance.toploadered || gameState.player.supplies.toploaders <= 0) return false;
  instance.toploadered = true;
  gameState.player.supplies.toploaders--;
  logMessage(`You put your ${cardData.cardInfo.name} in a toploader.`, "success");
  return true;
}

function sellCard(cardId, instanceUid) {
  const cardData = gameState.player.collection[cardId];
  if (!cardData) return false;
  const instanceIndex = cardData.instances.findIndex(i => i.uid == instanceUid);
  if (instanceIndex === -1) return false;
  
  const cardValue = getCardValue(cardData.cardInfo, cardData.instances[instanceIndex]);
  gameState.player.cash += cardValue;
  updateStats('cardsSold', 1);
  updateStats('totalEarned', cardValue);
  
  cardData.instances.splice(instanceIndex, 1);
  if (cardData.instances.length === 0) delete gameState.player.collection[cardId];
  
  logMessage(`You sold ${cardData.cardInfo.name} for $${cardValue.toFixed(2)}.`, "success");
  calculateNetWorth();
  return true;
}

function checkHighestValueCard() {
  let highestValue = 0;
  let highestCard = { name: "None", value: 0 };
  Object.values(gameState.player.collection).forEach(cardData => {
    cardData.instances.forEach(instance => {
      const value = getCardValue(cardData.cardInfo, instance);
      if (value > highestValue) {
        highestValue = value;
        highestCard = { name: cardData.cardInfo.name, value: value };
      }
    });
  });
  if (highestValue > gameState.stats.highestValueCard.value) updateStats('highestValueCard', highestCard);
}

function checkAchievements() {
  // Ensure achievements object is always initialized
  if (!gameState.achievements) {
    gameState.achievements = {};
    console.log("🔧 Initialized missing achievements object");
  }
  
  let newAchievements = [];
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    // Check if achievement is already unlocked in gameState
    const isUnlocked = gameState.achievements[achievement.id] || achievement.unlocked;
    
    if (!isUnlocked && achievement.requirement(gameState)) {
      // Mark as unlocked in both places for consistency
      achievement.unlocked = true;
      gameState.achievements[achievement.id] = true;
      
      newAchievements.push(achievement);
      
      // Apply rewards with error handling
      try {
        if (achievement.reward?.cash) {
          gameState.player.cash += achievement.reward.cash;
          console.log(`💰 Achievement reward: +$${achievement.reward.cash} for "${achievement.name}"`);
        }
        if (achievement.reward?.supplies) {
          Object.entries(achievement.reward.supplies).forEach(([item, amount]) => {
            if (gameState.player.supplies[item] !== undefined) {
              gameState.player.supplies[item] += amount;
              console.log(`📦 Achievement reward: +${amount} ${item} for "${achievement.name}"`);
            }
          });
        }
      } catch (error) {
        console.error(`❌ Error applying achievement reward for "${achievement.name}":`, error);
      }
      
      updateStats('achievementsUnlocked', 1);
    }
  });
  return newAchievements;
}

function saveGame() {
  try {
    const saveData = { player: gameState.player, date: gameState.date, market: gameState.market, achievements: gameState.achievements, stats: gameState.stats || {}, version: "1.0.0" };
    localStorage.setItem('cardboardCapitalistSave', JSON.stringify(saveData));
    logMessage("Game saved successfully!", "success");
    return true;
  } catch (error) {
    console.error("Error saving game:", error);
    logMessage("Failed to save game.", "error");
    return false;
  }
}

function loadGame() {
  try {
    const saveData = localStorage.getItem('cardboardCapitalistSave');
    if (!saveData) {
      logMessage("No saved game found. Starting new game.", "info");
      return false;
    }
    const parsedData = JSON.parse(saveData);
    gameState.player = parsedData.player;
    gameState.date = parsedData.date;
    gameState.market = parsedData.market;
    gameState.achievements = parsedData.achievements;
    gameState.stats = parsedData.stats || {};
    logMessage("Game loaded successfully!", "success");
    return true;
  } catch (error) {
    console.error("Error loading game:", error);
    logMessage("Failed to load saved game. Starting new game.", "error");
    return false;
  }
}

function setupEventListeners() {
    // Listen for messages from Art Director
    window.addEventListener('message', function(event) {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'DOODLEDEX_UPDATE') {
            // Refresh the Doodledex view if currently visible
            if (gameState.ui.currentView === 'doodledex') {
                renderMainView('doodledex');
            }
            // Show a notification
            logMessage(`New Doodlemon discovered: ${event.data.doodlemonName}! Check your Doodledex.`, "success");
        }
    });

    DOM.mainView.addEventListener('click', e => {
        const overlay = e.target.closest('.card-inspect-overlay');
        if (overlay) {
            const cardContainer = overlay.closest('.card-container');
            if (!tutorialActive) {
                if (e.ctrlKey || e.button === 2) {
                    gameState.ui.selectedCard = { cardId: cardContainer.dataset.cardId, instanceUid: cardContainer.dataset.instanceUid };
                    renderMainView('card-management');
                } else openLoupeView(cardContainer.dataset.cardId, cardContainer.dataset.instanceUid);
            }
            // If tutorial is active, prevent loupe view from opening
        }
        
        const buyPackBtn = e.target.closest('.buy-pack-btn');
        if (buyPackBtn) {
            const setName = buyPackBtn.dataset.set;
            if (buyPack(setName)) {
                gameState.ui.selectedPack = setName;
                renderMainView('pack-opening');
            }
        }
        
        const buySupplyBtn = e.target.closest('.buy-supply-btn');
        if (buySupplyBtn) buySupply(buySupplyBtn.dataset.supply);
        
        const sleeveBtn = e.target.closest('.sleeve-card-btn');
        if (sleeveBtn && sleeveCard(sleeveBtn.dataset.cardId, sleeveBtn.dataset.instanceUid)) renderMainView('card-management');
        
        const toploaderBtn = e.target.closest('.toploader-card-btn');
        if (toploaderBtn && toploaderCard(toploaderBtn.dataset.cardId, toploaderBtn.dataset.instanceUid)) renderMainView('card-management');
        
        const sellBtn = e.target.closest('.sell-card-btn');
        if (sellBtn && confirm("Are you sure you want to sell this card?") && sellCard(sellBtn.dataset.cardId, sellBtn.dataset.instanceUid)) renderMainView('collection');
    });
    
    DOM.mainView.addEventListener('contextmenu', e => {
        const cardContainer = e.target.closest('.card-container');
        if (cardContainer && !tutorialActive) {
            e.preventDefault();
            gameState.ui.selectedCard = { cardId: cardContainer.dataset.cardId, instanceUid: cardContainer.dataset.instanceUid };
            renderMainView('card-management');
        }
    });
    
    DOM.closeLoupeBtn.addEventListener('click', closeLoupeView);
    DOM.loupeModal.addEventListener('click', e => { if (e.target === DOM.loupeModal || e.target.classList.contains('modal-backdrop')) closeLoupeView(); });
    
    DOM.nextDayBtn.addEventListener('click', nextDay);
    
    document.addEventListener('keydown', e => {
        if (tutorialActive) return;
        switch(e.key) {
            case '1': renderMainView('collection'); break;
            case '2': renderMainView('store'); break;
            case '3': renderMainView('doodledex'); break;
            case 'Escape': if (!DOM.loupeModal.classList.contains('hidden')) closeLoupeView(); break;
            case 's': if (e.ctrlKey) { e.preventDefault(); saveGame(); } break;
        }
    });
}

function setupNavigation() {
    DOM.navContainer.innerHTML = '';
    const navItems = [
        { id: 'collection', label: 'Collection', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
        { id: 'store', label: 'Store', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
        { id: 'doodledex', label: 'DoodleDex', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
        { id: 'art-director', label: 'Art Director', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3H5v14a2 2 0 002 2 2 2 0 002-2V3zM21 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM19 3h-2v14a2 2 0 002 2 2 2 0 002-2V3z' },
        { id: 'achievements', label: 'Achievements', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
        { id: 'stats', label: 'Stats', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
    ];
    navItems.forEach(item => {
        const button = document.createElement('button');
        button.className = `w-full text-left bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2 ${gameState.ui.currentView === item.id ? 'bg-gray-700' : ''}`;
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}" /></svg><span>${item.label}</span>`;
        
        if (item.id === 'art-director') {
            button.addEventListener('click', () => {
                window.open('art_director.html', '_blank');
            });
        } else {
            button.addEventListener('click', () => renderMainView(item.id));
        }
        
        DOM.navContainer.appendChild(button);
    });
}

// Enhanced notification system
const notifications = [];

function showToastNotification(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-[2000] px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    
    // Style based on type
    const styles = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white', 
        warning: 'bg-yellow-600 text-black',
        info: 'bg-blue-600 text-white',
        achievement: 'bg-purple-600 text-white'
    };
    
    toast.className += ` ${styles[type] || styles.info}`;
    
    // Add icon based on type
    const icons = {
        success: '✅',
        error: '❌', 
        warning: '⚠️',
        info: 'ℹ️',
        achievement: '🏆'
    };
    
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-lg">${icons[type] || icons.info}</span>
            <span class="font-medium">${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 10);
    
    // Stack notifications
    const index = notifications.length;
    notifications.push(toast);
    toast.style.top = `${16 + (index * 80)}px`;
    
    // Auto remove
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
                const toastIndex = notifications.indexOf(toast);
                if (toastIndex > -1) {
                    notifications.splice(toastIndex, 1);
                    // Reposition remaining notifications
                    notifications.forEach((remainingToast, i) => {
                        remainingToast.style.top = `${16 + (i * 80)}px`;
                    });
                }
            }
        }, 300);
    }, duration);
}

// Enhanced logMessage function with toast notifications
const originalLogMessage = typeof logMessage !== 'undefined' ? logMessage : null;

function enhancedLogMessage(message, type = "info") {
    // Call original function if it exists
    if (originalLogMessage) {
        originalLogMessage(message, type);
    } else {
        // Fallback log display
        const logElement = DOM.logFeed;
        if (logElement) {
            const logEntry = document.createElement('p');
            logEntry.className = 'mb-2 text-sm';
            logEntry.innerHTML = `<span class="text-gray-400">&gt;</span> ${message}`;
            logElement.appendChild(logEntry);
            logElement.scrollTop = logElement.scrollHeight;
        }
    }
    
    // Show toast for important events
    const toastTypes = ['achievement', 'pack', 'rare_card', 'market_event'];
    if (toastTypes.some(t => message.toLowerCase().includes(t)) || type === 'success' || type === 'error') {
        const toastType = message.toLowerCase().includes('achievement') ? 'achievement' : type;
        showToastNotification(message, toastType);
    }
}

const TUTORIAL_STEPS = [
  { id: 'welcome', title: 'Welcome to Cardboard Capitalist!', content: 'You are a trading card collector starting your journey in the world of Doodlemon TCG.', target: null, position: 'center' },
  { id: 'cash', title: 'Your Starting Cash', content: 'You start with $50. You earn more daily from your day job.', target: '#player-cash', position: 'bottom' },
  { id: 'store', title: 'Visit the Store', content: 'Click on the Store tab to buy booster packs and supplies.', target: 'nav button:nth-child(2)', position: 'right' },
  { id: 'buy-pack', title: 'Buy Your First Pack', content: 'Purchase a Genesis booster pack to get your first cards.', target: '.buy-pack-btn', position: 'top' },
  { id: 'collection', title: 'View Your Collection', content: 'After opening a pack, visit your Collection to see your new cards.', target: 'nav button:first-child', position: 'right' },
  { id: 'protection', title: 'Protect Your Cards', content: 'Valuable cards should be protected with sleeves and toploaders.', target: '.card-container', position: 'top' },
  { id: 'next-day', title: 'Advance Time', content: 'Click "Next Day" to progress time, earn daily income, and trigger market events.', target: '#next-day-btn', position: 'left' }
];

function startTutorial() {
    if (gameState.settings?.tutorialCompleted) return;
    tutorialActive = true;
    currentTutorialStep = 0;
    
    // Disable pointer events on loupe modal when tutorial is active
    DOM.loupeModal.style.pointerEvents = 'none';
    
    showTutorialStep();
}

function showTutorialStep() {
    if (currentTutorialStep >= TUTORIAL_STEPS.length) {
        endTutorial();
        return;
    }
    const step = TUTORIAL_STEPS[currentTutorialStep];
    const existingOverlay = document.getElementById('tutorial-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-[1100] flex items-center justify-center';
    
    const modal = document.createElement('div');
    modal.className = 'bg-gray-800 p-6 rounded-lg max-w-md mx-4 relative';
    modal.innerHTML = `
        <h3 class="text-xl font-bold text-white mb-4">${step.title}</h3>
        <p class="text-gray-300 mb-6">${step.content}</p>
        <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Step ${currentTutorialStep + 1} of ${TUTORIAL_STEPS.length}</span>
            <div class="flex gap-2">
                <button id="skip-tutorial-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm">Skip</button>
                <button id="next-tutorial-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">${currentTutorialStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}</button>
            </div>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    if (step.target) {
        const targetElement = document.querySelector(step.target);
        if (targetElement) {
            targetElement.classList.add('tutorial-highlight');
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    document.getElementById('next-tutorial-btn').addEventListener('click', nextTutorialStep);
    document.getElementById('skip-tutorial-btn').addEventListener('click', endTutorial);
}

function nextTutorialStep() {
    const currentStep = TUTORIAL_STEPS[currentTutorialStep];
    if (currentStep.target) {
        const targetElement = document.querySelector(currentStep.target);
        if (targetElement) targetElement.classList.remove('tutorial-highlight');
    }
    currentTutorialStep++;
    if (currentTutorialStep === 2) {
        renderMainView('store');
        setTimeout(showTutorialStep, 500);
    } else if (currentTutorialStep === 4) {
        renderMainView('collection');
        setTimeout(showTutorialStep, 500);
    } else showTutorialStep();
}

function endTutorial() {
    tutorialActive = false;
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.remove();
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    if (!gameState.settings) gameState.settings = {};
    gameState.settings.tutorialCompleted = true;
    
    // Restore pointer events on loupe modal when tutorial ends
    DOM.loupeModal.style.pointerEvents = '';
    
    logMessage("Tutorial completed! You're ready to start your journey.", "success");
    renderMainView('collection');
}

// Enhanced tooltip system
let currentTooltip = null;

function showCardTooltip(event) {
    const target = event.currentTarget;
    const tooltipContent = target.getAttribute('data-tooltip');
    
    if (!tooltipContent) return;
    
    // Remove existing tooltip
    hideCardTooltip();
    
    // Create new tooltip
    currentTooltip = document.createElement('div');
    currentTooltip.className = 'fixed z-[3000] bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-xl pointer-events-none';
    currentTooltip.style.maxWidth = '300px';
    currentTooltip.innerHTML = tooltipContent;
    
    document.body.appendChild(currentTooltip);
    
    // Position tooltip
    moveCardTooltip(event);
}

function hideCardTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}

function moveCardTooltip(event) {
    if (!currentTooltip) return;
    
    const tooltip = currentTooltip;
    const rect = tooltip.getBoundingClientRect();
    
    let x = event.clientX + 15;
    let y = event.clientY + 15;
    
    // Adjust position if tooltip goes off screen
    if (x + rect.width > window.innerWidth) {
        x = event.clientX - rect.width - 15;
    }
    if (y + rect.height > window.innerHeight) {
        y = event.clientY - rect.height - 15;
    }
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}
