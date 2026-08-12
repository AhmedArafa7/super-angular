// ============================================================
// SONIC BOOM — 3D Asset Pipeline (GLTF/GLB)
// GLTFLoader architecture with configurable model URLs.
// Swaps final .glb files in automatically; falls back to the
// procedural character mesh if a model is unavailable.
// ============================================================
// THREE.GLTFLoader is a global (three/examples/js UMD build)

function gltfLoader() {
    return new THREE.GLTFLoader();
}

// Swap final high-fidelity models in here — paths resolve relative to the
// game folder (index.html lives at /games/sonic-boom/).
export const MODEL_URLS = {
    sonic: [
        'models/sonic.glb',
        'models/sonic.gltf'
    ],
    tails: [
        'models/tails.glb',
        'models/tails.gltf'
    ],
    knuckles: [
        'models/knuckles.glb',
        'models/knuckles.gltf'
    ],
    amy: [
        'models/amy.glb',
        'models/amy.gltf'
    ],
    sticks: [
        'models/sticks.glb',
        'models/sticks.gltf'
    ]
};

const loader = gltfLoader();
const cache = new Map();

function normalizeUrl(u) {
    // Allow bare paths or full URLs; try a couple of bases.
    return u;
}

export async function loadPlayerModel(charKey) {
    if (cache.has(charKey)) return cache.get(charKey);

    const urls = MODEL_URLS[charKey] || [];
    for (const u of urls) {
        try {
            const gltf = await loader.loadAsync(normalizeUrl(u));
            cache.set(charKey, gltf);
            console.log(`[AssetLoader] Loaded ${charKey} model: ${u}`);
            return gltf;
        } catch (e) {
            // try next candidate
        }
    }
    cache.set(charKey, null);
    return null;
}

// Prepare a loaded GLB scene for gameplay: cast shadows, sensible scale
export function setupModelScene(gltfScene, scale = 1) {
    const group = gltfScene.isGroup ? gltfScene : new THREE.Group().add(gltfScene);
    group.traverse(obj => {
        if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
        }
    });
    // Normalize to ~1.9 units tall
    const box = new THREE.Box3().setFromObject(group);
    const height = box.max.y - box.min.y;
    if (height > 0 && Math.abs(height - 1.9) > 0.01) {
        group.scale.setScalar(1.9 / height);
    }
    group.position.y = 0;
    return group;
}
