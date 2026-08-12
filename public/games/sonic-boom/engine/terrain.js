// ============================================================
// SONIC BOOM — Procedural Terrain
// Heightmap mesh + Cannon.js heightfield collider + boundary walls
// ============================================================
// THREE and CANNON are globals (UMD builds loaded via <script> tags)

// Deterministic multi-octave terrain height function
export function heightAt(x, z) {
    let h = 0;
    h += Math.sin(x * 0.035 + 1.7) * Math.cos(z * 0.028) * 5.5;
    h += Math.sin(x * 0.075 + 0.4) * Math.cos(z * 0.062 + 2.2) * 2.8;
    h += Math.sin(x * 0.16 + 4.1) * Math.cos(z * 0.14 + 1.1) * 1.4;
    h += Math.cos(x * 0.33 + 2.6) * Math.sin(z * 0.31) * 0.7;
    h += Math.sin(x * 0.7) * Math.cos(z * 0.66) * 0.25;

    // Island falloff — edges dip toward sea level
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

    return Math.max(0, h);
}

export class TerrainBuilder {
    constructor(scene) {
        this.scene = scene;
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

        // Vertex colors — golden sand beaches, lush tropical green inland,
        // warm rocky peaks. Multiple color bands for realism.
        const colors = new Float32Array(pos.count * 3);
        const wetSand = new THREE.Color(0xa08850);
        const drySand = new THREE.Color(0xd4b878);
        const goldenSand = new THREE.Color(0xe0c888);
        const grass = new THREE.Color(0x3a9e3a);
        const darkGrass = new THREE.Color(0x2a7a2a);
        const rock = new THREE.Color(0x8a8578);
        const lightRock = new THREE.Color(0xa09888);
        const c = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
            const distFromCenter = Math.hypot(x, z);
            // Beach zones — wet near water, dry further in
            const nearWater = THREE.MathUtils.clamp((78 - Math.abs(z - 80)) / 20, 0, 1);
            const lowElev = THREE.MathUtils.clamp((2.0 - y) / 2.0, 0, 1);
            const beachFactor = Math.max(nearWater, lowElev);
            // Depth into beach — wet sand vs dry sand
            const wetFactor = THREE.MathUtils.clamp((2 - y) / 2, 0, 1) * 0.6;
            // Start with grass, lerp to sand based on beach factor
            const isHigh = y > 6;
            if (isHigh) {
                c.copy(rock).lerp(lightRock, THREE.MathUtils.clamp((y - 6) / 5, 0, 1));
            } else if (y > 3) {
                c.copy(grass).lerp(darkGrass, THREE.MathUtils.clamp((y - 3) / 3, 0, 1));
            } else {
                c.copy(grass).lerp(goldenSand, beachFactor);
            }
            // Wet sand overlay near water
            if (beachFactor > 0.3) {
                c.lerp(wetSand, wetFactor * beachFactor);
            }
            // Dry sand highlight on low flat areas
            if (y < 1.5 && beachFactor > 0.5) {
                c.lerp(drySand, 0.3);
            }
            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
            metalness: 0,
            flatShading: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.name = 'islandTerrain';
        this.scene.add(mesh);

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
