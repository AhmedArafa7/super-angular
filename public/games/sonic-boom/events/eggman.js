// Eggman Boss Event — Dynamic World Event
// THREE is a global

const DIALOGUES = [
    { speaker: 'Eggman', text: "Well, well! Look who decided to show up on MY island!" },
    { speaker: 'Eggman', text: "Prepare to face my latest creation — the Egg Slicer Mech!" },
    { speaker: 'Eggman', text: "You think you can stop me? How DELIGHTFULLY optimistic!" },
    { speaker: 'Eggman', text: "ENOUGH! Time to get serious!" },
    { speaker: 'Eggman', text: "Curse you, Sonic! This isn't over!" },
];

export class EggmanEvent {
    constructor(scene) {
        this.scene = scene;
        this.active = false;
        this.mech = null;
        this.health = 100;
        this.phase = 0;
        this.dialogueIndex = 0;
        this.cooldown = 60 + Math.random() * 120;
        this.timer = 0;
        this.mechMeshes = [];
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.health = 100;
        this.phase = 0;
        this.dialogueIndex = 0;
        this._spawnMech();
        this._showDialogue();
    }

    _spawnMech() {
        this.mech = new THREE.Group();

        // body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(4, 5, 4),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 })
        );
        body.position.y = 4;
        body.castShadow = true;
        this.mech.add(body);

        // head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(1.5, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.2 })
        );
        head.position.y = 8;
        head.castShadow = true;
        this.mech.add(head);

        // cockpit (Eggman visible inside)
        const cockpit = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 10, 8),
            new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 })
        );
        cockpit.position.set(0, 8.5, 1);
        this.mech.add(cockpit);

        // Eggman inside
        const eggmanBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8),
            new THREE.MeshStandardMaterial({ color: 0xCC0000 })
        );
        eggmanBody.position.set(0, 8.3, 1);
        this.mech.add(eggmanBody);

        const eggmanHead = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xf5d5b8 })
        );
        eggmanHead.position.set(0, 9.2, 1);
        this.mech.add(eggmanHead);

        // mustache
        const mustache = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.08, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 })
        );
        mustache.position.set(0, 9.05, 1.3);
        this.mech.add(mustache);

        // arms
        for (const side of [-1, 1]) {
            const arm = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.4, 4, 8),
                new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 })
            );
            arm.position.set(side * 3, 3, 0);
            arm.rotation.z = side * 0.2;
            this.mech.add(arm);
            this.mechMeshes.push(arm);

            // claw
            const claw = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 0.5, 0.8),
                new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9 })
            );
            claw.position.set(side * 3.5, 0.8, 0);
            this.mech.add(claw);
            this.mechMeshes.push(claw);
        }

        // legs
        for (const side of [-1, 1]) {
            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.4, 0.5, 3, 8),
                new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 })
            );
            leg.position.set(side * 1.5, 0, 0);
            this.mech.add(leg);

            const foot = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 0.6, 2),
                new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9 })
            );
            foot.position.set(side * 1.5, -1.5, 0.5);
            this.mech.add(foot);
        }

        // laser cannon (chest)
        const cannon = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.4, 2, 8),
            new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.3 })
        );
        cannon.position.set(0, 4, 2.5);
        cannon.rotation.x = Math.PI / 2;
        this.mech.add(cannon);

        // health bar above mech
        const barBg = new THREE.Mesh(
            new THREE.BoxGeometry(5, 0.3, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        barBg.position.y = 11;
        this.mech.add(barBg);
        this.healthBar = new THREE.Mesh(
            new THREE.BoxGeometry(5, 0.3, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        this.healthBar.position.y = 11;
        this.healthBar.position.z = 0.05;
        this.mech.add(this.healthBar);

        this.mech.position.set(0, 0, -40);
        this.scene.add(this.mech);
    }

    _showDialogue() {
        if (this.dialogueIndex >= DIALOGUES.length) return;
        const d = DIALOGUES[this.dialogueIndex];
        this.dialogueIndex++;
        return d;
    }

    takeDamage(amount) {
        if (!this.active) return;
        this.health -= amount;
        this.healthBar.scale.x = Math.max(0, this.health / 100);
        this.healthBar.position.x = -(5 * (1 - this.health / 100)) / 2;

        // flash
        this.mech.traverse(c => {
            if (c.material && c.material.emissive) {
                c.material.emissive.setHex(0xffffff);
                setTimeout(() => c.material.emissive.setHex(0), 100);
            }
        });

        if (this.health <= 0) {
            this.defeat();
        } else if (this.health < 30 && this.phase < 2) {
            this.phase = 2;
            return this._showDialogue();
        } else if (this.health < 60 && this.phase < 1) {
            this.phase = 1;
            return this._showDialogue();
        }
    }

    defeat() {
        this.active = false;
        // explosion animation
        const explode = () => {
            for (let i = 0; i < 8; i++) {
                const spark = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 6, 6),
                    new THREE.MeshBasicMaterial({ color: 0xff4400 })
                );
                spark.position.copy(this.mech.position);
                spark.position.x += (Math.random() - 0.5) * 4;
                spark.position.y += Math.random() * 5;
                spark.position.z += (Math.random() - 0.5) * 4;
                this.scene.add(spark);
                setTimeout(() => this.scene.remove(spark), 500);
            }
        };
        explode();
        setTimeout(explode, 300);
        setTimeout(() => {
            this.scene.remove(this.mech);
            this.mech = null;
            this.mechMeshes = [];
        }, 1000);
    }

    update(dt, playerPositions) {
        if (!this.active || !this.mech) return;

        this.timer += dt;

        // face nearest player
        if (playerPositions.length > 0) {
            let nearest = playerPositions[0];
            let minDist = Infinity;
            for (const p of playerPositions) {
                const d = this.mech.position.distanceTo(p);
                if (d < minDist) { minDist = d; nearest = p; }
            }
            const dir = new THREE.Vector3().subVectors(nearest, this.mech.position);
            this.mech.rotation.y = Math.atan2(dir.x, dir.z);
        }

        // move toward players slowly
        if (playerPositions.length > 0) {
            const target = playerPositions[0];
            const dir = new THREE.Vector3().subVectors(target, this.mech.position).normalize();
            this.mech.position.x += dir.x * 2 * dt;
            this.mech.position.z += dir.z * 2 * dt;
        }

        // bobbing
        this.mech.position.y = Math.sin(this.timer * 2) * 0.3;

        // arm animation
        for (const m of this.mechMeshes) {
            m.rotation.x = Math.sin(this.timer * 3) * 0.3;
        }

        // check cooldown for next event
        if (!this.active) {
            this.cooldown = 60 + Math.random() * 120;
            this.timer = 0;
        }
    }

    getDialogue() {
        return this._showDialogue();
    }

    isActive() { return this.active; }

    reset() {
        this.active = false;
        this.health = 100;
        this.phase = 0;
        this.dialogueIndex = 0;
        this.timer = 0;
        this.cooldown = 60 + Math.random() * 120;
        if (this.mech) {
            for (const m of this.mechMeshes) { if (m.parent) this.scene.remove(m); }
            this.mechMeshes = [];
            this.mech = null;
        }
    }
}
