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
        // Bright tropical sun — warm golden light
        this.sun = new THREE.DirectionalLight(0xfff0d0, 1.6);
        this.sun.position.set(50, 70, -30);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        this.sun.shadow.camera.left = -100;
        this.sun.shadow.camera.right = 100;
        this.sun.shadow.camera.top = 100;
        this.sun.shadow.camera.bottom = -100;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 300;
        this.sun.shadow.bias = -0.001;
        this.sun.shadow.normalBias = 0.02;
        this.scene.add(this.sun);

        // Cool fill light — ocean reflection tint
        this.fill = new THREE.DirectionalLight(0x88ccdd, 0.35);
        this.fill.position.set(-40, 25, 60);
        this.scene.add(this.fill);

        // Sky hemisphere — tropical blue above, warm sand below
        this.hemi = new THREE.HemisphereLight(0x6ec6ff, 0xc4a870, 0.65);
        this.scene.add(this.hemi);

        // Ambient — warm
        this.ambient = new THREE.AmbientLight(0xfff8e8, 0.25);
        this.scene.add(this.ambient);
    }

    _fog() {
        this.scene.fog = new THREE.Fog(0x88ccee, 150, 380);
        this.scene.background = new THREE.Color(0x7ec8e3);
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
