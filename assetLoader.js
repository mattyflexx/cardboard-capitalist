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
