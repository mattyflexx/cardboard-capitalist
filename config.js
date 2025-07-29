// config.js

const ASSET_PATH = 'assets/';

export const ASSETS = {
    cardBack: 'https://i.imgur.com/ZVGjcFD.png',
    frames: {
        standard: `${ASSET_PATH}frame_standard.png`,
        fullArt: `${ASSET_PATH}frame_fullart.png`
    }
};

export const LAYOUT_BLUEPRINTS = {
    standard: {
        name: { x: 227, y: 495, width: 301, height: 62 },
        lore: { x: 65, y: 619, width: 625, height: 220 }
    },
    fullArt: {
        name: { x: 75, y: 880, width: 600, height: 55 }
    },
    insertArt: {
        name: { x: 75, y: 900, width: 600, height: 80 },
        logo: { x: 600, y: 950, width: 120, height: 80 }
    }
};

function processSet(cardSet) {
    cardSet.cards.forEach(card => {
        const isFullArt = ['Alternate Art', 'Chase'].includes(card.rarity);
        const isInsertArt = card.rarity === 'Insert Art' || card.isInsertArt;
        if (isInsertArt) card.layout = 'Insert-Art';
        else if (isFullArt) card.layout = 'Full-Art';
        else card.layout = 'Standard';
    });
    return cardSet;
}

const rawGenesisSet = {
    name: "Genesis",
    pack: { price: 3.50, img: `${ASSET_PATH}pack_genesis.png` },
    cards: [
        // Common Cards (img path will be generated automatically in main.js)
        { id: 'GS001', name: 'Geobble', doodledexNum: 1, rarity: 'Common', lore: 'A small rock creature that feeds on minerals and gems found deep underground.' },
        { id: 'GS002', name: 'Bluemander', doodledexNum: 4, rarity: 'Common', lore: 'This aquatic salamander can breathe underwater and on land with equal ease.' },
        { id: 'GS003', name: 'Cindertle', doodledexNum: 7, rarity: 'Common', lore: 'Its shell smolders with inner fire, providing warmth in the coldest climates.' },
        { id: 'GS004', name: 'Gearpie', doodledexNum: 10, rarity: 'Common', lore: 'A mechanical bird that builds intricate nests from discarded metal scraps.' },
        { id: 'GS005', name: 'Fledgey', doodledexNum: 13, rarity: 'Common', lore: 'Though small, its wings beat with surprising strength and determination.' },
        { id: 'GS006', name: 'Richata', doodledexNum: 16, rarity: 'Common', lore: 'This golden mouse hoards shiny objects in elaborate underground vaults.' },
        { id: 'GS007', name: 'Snare', doodledexNum: 18, rarity: 'Common', lore: 'It weaves invisible traps from moonlight that ensnare unwary travelers.' },
        { id: 'GS008', name: 'Tideti', doodledexNum: 22, rarity: 'Common', lore: 'Its tentacles can sense the slightest vibrations in water from great distances.' },
        { id: 'GS009', name: 'Pilferix', doodledexNum: 24, rarity: 'Common', lore: 'A mischievous creature known for stealing socks and hiding them in trees.' },
        { id: 'GS010', name: 'Frostpix', doodledexNum: 26, rarity: 'Common', lore: 'Its breath can freeze water instantly, creating beautiful ice sculptures.' },
        { id: 'GS011', name: 'Jigglygruff', doodledexNum: 28, rarity: 'Common', lore: 'Its bouncy body allows it to leap incredible heights with perfect precision.' },
        { id: 'GS012', name: 'Sporedish', doodledexNum: 30, rarity: 'Common', lore: 'Releases healing spores that can cure minor ailments and boost energy.' },
        { id: 'GS013', name: 'Dustbun', doodledexNum: 33, rarity: 'Common', lore: 'This desert dweller can survive months without water by storing it in its fluffy tail.' },
        { id: 'GS014', name: 'Scraps', doodledexNum: 35, rarity: 'Common', lore: 'Built from discarded materials, it constantly rebuilds itself with new parts.' },
        { id: 'GS015', name: 'Psiquack', doodledexNum: 37, rarity: 'Common', lore: 'Its psychic quacks can predict weather patterns up to a week in advance.' },
        { id: 'GS016', name: 'Zenkey', doodledexNum: 39, rarity: 'Common', lore: 'Achieves perfect balance through meditation, able to stand on the tiniest surfaces.' },
        { id: 'GS017', name: 'Brawna', doodledexNum: 41, rarity: 'Common', lore: 'Despite its small size, it can lift objects ten times its own weight.' },
        { id: 'GS018', name: 'Boltsprout', doodledexNum: 44, rarity: 'Common', lore: 'Grows rapidly during thunderstorms, absorbing electrical energy through its leaves.' },

        // Uncommon Cards
        { id: 'GS019', name: 'Petrisaur', doodledexNum: 2, rarity: 'Uncommon', lore: 'Its rocky hide becomes harder with age, eventually becoming nearly indestructible.' },
        { id: 'GS020', name: 'Aquameleon', doodledexNum: 5, rarity: 'Uncommon', lore: 'Can change its color to match any aquatic environment with perfect camouflage.' },
        { id: 'GS021', name: 'Magmortle', doodledexNum: 8, rarity: 'Uncommon', lore: 'Its shell contains molten rock that it can launch as projectiles when threatened.' },
        { id: 'GS022', name: 'Servopod', doodledexNum: 11, rarity: 'Uncommon', lore: 'This advanced mechanical creature can repair other machines with its built-in tools.' },
        { id: 'GS023', name: 'Phantotto', doodledexNum: 14, rarity: 'Uncommon', lore: 'Phases between dimensions, appearing as a ghostly blur to most observers.' },
        { id: 'GS024', name: 'Somnchu', doodledexNum: 21, rarity: 'Uncommon', lore: 'Its gentle humming can lull even the most restless creatures into peaceful sleep.' },
        { id: 'GS025', name: 'Strobeshroom', doodledexNum: 31, rarity: 'Uncommon', lore: 'Flashes brilliant colors to communicate with others of its kind across vast distances.' },
        { id: 'GS026', name: 'Brawlabra', doodledexNum: 42, rarity: 'Uncommon', lore: 'Uses its multiple arms to perform complex martial arts techniques with fluid grace.' },
        { id: 'GS027', name: 'Ringinbell', doodledexNum: 45, rarity: 'Uncommon', lore: 'Its melodious chimes can heal emotional wounds and restore inner peace.' },
        { id: 'GS028', name: 'Quixilver', doodledexNum: 47, rarity: 'Uncommon', lore: 'This liquid metal creature can reshape itself into any form it can imagine.' },
        { id: 'GS029', name: 'Tangler', doodledexNum: 51, rarity: 'Uncommon', lore: 'Its vines grow at incredible speed, creating living mazes that shift and change.' },
        { id: 'GS030', name: 'Ponysea', doodledexNum: 53, rarity: 'Uncommon', lore: 'Gallops across ocean waves as easily as solid ground, leaving trails of sea foam.' },

        // Holo Rare Cards
        { id: 'GS031', name: 'Gemusaur', doodledexNum: 3, rarity: 'Holo Rare', lore: 'Precious gems grow along its spine, each one containing concentrated earth energy.' },
        { id: 'GS032', name: 'Royalzard', doodledexNum: 6, rarity: 'Holo Rare', lore: 'Its crown-like fins can sense the shifting of ocean currents from miles away.' },
        { id: 'GS033', name: 'Volcanstoise', doodledexNum: 9, rarity: 'Holo Rare', lore: 'The volcano on its back erupts with controlled precision, creating new islands.' },
        { id: 'GS034', name: 'Flutterdrive', doodledexNum: 12, rarity: 'Holo Rare', lore: 'Its wings generate electromagnetic fields that allow it to fly at supersonic speeds.' },
        { id: 'GS035', name: 'Ectogeot', doodledexNum: 15, rarity: 'Holo Rare', lore: 'Commands legions of spirits, serving as a bridge between the living and spectral realms.' },
        { id: 'GS036', name: 'Gildedcate', doodledexNum: 17, rarity: 'Holo Rare', lore: 'Everything it touches turns to gold, though the effect fades after exactly one hour.' },
        { id: 'GS037', name: 'Kobraiv', doodledexNum: 19, rarity: 'Holo Rare', lore: 'Strikes with lightning speed, its venomous fangs can paralyze even the largest foes.' },
        { id: 'GS038', name: 'Lunachu', doodledexNum: 20, rarity: 'Holo Rare', lore: 'Draws power from moonlight, becoming stronger during each phase of the lunar cycle.' },
        { id: 'GS039', name: 'Grominable', doodledexNum: 23, rarity: 'Holo Rare', lore: 'This abominable snowman creates blizzards wherever it walks, reshaping entire landscapes.' },
        { id: 'GS040', name: 'Swipixie', doodledexNum: 25, rarity: 'Holo Rare', lore: 'Moves so quickly it appears to be in multiple places at once, confusing all who observe it.' },

        // Special Cards (Alternate Arts & Chases) with explicit 'img' paths
        { id: 'GS-AA1', name: 'Royalzard', doodledexNum: 6, rarity: 'Alternate Art', img: `${ASSET_PATH}GS-AA1.png`, lore: 'A majestic variant with enhanced psychic abilities and crystalline scales.' },
        { id: 'GS-AA2', name: 'Strobeshroom', doodledexNum: 31, rarity: 'Alternate Art', img: `${ASSET_PATH}GS-AA2.png`, lore: 'This rare variant pulses with hypnotic patterns that can entrance entire forests.' },
        { id: 'GS-AA3', name: 'Kobraiv', doodledexNum: 19, rarity: 'Alternate Art', img: `${ASSET_PATH}GS-AA3.png`, lore: 'An ancient form with scales that shimmer like precious metals in sunlight.' },
        { id: 'GS-AA4', name: 'Dustbun', doodledexNum: 33, rarity: 'Alternate Art', img: `${ASSET_PATH}GS-AA4.png`, lore: 'A mystical desert sage variant that can create mirages and sandstorm illusions.' },
        { id: 'GS-AA5', name: 'Plauros', doodledexNum: 64, rarity: 'Alternate Art', img: `${ASSET_PATH}GS-AA5.png`, lore: 'This legendary beast commands respect from all who witness its terrible majesty.' },
        { id: 'GS-AA6', name: 'Flickerite', doodledexNum: 58, rarity: 'Alternate Art', img: `${ASSET_PATH}GS-AA6.png`, lore: 'Phases rapidly between dimensions, existing in multiple realities simultaneously.' },
        { id: 'GS-CH1', name: 'Shiny Geobble', doodledexNum: 1, rarity: 'Chase', img: `${ASSET_PATH}GS-CH1.png`, lore: 'An incredibly rare golden variant that sparkles with inner light and grants good fortune.' },
        { id: 'GS-CH2', name: 'Van Gogh Lunachu', doodledexNum: 20, rarity: 'Chase', img: `${ASSET_PATH}GS-CH2.png`, lore: 'Painted in swirling cosmic colors, this artistic variant creates beautiful auroras in the night sky.' },
        { id: 'GS-CH3', name: 'Glitchra', doodledexNum: 87, rarity: 'Chase', img: `${ASSET_PATH}GS-CH3.png`, lore: 'A digital anomaly that exists between code and reality, constantly shifting between forms.' },
        { id: 'GS-CH4', name: 'Kaleidocat', doodledexNum: 86, rarity: 'Chase', img: `${ASSET_PATH}GS-CH4.png`, lore: 'Its fur displays an ever-changing pattern of colors that mesmerizes all who gaze upon it.' },

        // Insert Art Test Card
        { id: 'GS-IA1', name: 'Holographic Geobble', doodledexNum: 1, rarity: 'Insert Art', img: `${ASSET_PATH}001-geobble.png`, isInsertArt: true, lore: 'A special holographic variant with rainbow energy flowing through its rocky exterior.' },

        // Additional Doodlemon entries
        { id: 'GS051', name: 'Gumdrop', doodledexNum: 88, rarity: 'Common', lore: 'A sweet and bouncy creature that secretes colorful candy coating for protection.' },
        { id: 'GS052', name: 'Gumbrawl', doodledexNum: 89, rarity: 'Uncommon', lore: 'Its sticky exterior can trap opponents while delivering powerful stretchy punches.' },
        { id: 'GS053', name: 'Jawbreaker', doodledexNum: 90, rarity: 'Holo Rare', lore: 'Its incredibly hard shell can withstand tremendous impacts and pressures.' },
        { id: 'GS054', name: 'Nimbulb', doodledexNum: 91, rarity: 'Common', lore: 'This floating bulb generates small clouds that rain refreshing droplets below.' },
        { id: 'GS055', name: 'Cumulonimbus', doodledexNum: 92, rarity: 'Holo Rare', lore: 'Commands massive storm systems and can summon lightning at will.' },
        { id: 'GS056', name: 'Patchling', doodledexNum: 93, rarity: 'Common', lore: 'Made from discarded fabric scraps, it stitches itself back together when damaged.' },
        { id: 'GS057', name: 'Haydread', doodledexNum: 94, rarity: 'Uncommon', lore: 'This haunted scarecrow feeds on the fears of those who wander too close.' },
        { id: 'GS058', name: 'Fearcrow', doodledexNum: 95, rarity: 'Holo Rare', lore: 'Its piercing gaze can paralyze enemies with overwhelming terror and dread.' },
        { id: 'GS059', name: 'Slugger', doodledexNum: 96, rarity: 'Common', lore: 'This slow-moving mollusk packs a surprisingly powerful punch in its shell.' },
        { id: 'GS060', name: 'Escargot', doodledexNum: 97, rarity: 'Uncommon', lore: 'A refined gastropod that moves with elegance despite its leisurely pace.' },
        { id: 'GS061', name: 'Snailstrom', doodledexNum: 98, rarity: 'Holo Rare', lore: 'Creates whirlpools of slime that can transport allies across great distances.' },
        { id: 'GS062', name: 'Radot', doodledexNum: 103, rarity: 'Common', lore: 'This small robotic creature emits helpful scanning beams to analyze surroundings.' },
        { id: 'GS063', name: 'Vortexar', doodledexNum: 104, rarity: 'Uncommon', lore: 'Spins at incredible speeds to create powerful whirlwinds and tornadoes.' },
        { id: 'GS064', name: 'Dopplereign', doodledexNum: 105, rarity: 'Holo Rare', lore: 'Can create perfect duplicates of itself to confuse and overwhelm opponents.' },
        { id: 'GS065', name: 'Aervane', doodledexNum: 106, rarity: 'Uncommon', lore: 'Its weathervane tail always points toward incoming storms and changes in weather.' }
    ]
};

export const TCG_SETS = {
    genesis: processSet(rawGenesisSet)
};

export function getAllDoodlemonForGame() {
    const result = {};
    TCG_SETS.genesis.cards.forEach(card => {
        if (!result[card.doodledexNum]) {
            result[card.doodledexNum] = { name: card.name, img: card.img };
        }
    });
    return result;
}
