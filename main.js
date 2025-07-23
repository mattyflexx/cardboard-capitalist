import { TCG_SETS, ASSETS, LAYOUT_BLUEPRINTS } from './config.js';
import { gameState, updateGameState, calculateNetWorth, getCardValue, determineCardCondition, updateMarket, initializeStats, updateStats, ACHIEVEMENTS, CARD_CONDITIONS } from './state.js';

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
    blueprintModeBtn: document.getElementById('blueprint-mode-btn'),
    navContainer: document.getElementById('main-nav'),
    nextDayBtn: document.getElementById('next-day-btn'),
};

let tutorialActive = false;
let currentTutorialStep = 0;

const ASSET_PATH = 'assets/';

function initializeGame() {
    console.log("Game is initializing...");
    
    // Generate image paths for all standard cards.
    TCG_SETS.genesis.cards.forEach(card => {
        if (!card.img) {
            const paddedDexNum = String(card.doodledexNum).padStart(3, '0');
            
            // Convert the card name to lowercase and replace spaces with hyphens to match filenames.
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
        logMessage("Welcome to Cardboard Capitalist! Your trading card journey begins now.", "system");
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
    DOM.mainView.classList.remove('blueprint-mode-active');
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
        case 'blueprint':
            DOM.viewTitle.textContent = 'Blueprint Mode';
            DOM.mainView.classList.add('blueprint-mode-active');
            renderBlueprintView(DOM.mainView);
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
                renderPackOpeningView(DOM.mainView, gameState.ui.selectedPack);
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
  grid.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4';
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

function renderDoodleDexView(container) {
    const dexDiv = document.createElement('div');
    dexDiv.className = 'space-y-4';
    
    const ownedDoodlemon = new Set();
    const allDoodlemon = {};

    TCG_SETS.genesis.cards.forEach(card => {
        if (!allDoodlemon[card.doodledexNum]) {
            allDoodlemon[card.doodledexNum] = { name: card.name, img: card.img };
        }
    });

    Object.values(gameState.player.collection).forEach(cardData => {
        ownedDoodlemon.add(cardData.cardInfo.doodledexNum);
    });
    
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4';
    
    Object.keys(allDoodlemon).sort((a,b) => a - b).forEach(doodledexNum => {
        const dexEntry = document.createElement('div');
        dexEntry.className = 'bg-gray-800 p-4 rounded-lg text-center';
        
        const isOwned = ownedDoodlemon.has(parseInt(doodledexNum));
        const artUrl = allDoodlemon[doodledexNum].img;
        
        dexEntry.innerHTML = `
            <div class="aspect-square bg-gray-700 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                ${isOwned && artUrl ? 
                    `<img src="${artUrl}" alt="${allDoodlemon[doodledexNum].name}" class="w-full h-full object-contain">` :
                    `<span class="text-gray-500 text-2xl">?</span>`
                }
            </div>
            <p class="text-sm ${isOwned ? 'text-white' : 'text-gray-500'}">#${String(doodledexNum).padStart(3, '0')}</p>
            <p class="text-xs ${isOwned ? 'text-gray-300' : 'text-gray-600'}">${isOwned ? allDoodlemon[doodledexNum].name : 'Unknown'}</p>
        `;
        
        grid.appendChild(dexEntry);
    });
    
    dexDiv.innerHTML = `<h3 class="text-lg font-bold text-white mb-4">Discovered: ${ownedDoodlemon.size}/${Object.keys(allDoodlemon).length}</h3>`;
    dexDiv.appendChild(grid);
    container.appendChild(dexDiv);
}


function renderBlueprintView(container) {
    container.innerHTML = `
        <div class="flex flex-col items-center gap-4">
            <div id="blueprint-canvas-wrapper">
                <canvas id="blueprint-canvas" width="750" height="1050"></canvas>
                <div id="blueprint-selection-box" class="hidden"></div>
            </div>
            <div class="flex gap-4">
                 <button id="bp-standard-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Load Standard Frame</button>
                 <button id="bp-fullart-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Load Full-Art Frame</button>
            </div>
        </div>
        <div id="blueprint-info-box">X: 0, Y: 0</div>
    `;

    const canvas = document.getElementById('blueprint-canvas');
    const ctx = canvas.getContext('2d');
    const infoBox = document.getElementById('blueprint-info-box');
    const selectionBox = document.getElementById('blueprint-selection-box');
    
    let currentFrame = new Image();
    currentFrame.crossOrigin = "Anonymous";

    function loadFrame(frameUrl) {
        currentFrame.src = frameUrl;
        currentFrame.onload = () => ctx.drawImage(currentFrame, 0, 0, 750, 1050);
    }

    loadFrame(ASSETS.frames.standard);

    document.getElementById('bp-standard-btn').addEventListener('click', () => loadFrame(ASSETS.frames.standard));
    document.getElementById('bp-fullart-btn').addEventListener('click', () => loadFrame(ASSETS.frames.fullArt));

    let isDrawing = false;
    let startX, startY;

    canvas.addEventListener('mousedown', e => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        isDrawing = true;
        startX = (e.clientX - rect.left) * scaleX;
        startY = (e.clientY - rect.top) * scaleY;
        
        selectionBox.style.left = `${e.clientX - rect.left}px`;
        selectionBox.style.top = `${e.clientY - rect.top}px`;
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.classList.remove('hidden');
    });

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.round((e.clientX - rect.left) * scaleX);
        const y = Math.round((e.clientY - rect.top) * scaleY);
        infoBox.textContent = `X: ${x}, Y: ${y}`;

        if (isDrawing) {
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            const startRectX = startX / scaleX;
            const startRectY = startY / scaleY;
            selectionBox.style.width = `${currentX - startRectX}px`;
            selectionBox.style.height = `${currentY - startRectY}px`;
        }
    });

    canvas.addEventListener('mouseup', e => {
        if (!isDrawing) return;
        isDrawing = false;
        selectionBox.classList.add('hidden');
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const finalEndX = (e.clientX - rect.left) * scaleX;
        const finalEndY = (e.clientY - rect.top) * scaleY;

        const finalRect = {
            x: Math.round(Math.min(startX, finalEndX)),
            y: Math.round(Math.min(startY, finalEndY)),
            width: Math.abs(Math.round(finalEndX - startX)),
            height: Math.abs(Math.round(finalEndY - startY))
        };
        console.log(`Blueprint Box: { x: ${finalRect.x}, y: ${finalRect.y}, width: ${finalRect.width}, height: ${finalRect.height} }`);
        logMessage(`Box: x:${finalRect.x} y:${finalRect.y} w:${finalRect.width} h:${finalRect.height}`, "success");
    });
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

    const artImg = document.createElement('img');
    artImg.src = cardInfo.img || `${ASSET_PATH}fallback.png`; // Fallback to a local asset
    artImg.alt = cardInfo.name;
    artImg.className = 'card-art';
    artImg.onerror = function() {
        this.onerror=null; // Prevent infinite loops
        this.src = `${ASSET_PATH}fallback.png`; // A generic fallback image
    };
    cardElement.appendChild(artImg);

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

    const inspectOverlay = document.createElement('div');
    inspectOverlay.className = 'card-inspect-overlay';
    cardElement.appendChild(inspectOverlay);
    
    return cardElement;
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
            if (achievement.reward?.cash) logMessage(`Reward: $${achievement.reward.cash} added to your account`, "success");
            if (achievement.reward?.supplies) Object.entries(achievement.reward.supplies).forEach(([item, amount]) => logMessage(`Reward: ${amount} ${item} added to your supplies`, "success"));
        });
    }
    
    if (gameState.settings?.autoSave) saveGame();
    
    calculateNetWorth();
    updateUI();
}

function processMarketEvents() {
    gameState.market.events = gameState.market.events.filter(event => !(event.year === gameState.date.year && event.expires <= gameState.date.day));
    gameState.market.events.forEach(event => {
        if (event.year === gameState.date.year && event.expires === gameState.date.day + 1) {
            logMessage(`Market event "${event.name}" is ending tomorrow.`, "info");
        }
    });
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
    DOM.mainView.addEventListener('click', e => {
        const overlay = e.target.closest('.card-inspect-overlay');
        if (overlay) {
            const cardContainer = overlay.closest('.card-container');
            if (tutorialActive) openLoupeView(cardContainer.dataset.cardId, cardContainer.dataset.instanceUid);
            else {
                if (e.ctrlKey || e.button === 2) {
                    gameState.ui.selectedCard = { cardId: cardContainer.dataset.cardId, instanceUid: cardContainer.dataset.instanceUid };
                    renderMainView('card-management');
                } else openLoupeView(cardContainer.dataset.cardId, cardContainer.dataset.instanceUid);
            }
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
    
    DOM.blueprintModeBtn.addEventListener('click', () => renderMainView('blueprint'));
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
        { id: 'achievements', label: 'Achievements', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
        { id: 'stats', label: 'Stats', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
    ];
    navItems.forEach(item => {
        const button = document.createElement('button');
        button.className = `w-full text-left bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2 ${gameState.ui.currentView === item.id ? 'bg-gray-700' : ''}`;
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}" /></svg><span>${item.label}</span>`;
        button.addEventListener('click', () => renderMainView(item.id));
        DOM.navContainer.appendChild(button);
    });
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
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    
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
    logMessage("Tutorial completed! You're ready to start your journey.", "success");
    renderMainView('collection');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}
