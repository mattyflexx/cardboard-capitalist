// config.js

export const ASSET_PATH = 'assets/';

export const ASSETS = {
    frames: {
        standard: `${ASSET_PATH}frame_standard.png`,
        fullArt: `${ASSET_PATH}frame_fullart.png`
    },
    cardBack: `${ASSET_PATH}card_back.png`,
    evolutionChainBg: `${ASSET_PATH}evolution_chain_bg.png` // Optional background for evolution chain
};

export const LAYOUT_BLUEPRINTS = {
    standard: {
        // For the 16:9 artwork window at the top
        artWindow: { 
            x: 75,
            y: 75,
            width: 600,
            height: 338
        },
        // For the name slot in the middle
        name: { 
            x: 75, 
            y: 450,
            width: 600, 
            height: 60 
        },
        // For the lore slot at the bottom
        lore: { 
            x: 75, 
            y: 550,
            width: 600, 
            height: 200 
        },
        // New: Evolution chain position
        evolutionChain: {
            x: 75,
            y: 40, // Position at the top of the card
            width: 600,
            height: 30
        }
    },
    fullArt: {
        name: { x: 60, y: 900, width: 630, height: 60 },
        evolutionChain: { x: 60, y: 40, width: 630, height: 30 }
    },
    insertArt: {
        name: { x: 60, y: 60, width: 630, height: 60 },
        evolutionChain: { x: 60, y: 20, width: 630, height: 30 }
    }
};

export const TCG_SETS = {
    genesis: {
        name: "Genesis",
        code: "GS",
        release: { year: 1, day: 1 },
        pack: {
            price: 3.50,
            img: `${ASSET_PATH}pack_genesis.png`,
            cardsPerPack: 11
        },
        cards: [
            { id: "GS001", name: "Geobble", doodledexNum: 1, rarity: "Common", layout: "Standard", lore: "A small rock creature that rolls around collecting minerals." },
            { id: "GS002", name: "Petrisaur", doodledexNum: 2, rarity: "Uncommon", layout: "Standard", evolvesFrom: "GS001", lore: "Its rocky hide provides excellent protection from predators." },
            { id: "GS003", name: "Gemusaur", doodledexNum: 3, rarity: "Holo Rare", layout: "Standard", evolvesFrom: "GS002", lore: "Crystals grow from its back, becoming more brilliant with age." },
            { id: "GS004", name: "Bluemander", doodledexNum: 4, rarity: "Common", layout: "Standard", lore: "A small aquatic lizard that can breathe underwater through its frilled gills." },
            { id: "GS005", name: "Aquameleon", doodledexNum: 5, rarity: "Uncommon", layout: "Standard", evolvesFrom: "GS004", lore: "It can change color to match its surroundings in water." },
            { id: "GS006", name: "Royalzard", doodledexNum: 6, rarity: "Holo Rare", layout: "Standard", evolvesFrom: "GS005", lore: "The crown-like fin on its head signifies its status as king of the lake." },
            { id: "GS007", name: "Cindertle", doodledexNum: 7, rarity: "Common", layout: "Standard", lore: "Its shell contains a small ember that keeps it warm." },
            { id: "GS008", name: "Magmortle", doodledexNum: 8, rarity: "Uncommon", layout: "Standard", evolvesFrom: "GS007", lore: "Lava flows through the cracks in its hardened shell." },
            { id: "GS009", name: "Volcantoise", doodledexNum: 9, rarity: "Holo Rare", layout: "Standard", evolvesFrom: "GS008", lore: "The volcano on its back erupts when it feels threatened." },
            { id: "GS010", name: "Gearpie", doodledexNum: 10, rarity: "Common", layout: "Standard", lore: "A mechanical bird that winds itself up by flying in circles." },
            { id: "GS011", name: "Servopod", doodledexNum: 11, rarity: "Uncommon", layout: "Standard", evolvesFrom: "GS010", lore: "Its legs are powered by tiny motors that never seem to run out of energy." },
            { id: "GS012", name: "Flutterdrive", doodledexNum: 12, rarity: "Holo Rare", layout: "Standard", evolvesFrom: "GS011", lore: "The propellers on its wings allow it to hover perfectly still in the air." },
            { id: "GS013", name: "Fledgey", doodledexNum: 13, rarity: "Common", layout: "Standard", lore: "A tiny bird that glows faintly in the dark." },
            { id: "GS014", name: "Phantotto", doodledexNum: 14, rarity: "Uncommon", layout: "Standard", evolvesFrom: "GS013", lore: "It can pass through solid objects by temporarily becoming ghostly." },
            { id: "GS015", name: "Ectogeot", doodledexNum: 15, rarity: "Holo Rare", layout: "Standard", evolvesFrom: "GS014", lore: "Legend says it can fly between the world of the living and the dead." },
            { id: "GS016", name: "Richata", doodledexNum: 16, rarity: "Common", layout: "Standard", lore: "It collects shiny objects to decorate its fur." },
            { id: "GS017", name: "Gildedcate", doodledexNum: 17, rarity: "Uncommon", layout: "Standard", evolvesFrom: "GS016", lore: "The golden spots on its coat are actually made of real gold." },
            { id: "GS018", name: "Snare", doodledexNum: 18, rarity: "Common", layout: "Standard", lore: "A small snake that can mimic the sounds of other creatures." },
            { id: "GS019", name: "Kobraiv", doodledexNum: 19, rarity: "Holo Rare", layout: "Standard", evolvesFrom: "GS018", lore: "The patterns on its hood hypnotize its prey." },
            { id: "GS020", name: "Lunachu", doodledexNum: 20, rarity: "Chase", layout: "Full-Art", lore: "A rare creature that only appears under the full moon." },
            { id: "GS-AA1", name: "Geobble", doodledexNum: 1, rarity: "Alternate Art", layout: "Full-Art", lore: "A small rock creature that rolls around collecting minerals." },
            { id: "GS-AA2", name: "Bluemander", doodledexNum: 4, rarity: "Alternate Art", layout: "Full-Art", lore: "A small aquatic lizard that can breathe underwater through its frilled gills." },
            { id: "GS-IA1", name: "Doodlemon TCG", doodledexNum: 0, rarity: "Insert Art", layout: "Insert-Art", lore: "Special promotional card for the Doodlemon TCG." },
            { id: "GS032", name: "Sparkitty", doodledexNum: 32, rarity: "Common", layout: "Standard", lore: "Static electricity makes its fur stand on end." }
        ]
    }
};

// Custom Doodlemon management
export function loadCustomDoodlemon() {
    try {
        const customData = localStorage.getItem('customDoodlemon');
        return customData ? JSON.parse(customData) : {};
    } catch (error) {
        console.error('Error loading custom Doodlemon:', error);
        return {};
    }
}

// This map is no longer needed because paths are generated automatically.
export const DOODLEMON_ART = {};

export function getAllDoodlemonForGame() {
    const customDoodlemon = loadCustomDoodlemon();
    const result = {};
    
    // Create a combined map with both default and custom Doodlemon
    // Default Doodlemon from cards
    TCG_SETS.genesis.cards.forEach(card => {
        if (!result[card.doodledexNum]) {
            result[card.doodledexNum] = { name: card.name, img: card.img };
        }
    });
    
    // Add custom Doodlemon
    Object.entries(customDoodlemon).forEach(([id, data]) => {
        const paddedDexNum = String(id).padStart(3, '0');
        const formattedName = data.name.toLowerCase().replace(/\s+/g, '-');
        result[id] = {
            name: data.name,
            img: `${ASSET_PATH}${paddedDexNum}-${formattedName}.png`,
            isCustom: true
        };
    });
    
    return result;
}

// New function to build evolution chains
export function buildEvolutionChain(cardId) {
    const chain = [];
    let currentCard = TCG_SETS.genesis.cards.find(card => card.id === cardId);
    
    if (!currentCard) return chain;
    
    // Find all previous evolutions
    let preEvoCard = currentCard;
    while (preEvoCard && preEvoCard.evolvesFrom) {
        const preEvo = TCG_SETS.genesis.cards.find(card => card.id === preEvoCard.evolvesFrom);
        if (preEvo) {
            chain.unshift(preEvo); // Add to beginning of array
            preEvoCard = preEvo;
        } else {
            break;
        }
    }
    
    // Add the current card
    chain.push(currentCard);
    
    // Find all future evolutions (cards that evolve from this one)
    const findNextEvolutions = (card) => {
        const nextEvos = TCG_SETS.genesis.cards.filter(c => c.evolvesFrom === card.id);
        nextEvos.forEach(evo => {
            chain.push(evo);
            // Recursively find evolutions of this evolution
            findNextEvolutions(evo);
        });
    };
    
    findNextEvolutions(currentCard);
    
    return chain;
}
