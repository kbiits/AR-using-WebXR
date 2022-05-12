import * as THREE from 'three';
import { GLTFLoader } from './dependencies/three/jsm/GLTFLoader.js';
import { ARButton } from './dependencies/three/jsm/ARButton.js';
import { LoadingBar } from './dependencies/LoadingBar.js';
import { Player } from './dependencies/Player.js';

class App {
  constructor() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    this.clock = new THREE.Clock();
    this.loadingBar = new LoadingBar();

    this.assetsPath = 'assets/';

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    this.camera.position.set(0, 1.6, 3);
    this.camera.matrixAutoUpdate = false;

    this.scene = new THREE.Scene();

    const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 2);
    ambient.position.set(0.5, 1, 0.25);
    this.scene.add(ambient);

    const light = new THREE.DirectionalLight();
    light.position.set(0.2, 1, 1);
    this.scene.add(light);

    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const gl = canvas.getContext('webgl2', { xrCompatible: true });

    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas, context: gl, preserveDrawingBuffer: true });
    this.renderer.autoClear = false;

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, document.body.clientHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    container.appendChild(this.renderer.domElement);

    this.workingVec3 = new THREE.Vector3();

    this.initScene();
    this.setupXR();

    window.addEventListener('resize', this.resize.bind(this));
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, document.body.clientHeight);
  }

  loadPlayer() {
    const loader = new GLTFLoader().setPath(this.assetsPath);
    const self = this;

    // Load model
    loader.load(
      `player.glb`,
      function (gltf) {
        const object = gltf.scene.children[5];

        const options = {
          object: object,
          speed: 0.4,
          assetsPath: self.assetsPath,
          loader: loader,
          animations: gltf.animations,
          clip: gltf.animations[0],
          app: self,
          name: 'player',
        };

        self.player = new Player(options);
        self.player.object.visible = false;

        self.player.action = 'Dance';
        // scale player
        const scale = 0.17 / 100;
        self.player.object.scale.set(scale, scale, scale);
        self.loadingBar.visible = false;
        self.renderer.setAnimationLoop(self.render.bind(self));
      },
      // called while loading is progressing
      function (xhr) {
        self.loadingBar.progress = xhr.loaded / xhr.total;
      },
      // called when loading has errors
      function (error) {
        console.log('error');
        console.log(error);
      }
    );
  }

  initScene() {
    this.loadPlayer();
    this.reticle = new THREE.Mesh(
      new THREE.RingBufferGeometry(0.08, 0.13, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);
  }

  setupXR() {
    this.renderer.xr.enabled = true;

    this.hitTestSourceRequested = false;
    this.hitTestSource = null;

    this.controller = this.renderer.xr.getController(0);

    this.scene.add(this.controller);

    const btn = ARButton.createButton(this.renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    });
    document.body.appendChild(btn);
  }

  onSelect() {
    const self = this;
    if (!self.player) {
      return;
    }

    if (self.reticle.visible) {
      if (self.player.object.visible) {
        self.workingVec3.setFromMatrixPosition(self.reticle.matrix);
        self.player.newPath(self.workingVec3);
      } else {
        self.player.object.visible = true;
        self.player.object.position.setFromMatrixPosition(self.reticle.matrix);
      }
    }
  }

  requestHitTestSource() {
    const self = this;
    const session = this.renderer.xr.getSession();
    session.addEventListener('select', this.onSelect.bind(this));
    session.requestReferenceSpace('viewer').then((refSpace) => {
      session.requestHitTestSource({ space: refSpace }).then((source) => {
        self.hitTestSource = source;
      });
    });

    session.addEventListener('end', () => {
      self.hitTestSourceRequested = false;
      self.hitTestSource = null;
    });

    this.hitTestSourceRequested = true;
  }

  getHitTestResults(frame) {
    const results = frame.getHitTestResults(this.hitTestSource);
    if (results.length) {
      const refSpace = this.renderer.xr.getReferenceSpace();
      const hit = results[0];
      const pose = hit.getPose(refSpace);

      this.reticle.visible = true;
      this.reticle.matrix.fromArray(pose.transform.matrix);
    } else {
      this.reticle.visible = false;
    }
  }

  render(timestamp, frame) {
    const dt = this.clock.getDelta();
    if (this.player) this.player.update(dt);
    if (frame) {
      if (this.hitTestSourceRequested === false) this.requestHitTestSource();

      if (this.hitTestSource) this.getHitTestResults(frame);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

export { App };
