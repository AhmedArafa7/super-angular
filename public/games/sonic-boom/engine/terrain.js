// ============================================================
// SONIC BOOM — Procedural Terrain
// Heightmap mesh + Cannon.js heightfield collider + boundary walls
// ============================================================
// THREE and CANNON are globals (UMD builds loaded via <script> tags)

// Strict global Sea Level
export const SEA_LEVEL = 0.0;

// Deterministic multi-octave terrain height function (sit strictly above sea level)
export function heightAt(x, z) {
    let h = 0;
    h += Math.sin(x * 0.035 + 1.7) * Math.cos(z * 0.028) * 5.5;
    h += Math.sin(x * 0.075 + 0.4) * Math.cos(z * 0.062 + 2.2) * 2.8;
    h += Math.sin(x * 0.16 + 4.1) * Math.cos(z * 0.14 + 1.1) * 1.4;
    h += Math.cos(x * 0.33 + 2.6) * Math.sin(z * 0.31) * 0.7;
    h += Math.sin(x * 0.7) * Math.cos(z * 0.66) * 0.25;

    // Island falloff — edges smoothly meet sea level
    const edge = Math.max(0, (Math.abs(x) / 130) - 0.55);
    const zEdge = Math.max(0, (Math.abs(z) / 130) - 0.55);
    const falloff = Math.max(edge, zEdge);
    h -= falloff * 18;

    // Flatten social/POI plateaus so built structures sit on the ground
    const zones = [
        [0, -22, 26],  // village square
        [20, -10, 20], // ancient ruins
        [0, -20, 30],  // spawn plaza
        [0, 0, 16]     // island center clearing
    ];
    for (const [cx, cz, r] of zones) {
        const d = Math.hypot(x - cx, z - cz);
        const t = Math.max(0, Math.min(1, 1 - (d - 2) / (r - 2)));
        h *= 1 - t;
    }

    return Math.max(SEA_LEVEL, h);
}

// Procedural PBR Normal Map Generator
function createTerrainNormalMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(512, 512);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        const nx = (Math.random() - 0.5) * 60 + 128;
        const ny = (Math.random() - 0.5) * 60 + 128;
        data[i] = nx;     // Red (X normal)
        data[i + 1] = ny; // Green (Y normal)
        data[i + 2] = 255;// Blue (Z normal)
        data[i + 3] = 255;// Alpha
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 24);
    return tex;
}

export class TerrainBuilder {
    constructor(scene) {
        this.scene = scene;
        this.waterMesh = null;
        this.waterTime = 0;
    }

    build(opts = {}) {
        const size = opts.size || 280;
        const res = opts.res || 160;

        // ---- THREE mesh ----
        const geo = new THREE.PlaneGeometry(size, size, res, res);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
        }

        // PBR Vertex Colors (sand, grass, rock bands)
        const colors = new Float32Array(pos.count * 3);
        const wetSand = new THREE.Color(0xa08850);
        const goldenSand = new THREE.Color(0xe0c888);
        const grass = new THREE.Color(0x3a9e3a);
        const darkGrass = new THREE.Color(0x2a7a2a);
        const rock = new THREE.Color(0x8a8578);
        const lightRock = new THREE.Color(0xa09888);
        const c = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
            const nearWater = THREE.MathUtils.clamp((78 - Math.abs(z - 80)) / 20, 0, 1);
            const lowElev = THREE.MathUtils.clamp((2.0 - y) / 2.0, 0, 1);
            const beachFactor = Math.max(nearWater, lowElev);
            const wetFactor = THREE.MathUtils.clamp((2 - y) / 2, 0, 1) * 0.6;

            if (y > 6) {
                c.copy(rock).lerp(lightRock, THREE.MathUtils.clamp((y - 6) / 5, 0, 1));
            } else if (y > 3) {
                c.copy(grass).lerp(darkGrass, THREE.MathUtils.clamp((y - 3) / 3, 0, 1));
            } else {
                c.copy(grass).lerp(goldenSand, beachFactor);
            }
            if (beachFactor > 0.3) {
                c.lerp(wetSand, wetFactor * beachFactor);
            }
            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        // High-fidelity PBR Terrain Material
        const normalMap = createTerrainNormalMap();
        const mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.85,
            metalness: 0.1,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(0.6, 0.6),
            flatShading: false
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.name = 'islandTerrain';
        this.scene.add(mesh);

        // ---- Single Massive Animated Ocean Water Plane at Sea Level ----
        const waterGeo = new THREE.PlaneGeometry(1500, 1500, 64, 64);
        waterGeo.rotateX(-Math.PI / 2);
        
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x0088cc,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
        this.waterMesh.position.set(0, SEA_LEVEL + 0.02, 0); // Exactly at Sea Level
        this.waterMesh.receiveShadow = true;
        this.scene.add(this.waterMesh);

        // ---- Cannon-es heightfield collider ----
        const data = [];
        const elementSize = size / res;
        for (let i = 0; i <= res; i++) {
            const row = [];
            const x = -size / 2 + i * elementSize;
            for (let j = 0; j <= res; j++) {
                const z = -size / 2 + j * elementSize;
                row.push(heightAt(x, z));
            }
            data.push(row);
        }

        const hfShape = new CANNON.Heightfield(data, { elementSize });
        const groundMat = new CANNON.Material('ground');
        const body = new CANNON.Body({ mass: 0, material: groundMat });
        body.addShape(hfShape);
        body.position.set(-size / 2, 0, -size / 2);
        body.updateMassProperties();

        // ---- Boundary walls (keep players on the island) ----
        const walls = [];
        const wallHeight = 25;
        const thickness = 6;
        const half = size / 2;
        const wallDefs = [
            { x: 0, z: -half, sx: size, sz: thickness },
            { x: 0, z: half, sx: size, sz: thickness },
            { x: -half, z: 0, sx: thickness, sz: size },
            { x: half, z: 0, sx: thickness, sz: size }
        ];
        for (const w of wallDefs) {
            const shape = new CANNON.Box(new CANNON.Vec3(w.sx / 2, wallHeight / 2, w.sz / 2));
            const wallBody = new CANNON.Body({ mass: 0, material: groundMat });
            wallBody.addShape(shape);
            wallBody.position.set(w.x, wallHeight / 2 - 2, w.z);
            walls.push(wallBody);
        }

        this.mesh = mesh;
        this.body = body;
        this.walls = walls;
        this.size = size;
        return this;
    }

    // Sample ground height at a world position (for camera/effects)
    sampleHeight(x, z) {
        return heightAt(x, z);
    }
}
