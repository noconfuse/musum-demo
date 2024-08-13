import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
// import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { ShaderPass } from "@/utils/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";
import CustomControls from "./CustomControls";

import TWEEN from "@tweenjs/tween.js";
type modelConfig = {
  basePath: string;
  modelUrl: string;
  materialUrl?: string;
};

class RenderScene3d {
  private gltfLoader: GLTFLoader;
  private textureloader: THREE.TextureLoader = new THREE.TextureLoader();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: CustomControls;
  private animationId: number;
  private objBoxSize: THREE.Vector3 = new THREE.Vector3();
  private objBoxCenter: THREE.Vector3 = new THREE.Vector3();
  private clock: THREE.Clock = new THREE.Clock();
  private floorMesh?: THREE.Mesh;
  private objBox: THREE.Box3 = new THREE.Box3();
  private composer?: EffectComposer;
  private tips: THREE.Object3D[] = [];
  private textObjects: THREE.Object3D[] = []; //所有带有文本的对象
  private audioLoader: THREE.AudioLoader = new THREE.AudioLoader();
  private audioListener: THREE.AudioListener = new THREE.AudioListener();
  private fontLoader: FontLoader = new FontLoader();
  private light: THREE.HemisphereLight = new THREE.HemisphereLight(
    0xffffbb,
    0x080820,
    1
  );

  constructor(el: HTMLElement) {
    this.container = el;

    this.gltfLoader = new GLTFLoader();
    this.animationId = 0;

    //初始化scene

    const pointLight = new THREE.PointLight(0xffffff, 1, 1000);
    pointLight.position.set(0, 50, 0);
    pointLight.castShadow = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfe3dd);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const directLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.scene.add(directLight);
    // const lightHelper = new THREE.DirectionalLightHelper(directLight, 50000);
    // this.scene.add(lightHelper);
    // this.scene.add(pointLight);
    // const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);

    this.scene.add(this.light);

    const helper = new THREE.AxesHelper(5000);
    this.scene.add(helper);

    //初始化camera
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.camera.scale.set(2, 2, 2);
    this.camera.add(this.audioListener);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMappingExposure = 0;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new CustomControls(
      this.camera,
      this.renderer.domElement,
      this.scene
    );
    this.controls.initEvents();
    // this.controls.lookSpeed = 0.08;
    // this.controls.movementSpeed = 0;
    // this.controls.constrainVertical = true;
    // this.controls.heightCoef = 0.5;
    // this.controls.verticalMin = 1.0;
    // this.controls.verticalMax = 2.0;
  }

  initRenderer() {
    const width = this.container.offsetWidth;
    const height = this.container?.offsetHeight;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);
  }

  //创建几何立方体
  createBoxGeometry() {
    const boxGeometry = new THREE.BoxGeometry(15, 15, 15);
    const meterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cube = new THREE.Mesh(boxGeometry, meterial);

    cube.userData = {
      text: "demo picture",
      imageUrl:
        "https://lmg.jj20.com/up/allimg/1114/0406210Z024/2104060Z024-5-1200.jpg",
      soundUrl: "/static/audio.mp3",
    };
    cube.position.set(
      this.objBoxCenter.x - 100,
      this.objBox.min.y + 18,
      this.objBoxCenter.z
    );
    this.textObjects.push(cube);
    this.scene.add(cube);

    // 创建平面几何体，放置图片
    const planeGeometry = new THREE.PlaneGeometry(15, 15);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    const texture = this.textureloader.load("/static/test.jpg");
    plane.material = new THREE.MeshBasicMaterial({ map: texture });

    plane.rotation.y = Math.PI;
    planeGeometry.center();
    plane.position.set(
      this.objBoxCenter.x - 100,
      this.objBox.min.y + 18,
      this.objBoxCenter.z - 7.6
    );
    this.scene.add(plane);
  }

  updateEle() {
    this.tips.forEach((tip) => {
      tip.lookAt(this.camera.position);
    });
    this.textObjects.forEach((obj) => {
      const vector = new THREE.Vector3();
      vector.subVectors(obj.position, this.camera.position);
      vector.normalize();
      this.raycaster.set(this.camera.position, vector);
      const intersects = this.raycaster.intersectObject(obj);
      if (intersects.length > 0) {
        const distance = this.camera.position.distanceTo(intersects[0].point);
        if (distance < 40) {
          console.log("靠近了");
          this.triggerNearTips(obj, intersects[0].point);
        }
      }
    });
  }

  //创建地板
  createFloor() {
    const groundGeometry = new THREE.PlaneGeometry(1500, 1500, 10, 10);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotateX(-Math.PI / 2);
    ground.position.set(
      this.objBoxCenter.x,
      this.objBox.min.y + 15,
      this.objBoxCenter.z
    );
    ground.name = "ground";
    this.floorMesh = ground;
    this.scene.add(ground);
  }

  render(obj: THREE.Object3D) {
    this.objBox = new THREE.Box3().setFromObject(obj);

    this.objBoxSize = this.objBox.getSize(new THREE.Vector3());
    this.objBoxCenter = this.objBox.getCenter(new THREE.Vector3());

    this.scene.add(obj);
    this.adjustLights();
    this.centerScale();
    //TODO test
    this.createBoxGeometry();
    this.createFloor();

    this.start();
  }

  private start() {
    if (this.camera) {
      this.renderer?.clear();
      this.renderer?.render(this.scene, this.camera);
      this.updateEle();
      this.controls.update(this.clock.getDelta());
      this.composer?.render();
      this.animationId = requestAnimationFrame(this.start.bind(this));
    }
  }

  async loadModel(options: modelConfig): Promise<THREE.Object3D> {
    const dracoLoader = new DRACOLoader();
    const { basePath, materialUrl, modelUrl } = options;
    dracoLoader.setDecoderPath("/static/draco/");
    dracoLoader.setDecoderConfig({ type: "js" });
    dracoLoader.preload();
    this.gltfLoader.setDRACOLoader(dracoLoader);

    return new Promise((resolve) => {
      this.gltfLoader.setPath(basePath);
      this.gltfLoader.load(modelUrl, (gltf) => {
        // console.log(gltf);
        const model = gltf.scene;

        this.wrapperModel(model);
        model.position.set(0, 0, 0);
        model.scale.set(0.5, 0.5, 0.5);
        resolve(model);
      });
    });
  }
  //给模型添加自定义数据
  wrapperModel(model: THREE.Object3D) {
    console.log(model.children);
  }

  triggerClickTips(obj: THREE.Object3D) {
    const { imageUrl } = obj.userData;
    // TODO mock
    if (obj.name === "LOD3_002") {
      const objBox = new THREE.Box3().setFromObject(obj);
      const objBoxSize = objBox.getSize(new THREE.Vector3());
      const objBoxCenter = objBox.getCenter(new THREE.Vector3());
      const loader = new FontLoader();
      loader.load("static/fonts/helvetiker_regular.typeface.json", (font) => {
        const textGeomerty = new TextGeometry("castle", {
          font,
          size: objBoxSize.x / 18,
          height: 0.01,
          curveSegments: 12,
          bevelEnabled: false,
        });
        textGeomerty.center();
        const textMaterial = new THREE.MeshBasicMaterial({
          color: "0xffffff",
        });
        // textGeomerty.computeBoundingBox();

        const textMesh = new THREE.Mesh(textGeomerty, textMaterial);

        textMesh.position.set(objBoxCenter.x, objBox.max.y + 2, objBoxCenter.z);
        this.tips.push(textMesh);
        this.scene.add(textMesh);
      });
    }
  }

  triggerNearTips(obj: THREE.Object3D, point: THREE.Vector3) {
    const userData = obj.userData;
    if (userData.hasTrigged) {
      return;
    }
    userData.hasTrigged = true;
    const { soundUrl, text } = userData;
    if (soundUrl) {
      this.audioLoader.load(soundUrl, (buffer) => {
        const sound = new THREE.PositionalAudio(this.audioListener);
        obj.add(sound);
        sound.setBuffer(buffer);
        sound.setRefDistance(10);
        sound.loop = true;
        sound.play();
      });
    }
    if (text) {
      this.fontLoader.load(
        "static/fonts/helvetiker_regular.typeface.json",
        (font) => {
          const objBox = new THREE.Box3().setFromObject(obj);
          const objBoxSize = objBox.getSize(new THREE.Vector3());
          const objBoxCenter = objBox.getCenter(new THREE.Vector3());
          const textGeomerty = new TextGeometry(text, {
            font,
            size: 3,
            height: 0.01,
            curveSegments: 12,
            bevelEnabled: false,
          });
          textGeomerty.center();
          const textMaterial = new THREE.MeshBasicMaterial({
            color: "0x000000",
          });

          const textMesh = new THREE.Mesh(textGeomerty, textMaterial);

          textMesh.position.set(
            objBoxCenter.x,
            objBox.max.y + 3,
            objBoxCenter.z
          );
          this.tips.push(textMesh);
          // const objBox = new THREE.Box3().setFromObject(obj);
          // const objBoxCenter = objBox.getCenter(new THREE.Vector3());
          // obj.add(textMesh);
          this.scene.add(textMesh);
        }
      );
    }
  }

  addEvents() {
    const mouse = new THREE.Vector2();
    this.renderer.domElement.addEventListener("click", (e) => {
      mouse.x = (e.clientX / this.container.offsetWidth) * 2 - 1;
      mouse.y = -(e.clientY / this.container.offsetHeight) * 2 + 1;
      this.raycaster.setFromCamera(mouse, this.camera);
      const boxIntersects = this.raycaster.intersectObject(this.scene, true);
      if (boxIntersects.length > 0) {
        const clickObj = boxIntersects[0].object;
        this.controls.enabled = false;
        if (clickObj.name !== "ground") {
          this.outlineObj([boxIntersects[0].object]);
          this.triggerClickTips(boxIntersects[0].object);
        }
      }
    });
    this.renderer.domElement.addEventListener("mouseup", () => {
      this.controls.enabled = true;
    });

    window.onresize = () => {
      this.camera.aspect =
        this.container.offsetWidth / this.container.offsetHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
  }

  adjustLights() {
    const hemiLight = new THREE.HemisphereLight(0x0000ff, 0x00ff00, 2);
    hemiLight.position.set(
      this.objBoxCenter.x,
      this.objBoxCenter.y + 800,
      this.objBoxCenter.z
    );
    this.scene.add(hemiLight);
  }

  // 控制相机居中，全屏渲染模型
  centerScale() {
    this.camera.position.set(
      this.objBoxCenter.x - this.objBoxSize.x / 2,
      this.objBox.min.y + 25,
      this.objBoxCenter.z - this.objBoxSize.z / 2
    );

    // 2. 居中渲染：设置相机目标观察点，指向包围盒几何中心
    this.camera.lookAt(
      this.objBoxCenter.x,
      this.objBox.min.y + 25,
      this.objBoxCenter.z
    );
    this.light.position.set(0, 0, 1);
    // this.camera.rotateY(-Math.PI / 2);
    // 3.全屏渲染：渲染范围和模型尺寸相近 模型尺寸用长宽高其中最大值表征
    // const s = max / 2; //如果全屏渲染s是max 2倍左右
    // this.camera.left = -s * k;
    // this.camera.right = s * k;
    // camera.top = s;
    // camera.bottom = -s;
    // this.camera.near = max * 0.1; //最好和相机位置或者说包围盒关联，别设置0.1 1之类看似小的值
    // this.camera.far = max * 4; //根据相机位置和包围大小设置，把包围盒包含进去即可，宁可把偏大，不可偏小
    // this.camera.updateProjectionMatrix(); //渲染范围改变，注意更新投影矩阵

    // 如果使用了相机控件，与上面lookAt代码冲突，注意设置.target属性
    // this.controls.enablePan = false;
    // this.controls.enableZoom = false;
    // this.controls.maxPolarAngle = Math.PI / 2;
    // this.controls.minPolarAngle = Math.PI / 3;
    // this.controls.target.copy(
    //   new THREE.Vector3(
    //     this.objBoxCenter.x,
    //     this.objBox.min.y + 25,
    //     this.objBoxCenter.z
    //   )
    // );
    // this.controls.update();
  }
  outlineObj(selectedObjects: THREE.Object3D[]) {
    // 创建一个EffectComposer（效果组合器）对象，然后在该对象上添加后期处理通道。
    this.composer = new EffectComposer(this.renderer);
    // 新建一个场景通道  为了覆盖到原理来的场景上
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    // 物体边缘发光通道
    const outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.camera,
      selectedObjects
    );
    outlinePass.selectedObjects = selectedObjects;
    outlinePass.edgeStrength = 10.0; // 边框的亮度
    outlinePass.edgeGlow = 1; // 光晕[0,1]
    outlinePass.usePatternTexture = false; // 是否使用父级的材质
    outlinePass.edgeThickness = 1.0; // 边框宽度
    outlinePass.downSampleRatio = 1; // 边框弯曲度
    outlinePass.pulsePeriod = 5; // 呼吸闪烁的速度
    outlinePass.visibleEdgeColor.set(0x00ff00); // 呼吸显示的颜色
    outlinePass.hiddenEdgeColor = new THREE.Color(0, 0, 0); // 呼吸消失的颜色
    outlinePass.clear = true;
    this.composer.addPass(outlinePass);
    // 自定义的着色器通道 作为参数
    const effectFXAA = new ShaderPass(FXAAShader);
    effectFXAA.uniforms.resolution.value.set(
      1 / this.container.offsetWidth,
      1 / this.container.offsetHeight
    );
    effectFXAA.renderToScreen = true;
    this.composer.addPass(effectFXAA);
  }

  destroy() {
    this.renderer?.dispose();
    this.scene?.clear();
  }
}

export default RenderScene3d;
