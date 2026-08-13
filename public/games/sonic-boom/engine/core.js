// Core Engine — Open World Social Sandbox
// THREE is a global (UMD build loaded via <script> tag)

export class CoreEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.9;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);

        this._lighting();
        this._fog();

        window.addEventListener('resize', () => this._resize());
    }

    _lighting() {
        // Sunset / Golden Hour main sun light (low angle, rich golden orange)
        this.sun = new THREE.DirectionalLight(0xffaa44, 2.2);
        this.sun.position.set(70, 35, -70);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        this.sun.shadow.camera.left = -120;
        this.sun.shadow.camera.right = 120;
        this.sun.shadow.camera.top = 120;
        this.sun.shadow.camera.bottom = -120;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 350;
        this.sun.shadow.bias = -0.0008;
        this.sun.shadow.normalBias = 0.02;
        this.scene.add(this.sun);

        // Fill light — purple/magenta dusk ambient fill
        this.fill = new THREE.DirectionalLight(0xa855f7, 0.45);
        this.fill.position.set(-60, 30, 60);
        this.scene.add(this.fill);

        // Hemisphere light — warm golden sunset sky above, warm sand ground below
        this.hemi = new THREE.HemisphereLight(0xffaa66, 0xd49b4b, 0.75);
        this.scene.add(this.hemi);

        // Ambient — warm golden glow
        this.ambient = new THREE.AmbientLight(0xff8833, 0.3);
        this.scene.add(this.ambient);
    }

    _fog() {
        // Sunset golden-purple horizon fog
        this.scene.fog = new THREE.FogExp2(0xd97706, 0.0035);
        this.scene.background = new THREE.Color(0xf59e0b);
    }

    _resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
