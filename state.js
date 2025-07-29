export let gameState = {
    player: {
        cash: 50.00,
        netWorth: 50.00,
        collection: {},
        sealedInventory: {
            genesis: 0
        },
        supplies: { sleeves: 100, toploaders: 50 },
    },
    date: { year: 1, day: 1 },
    ui: { currentView: 'collection' },
    market: { events: [] },
    gradingQueue: [],
    achievements: {}, // Initialize achievements object
};

export function updateGameState(newState) {
    Object.assign(gameState, newState);
}

export const MARKET_TRENDS = {
  STABLE: 'stable',
  RISING: 'rising', 
  FALLING: 'falling',
  SPIKING: 'spiking',
  CRASHING: 'crashing'
};

export const CARD_CONDITIONS = {
  MINT: { name: "Mint", value: 1.0, chance: 0.2 },
  NEAR_MINT: { name: "Near Mint", value: 0.9, chance: 0.5 },
  EXCELLENT: { name: "Excellent", value: 0.7, chance: 0.2 },
  GOOD: { name: "Good", value: 0.5, chance: 0.08 },
  POOR: { name: "Poor", value: 0.3, chance: 0.02 }
};

export const ACHIEVEMENTS = {
  COLLECTOR_BEGINNER: { 
    id: 'collector_beginner', 
    name: 'Beginner Collector', 
    description: 'Collect 10 different cards',
    requirement: state => Object.keys(state.player.collection).length >= 10,
    reward: { cash: 5 },
    unlocked: false
  },
  COLLECTOR_INTERMEDIATE: { 
    id: 'collector_intermediate', 
    name: 'Intermediate Collector', 
    description: 'Collect 25 different cards',
    requirement: state => Object.keys(state.player.collection).length >= 25,
    reward: { cash: 15 },
    unlocked: false
  },
  FIRST_HOLO: { 
    id: 'first_holo', 
    name: 'First Holo', 
    description: 'Collect your first Holo Rare card',
    requirement: state => Object.values(state.player.collection).some(card => card.cardInfo.rarity === 'Holo Rare'),
    reward: { cash: 10 },
    unlocked: false
  },
  CHASE_HUNTER: { 
    id: 'chase_hunter', 
    name: 'Chase Hunter', 
    description: 'Collect a Chase rarity card',
    requirement: state => Object.values(state.player.collection).some(card => card.cardInfo.rarity === 'Chase'),
    reward: { cash: 25 },
    unlocked: false
  }
};


export function calculateNetWorth() {
    let totalValue = gameState.player.cash;
    
    Object.values(gameState.player.collection).forEach(cardData => {
        const baseValue = getCardBaseValue(cardData.cardInfo);
        totalValue += baseValue * cardData.instances.length;
    });
    
    Object.entries(gameState.player.sealedInventory).forEach(([setName, count]) => {
        const packPrice = getPackPrice(setName);
        totalValue += packPrice * count;
    });
    
    gameState.player.netWorth = totalValue;
    return totalValue;
}

export function getCardBaseValue(cardInfo) {
    const rarityValues = {
        'Common': 0.25,
        'Uncommon': 0.75,
        'Holo Rare': 3.00,
        'Alternate Art': 15.00,
        'Chase': 50.00
    };
    return rarityValues[cardInfo.rarity] || 0.10;
}

export function getPackPrice(setName) {
    const packPrices = {
        'genesis': 3.50
    };
    return packPrices[setName] || 3.00;
}

export function updateMarket() {
  const possibleEvents = [
    { name: "New Set Announcement", effect: "The announcement of a new set has caused some older cards to increase in value.", 
      affectedRarities: ['Holo Rare', 'Alternate Art'], multiplier: 1.2 },
    { name: "Tournament Results", effect: "Recent tournament results have highlighted certain Doodlemon, increasing their popularity.", 
      affectedDoodlemon: [6, 19, 31], multiplier: 1.5 },
    { name: "Overprinting Rumors", effect: "Rumors of overprinting have caused some card values to drop.", 
      affectedRarities: ['Common', 'Uncommon'], multiplier: 0.8 },
    { name: "Collector Hype", effect: "Social media buzz has created high demand for chase cards.", 
      affectedRarities: ['Chase'], multiplier: 2.0 },
  ];
  
  if (Math.random() < 0.2) {
    const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
    gameState.market.events.push({
      ...event,
      day: gameState.date.day,
      year: gameState.date.year,
      expires: gameState.date.day + Math.floor(Math.random() * 5) + 3
    });
    
    return event;
  }
  
  return null;
}

export function getCardValue(cardInfo, instance) {
  let baseValue = getCardBaseValue(cardInfo);
  
  gameState.market.events.forEach(event => {
    if (event.affectedRarities && event.affectedRarities.includes(cardInfo.rarity)) {
      baseValue *= event.multiplier;
    }
    if (event.affectedDoodlemon && event.affectedDoodlemon.includes(cardInfo.doodledexNum)) {
      baseValue *= event.multiplier;
    }
  });
  
  if (instance) {
    const conditionObj = Object.values(CARD_CONDITIONS).find(c => c.name === instance.condition);
    if (conditionObj) {
      baseValue *= conditionObj.value;
    }
  }
  
  return baseValue;
}

export function determineCardCondition() {
  const rand = Math.random();
  let cumulativeChance = 0;
  
  for (const condition of Object.values(CARD_CONDITIONS)) {
    cumulativeChance += condition.chance;
    if (rand <= cumulativeChance) {
      return condition.name;
    }
  }
  
  return CARD_CONDITIONS.NEAR_MINT.name;
}

export function initializeStats() {
  if (!gameState.stats) {
    gameState.stats = {
      packsOpened: 0,
      cardsAcquired: 0,
      cardsSold: 0,
      totalEarned: 0,
      totalSpent: 0,
      daysPlayed: 0,
      highestValueCard: { name: "None", value: 0 },
      marketEvents: 0,
      achievementsUnlocked: 0
    };
  }
}

export function updateStats(key, value) {
  initializeStats();
  
  if (typeof value === 'number' && gameState.stats[key] !== undefined) {
    gameState.stats[key] += value;
  } else {
    gameState.stats[key] = value;
  }
}