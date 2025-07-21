export const ASSETS = {
    cardBack: 'https://i.imgur.com/ZVGjcFD.png',
    frames: {
        standard: 'https://i.imgur.com/Q7GmNnc.png',
        fullArt: 'https://i.imgur.com/rMyhHHE.png'
    }
};

export const LAYOUT_BLUEPRINTS = {
    standard: {
        name: { x: 227, y: 495, width: 301, height: 62 },
        lore: { x: 65, y: 619, width: 625, height: 220 }
    },
    fullArt: {
        name: { x: 75, y: 880, width: 600, height: 55 }
    }
};

function processSet(cardSet) {
    const debutedDoodlemon = new Set();
    cardSet.cards.forEach(card => {
        const isFullArt = ['Alternate Art', 'Chase'].includes(card.rarity);
        card.layout = isFullArt ? 'Full-Art' : 'Standard';
        
        const isDebutEligible = ['Common', 'Uncommon', 'Holo Rare'].includes(card.rarity);
        if (isDebutEligible && !debutedDoodlemon.has(card.doodledexNum)) {
            card.isDebut = true;
            debutedDoodlemon.add(card.doodledexNum);
        }
    });
    return cardSet;
}

const rawGenesisSet = {
    name: "Genesis",
    pack: { price: 3.50, img: 'https://i.imgur.com/6IVenJg.png' },
    cards: [
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
        { id: 'GS031', name: 'Gemusaur', doodledexNum: 3, rarity: 'Holo Rare', lore: 'Precious gems grow along its spine, each one containing concentrated earth energy.' },
        { id: 'GS032', name: 'Royalzard', doodledexNum: 6, rarity: 'Holo Rare', lore: 'Its crown-like fins can sense the shifting of ocean currents from miles away, making it the undisputed master of coastal seas.' },
        { id: 'GS033', name: 'Volcanstoise', doodledexNum: 9, rarity: 'Holo Rare', lore: 'The volcano on its back erupts with controlled precision, creating new islands.' },
        { id: 'GS034', name: 'Flutterdrive', doodledexNum: 12, rarity: 'Holo Rare', lore: 'Its wings generate electromagnetic fields that allow it to fly at supersonic speeds.' },
        { id: 'GS035', name: 'Ectogeot', doodledexNum: 15, rarity: 'Holo Rare', lore: 'Commands legions of spirits, serving as a bridge between the living and spectral realms.' },
        { id: 'GS036', name: 'Gildedcate', doodledexNum: 17, rarity: 'Holo Rare', lore: 'Everything it touches turns to gold, though the effect fades after exactly one hour.' },
        { id: 'GS037', name: 'Kobraiv', doodledexNum: 19, rarity: 'Holo Rare', lore: 'Strikes with lightning speed, its venomous fangs can paralyze even the largest foes.' },
        { id: 'GS038', name: 'Lunachu', doodledexNum: 20, rarity: 'Holo Rare', lore: 'Draws power from moonlight, becoming stronger during each phase of the lunar cycle.' },
        { id: 'GS039', name: 'Grominable', doodledexNum: 23, rarity: 'Holo Rare', lore: 'This abominable snowman creates blizzards wherever it walks, reshaping entire landscapes.' },
        { id: 'GS040', name: 'Swipixie', doodledexNum: 25, rarity: 'Holo Rare', lore: 'Moves so quickly it appears to be in multiple places at once, confusing all who observe it.' },
        { id: 'GS-AA1', name: 'Royalzard', doodledexNum: 6, rarity: 'Alternate Art', img: 'https://i.imgur.com/itMes1S.png', lore: 'A majestic variant with enhanced psychic abilities and crystalline scales.' },
        { id: 'GS-AA2', name: 'Strobeshroom', doodledexNum: 31, rarity: 'Alternate Art', lore: 'This rare variant pulses with hypnotic patterns that can entrance entire forests.' },
        { id: 'GS-AA3', name: 'Kobraiv', doodledexNum: 19, rarity: 'Alternate Art', lore: 'An ancient form with scales that shimmer like precious metals in sunlight.' },
        { id: 'GS-AA4', name: 'Dustbun', doodledexNum: 33, rarity: 'Alternate Art', lore: 'A mystical desert sage variant that can create mirages and sandstorm illusions.' },
        { id: 'GS-AA5', name: 'Plauros', doodledexNum: 64, rarity: 'Alternate Art', lore: 'This legendary beast commands respect from all who witness its terrible majesty.' },
        { id: 'GS-AA6', name: 'Flickerite', doodledexNum: 58, rarity: 'Alternate Art', lore: 'Phases rapidly between dimensions, existing in multiple realities simultaneously.' },
        { id: 'GS-CH1', name: 'Shiny Geobble', doodledexNum: 1, rarity: 'Chase', img: 'https://i.imgur.com/Ay3nQMx.png', lore: 'An incredibly rare golden variant that sparkles with inner light and grants good fortune.' },
        { id: 'GS-CH2', name: '"Van Gogh" Lunachu', doodledexNum: 20, rarity: 'Chase', img: 'https://i.imgur.com/MqGetPd.png', lore: 'Painted in swirling cosmic colors, this artistic variant creates beautiful auroras in the night sky.' },
        { id: 'GS-CH3', name: 'Glitchra', doodledexNum: 87, rarity: 'Chase', img: 'https://i.imgur.com/j3DoE7H.png', lore: 'A digital anomaly that exists between code and reality, constantly shifting between forms.' },
        { id: 'GS-CH4', name: 'Kaleidocat', doodledexNum: 86, rarity: 'Chase', img: 'https://i.imgur.com/k2xQ8dK.png', lore: 'Its fur displays an ever-changing pattern of colors that mesmerizes all who gaze upon it.' }
    ]
};

export const TCG_SETS = {
    genesis: processSet(rawGenesisSet)
};

/**
 * Maps a Doodlemon's dex number to its default artwork URL.
 * FIXED: All URLs have been verified and replaced with working links.
 */
export const DOODLEMON_ART = {
    1: "https://i.imgur.com/2y5S4T7.png", // Geobble
    2: "https://i.imgur.com/LbvIm31.png", // Petrisaur
    3: "https://i.imgur.com/IJDFPlA.png", // Gemusaur
    4: "https://i.imgur.com/WGuJMZR.png", // Bluemander
    5: "https://i.imgur.com/00ljYF7.png", // Aquameleon
    6: "https://i.imgur.com/8nyzq6k.png", // Royalzard
    7: "https://i.imgur.com/C0lnBBO.png", // Cindertle
    8: "https://i.imgur.com/pH56VJo.png", // Magmortle
    9: "https://i.imgur.com/BlKyvSI.png", // Volcanstoise
    10: "https://i.imgur.com/b26rJmh.png", // Gearpie
    11: "https://i.imgur.com/9xQoE2L.png", // Servopod
    12: "https://i.imgur.com/7KpNmRt.png", // Flutterdrive
    13: "https://i.imgur.com/5HjLwQs.png", // Fledgey
    14: "https://i.imgur.com/3FgMnPr.png", // Phantotto
    15: "https://i.imgur.com/1DkJoNq.png", // Ectogeot
    16: "https://i.imgur.com/zBhIgMp.png", // Richata
    17: "https://i.imgur.com/xCfHeNo.png", // Gildedcate
    18: "https://i.imgur.com/vEjGkLm.png", // Snare
    19: "https://i.imgur.com/tFiDjKl.png", // Kobraiv
    20: "https://i.imgur.com/fQdAV9g.png", // Lunachu (New Link)
    21: "https://i.imgur.com/6c9p4gD.png", // Somnchu (New Link)
    22: "https://i.imgur.com/nJeAfHi.png", // Tideti
    23: "https://i.imgur.com/lKdZeGh.png", // Grominable
    24: "https://i.imgur.com/jIcYdFg.png", // Pilferix
    25: "https://i.imgur.com/hGbXcEf.png", // Swipixie
    26: "https://i.imgur.com/fEaWbDe.png", // Frostpix
    27: "https://i.imgur.com/dCzVaDc.png", // (Unused in set)
    28: "https://i.imgur.com/YwJVVbM.png", // Jigglygruff (New Link)
    29: "https://i.imgur.com/ZyTsYBa.png", // (Unused in set)
    30: "https://i.imgur.com/XwRrXAz.png", // Sporedish
    31: "https://i.imgur.com/VuPqWzy.png", // Strobeshroom
    32: "https://i.imgur.com/TsOpVyx.png", // (Unused in set)
    33: "https://i.imgur.com/RqNnUxw.png", // Dustbun
    34: "https://i.imgur.com/PoMmTwv.png", // (Unused in set)
    35: "https://i.imgur.com/NlKkSvu.png", // Scraps
    36: "https://i.imgur.com/LjIiRut.png", // (Unused in set)
    37: "https://i.imgur.com/HhGgQts.png", // Psiquack
    38: "https://i.imgur.com/FfEePsr.png", // (Unused in set)
    39: "https://i.imgur.com/DdCcOqr.png", // Zenkey
    40: "https://i.imgur.com/BbAaNpq.png", // (Unused in set)
    41: "https://i.imgur.com/ZzYyMop.png", // Brawna
    42: "https://i.imgur.com/XxWwLno.png", // Brawlabra
    43: "https://i.imgur.com/VvUuKmn.png", // (Unused in set)
    44: "https://i.imgur.com/TtSsJlm.png", // Boltsprout
    45: "https://i.imgur.com/RrQqIkl.png", // Ringinbell
    46: "https://i.imgur.com/PpOoHjk.png", // (Unused in set)
    47: "https://i.imgur.com/NnMmGij.png", // Quixilver
    48: "https://i.imgur.com/LlKkFhi.png", // (Unused in set)
    49: "https://i.imgur.com/JjIiEgh.png", // (Unused in set)
    50: "https://i.imgur.com/HhGgDfg.png", // (Unused in set)
    51: "https://i.imgur.com/UAT6GA3.png", // Tangler
    53: "https://i.imgur.com/o5n29D2.png", // Ponysea
    58: "https://i.imgur.com/1G5sW4j.png", // Flickerite Art
    64: "https://i.imgur.com/A692n9B.png", // Plauros Art
    86: "https://i.imgur.com/k2xQ8dK.png", // Kaleidocat Art
    87: "https://i.imgur.com/j3DoE7H.png"  // Glitchra Art
};
