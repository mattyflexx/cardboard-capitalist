// assetLoader.js

let imageObserver = null;
const CRITICAL_ASSETS = new Set([
    'assets/fallback.png',
    'assets/frame_standard.png',
    'assets/frame_fullart.png',
    'assets/pack_genesis.png'
]);
const imageCache = new Map();

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
        }, { rootMargin: '100px', threshold: 0.01 });
    }
    preloadCriticalAssets();
}

function preloadCriticalAssets() {
    CRITICAL_ASSETS.forEach(assetPath => {
        if (!imageCache.has(assetPath)) {
            const img = new Image();
            img.onload = () => imageCache.set(assetPath, img);
            img.onerror = () => console.warn(`⚠️ Failed to preload critical asset: ${assetPath}`);
            img.src = assetPath;
        }
    });
}

export function createLazyCardImage(src, alt, className = '') {
    const img = document.createElement('img');
    img.alt = alt;
    img.className = `lazy-card-image loading ${className}`;
    img.dataset.src = src;

    img.onerror = () => {
        img.src = 'assets/fallback.png';
        img.classList.remove('loading');
        img.classList.add('error');
        console.warn(`⚠️ Failed to load card image: ${src}, using fallback.`);
    };

    if (imageCache.has(src)) {
        img.src = src;
        img.className = img.className.replace('loading', 'loaded');
    } else if (imageObserver) {
        imageObserver.observe(img);
    } else {
        loadCardImage(img); // Fallback for older browsers
    }
    return img;
}

function loadCardImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    const testImg = new Image();
    testImg.onload = () => {
        imageCache.set(src, testImg);
        img.src = src;
        img.className = img.className.replace('loading', 'loaded');
    };
    testImg.onerror = img.onerror;
    testImg.src = src;
}

export function preloadCardImages(imagePaths) {
    imagePaths.forEach(path => {
        if (!imageCache.has(path)) {
            const img = new Image();
            img.onload = () => imageCache.set(path, img);
            img.src = path;
        }
    });
}
