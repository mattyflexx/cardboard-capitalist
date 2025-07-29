/**
 * assetLoader.js
 * Lazy loading system for card images to improve performance
 */

// Intersection Observer for detecting when images come into view
let imageObserver = null;

// Set of critical assets that should be preloaded
const CRITICAL_ASSETS = new Set([
    'assets/fallback.png',
    'assets/frame_standard.png', 
    'assets/frame_fullart.png',
    'assets/pack_genesis.png'
]);

// Cache for loaded images to avoid repeated requests
const imageCache = new Map();

/**
 * Initialize the lazy loading system
 */
export function initializeLazyLoading() {
    if (!imageObserver && 'IntersectionObserver' in window) {
        imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    loadCardImage(img);
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px', // Start loading when image is 50px away from viewport
            threshold: 0.1
        });
    }
    
    // Preload critical assets
    preloadCriticalAssets();
}

/**
 * Preload critical assets that are needed immediately
 */
function preloadCriticalAssets() {
    CRITICAL_ASSETS.forEach(assetPath => {
        if (!imageCache.has(assetPath)) {
            const img = new Image();
            img.onload = () => {
                imageCache.set(assetPath, img);
                console.log(`✅ Preloaded critical asset: ${assetPath}`);
            };
            img.onerror = () => {
                console.warn(`⚠️ Failed to preload critical asset: ${assetPath}`);
            };
            img.src = assetPath;
        }
    });
}

/**
 * Create a lazy-loaded card image element
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text for the image
 * @param {string} className - CSS class name(s)
 * @param {Function} onError - Error handler function
 * @returns {HTMLImageElement} The image element with lazy loading
 */
export function createLazyCardImage(src, alt, className = '', onError = null) {
    const img = document.createElement('img');
    
    // Set initial attributes
    img.alt = alt;
    img.className = `lazy-card-image loading ${className}`;
    
    // Add data attribute for the actual source
    img.dataset.src = src;
    
    // Set up error handling
    const errorHandler = onError || ((errorImg) => {
        errorImg.src = 'assets/fallback.png';
        errorImg.className = errorImg.className.replace('loading', 'error');
        console.warn(`⚠️ Failed to load card image: ${src}`);
    });
    
    img.onerror = () => errorHandler(img);
    
    // If image is already cached, load immediately
    if (imageCache.has(src)) {
        img.src = src;
        img.className = img.className.replace('loading', 'loaded');
        return img;
    }
    
    // Set up lazy loading with intersection observer
    if (imageObserver) {
        imageObserver.observe(img);
    } else {
        // Fallback for browsers without IntersectionObserver
        setTimeout(() => loadCardImage(img), 100);
    }
    
    return img;
}

/**
 * Load the actual image for a lazy-loaded element
 * @param {HTMLImageElement} img - The image element to load
 */
function loadCardImage(img) {
    const src = img.dataset.src;
    if (!src || img.src === src) return;
    
    // Check cache first
    if (imageCache.has(src)) {
        img.src = src;
        img.className = img.className.replace('loading', 'loaded');
        return;
    }
    
    // Create a new image to test loading
    const testImg = new Image();
    
    testImg.onload = () => {
        // Cache the successful load
        imageCache.set(src, testImg);
        
        // Apply to the target image
        img.src = src;
        img.className = img.className.replace('loading', 'loaded');
        console.log(`✅ Lazy loaded card image: ${getCardName(src)}`);
    };
    
    testImg.onerror = () => {
        // Trigger the error handler on the original image
        if (img.onerror) {
            img.onerror();
        }
    };
    
    testImg.src = src;
}

/**
 * Get card name from image path for logging and debugging
 * @param {string} imagePath - Path to the card image
 * @returns {string} Human-readable card name
 */
export function getCardName(imagePath) {
    // TODO: Expand this mapping as more cards are added
    const cardMappings = {
        '001-geobble.png': 'Geobble',
        '002-petrisaur.png': 'Petrisaur', 
        '003-gemusaur.png': 'Gemusaur',
        '004-bluemander.png': 'Bluemander',
        '005-aquameleon.png': 'Aquameleon',
        '006-royalzard.png': 'Royalzard',
        '007-cindertle.png': 'Cindertle',
        '008-magmortle.png': 'Magmortle',
        '009-volcantoise.png': 'Volcantoise',
        '010-gearpie.png': 'Gearpie',
        '011-servopod.png': 'Servopod',
        '012-flutterdrive.png': 'Flutterdrive',
        '013-fledgey.png': 'Fledgey',
        '014-phantotto.png': 'Phantotto',
        '015-ectogeot.png': 'Ectogeot',
        '016-richata.png': 'Richata',
        '017-gildedcate.png': 'Gildedcate',
        '018-snare.png': 'Snare',
        '019-kobraiv.png': 'Kobraiv',
        '020-lunachu.png': 'Lunachu',
        'fallback.png': 'Unknown Card',
        'frame_standard.png': 'Standard Frame',
        'frame_fullart.png': 'Full Art Frame',
        'pack_genesis.png': 'Genesis Pack'
    };
    
    // Extract filename from path
    const filename = imagePath.split('/').pop() || imagePath;
    
    return cardMappings[filename] || filename.replace(/\.[^/.]+$/, ''); // Remove extension as fallback
}

/**
 * Preload specific card images (for cards currently in collection)
 * @param {string[]} imagePaths - Array of image paths to preload
 */
export function preloadCardImages(imagePaths) {
    imagePaths.forEach(path => {
        if (!imageCache.has(path)) {
            const img = new Image();
            img.onload = () => {
                imageCache.set(path, img);
                console.log(`✅ Preloaded card: ${getCardName(path)}`);
            };
            img.onerror = () => {
                console.warn(`⚠️ Failed to preload card: ${getCardName(path)}`);
            };
            img.src = path;
        }
    });
}

/**
 * Clear the image cache (useful for memory management)
 */
export function clearImageCache() {
    imageCache.clear();
    console.log('🧹 Image cache cleared');
}

/**
 * Get cache statistics for debugging
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
    return {
        cachedImages: imageCache.size,
        cacheKeys: Array.from(imageCache.keys()),
        observerActive: !!imageObserver
    };
}