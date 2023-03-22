import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls.js";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import TWEEN from "@tweenjs/tween.js";
type modelConfig = {
  basePath: string;
  modelUrl: string;
  materialUrl?: string;
};

class RenderScene3d {
  private gltfLoader: GLTFLoader;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: FirstPersonControls;
  private animationId: number;
  private objBoxSize = 0;
  private objBoxCenter: THREE.Vector3 = new THREE.Vector3();
  private clock: THREE.Clock = new THREE.Clock();
  private floorMesh?: THREE.Mesh;

  private defaultSize = {
    width: 512,
    height: 512,
  };
  constructor(el: HTMLElement) {
    this.container = el;

    this.gltfLoader = new GLTFLoader();
    this.animationId = 0;

    //初始化scene
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 50, 0);
    pointLight.castShadow = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfe3dd);
    this.scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 1));
    this.scene.add(pointLight);

    const helper = new THREE.AxesHelper(50);
    this.scene.add(helper);

    //初始化camera
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 5, 0);
    this.camera.lookAt(this.camera.position);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new FirstPersonControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.lookSpeed = 0.05;
    this.controls.movementSpeed = 0;
    this.controls.constrainVertical = true;
    this.controls.verticalMin = 1.0;
    this.controls.verticalMax = 2.0;
  }

  //创建射线检测，绑定到相机上
  initRaycaster() {
    const raycaster = new THREE.Raycaster(
      this.camera.position,
      this.camera.getWorldDirection(new THREE.Vector3())
    );
    const rayDirection = new THREE.Vector3(0, -1, 0); // 射线的方向向量，指向地面
    const rayDistance = 10; // 射线的长度
    raycaster.set(this.camera.position, rayDirection);
  }

  initRenderer() {
    const width = this.container.offsetWidth;
    const height = this.container?.offsetHeight;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);
  }

  render(obj: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(obj);
    const boxSize = box.getSize(new THREE.Vector3()).length();
    const boxCenter = box.getCenter(new THREE.Vector3());
    this.objBoxSize = boxSize;
    this.objBoxCenter = boxCenter;
    this.centerScale(obj);
    this.scene.add(obj);
    this.start();
  }

  private start() {
    if (this.camera) {
      this.renderer?.clear();
      this.controls?.update(this.clock.getDelta());
      this.renderer?.render(this.scene, this.camera);
      TWEEN.update();
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
        // gltf.scene.traverse((n) => {
        //   if (n.name === "head") OOI.head = n;
        //   if (n.name === "lowerarm_l") OOI.lowerarm_l = n;
        //   if (n.name === "Upperarm_l") OOI.Upperarm_l = n;
        //   if (n.name === "hand_l") OOI.hand_l = n;
        //   if (n.name === "target_hand_l") OOI.target_hand_l = n;

        //   if (n.name === "boule") OOI.sphere = n;
        //   if (n.name === "Kira_Shirt_left") OOI.kira = n;

        //   if (n.isMesh) n.frustumCulled = false;
        // });
        console.log(gltf);
        const model = gltf.scene;
        model.position.set(0, 0, 0);
        // model.scale.set(0.01, 0.01, 0.01);
        resolve(model);
      });
    });
  }

  addMouseEvent() {
    const mouse = new THREE.Vector2();
    this.renderer.domElement.addEventListener("mousedown", (e) => {
      mouse.x = (e.clientX / this.container.offsetWidth) * 2 - 1;
      mouse.y = -(e.clientY / this.container.offsetHeight) * 2 + 1;
      this.raycaster.setFromCamera(mouse, this.camera);
      if (!this.floorMesh) return;

      const intersects = this.raycaster.intersectObject(this.floorMesh, true);
      // const firstObjectName = intersects[0].object.name;
      // debugger;
      if (intersects.length) {
        //触碰到地板

        // console.log(intersects[0].object.name, intersects[0].point);
        const clickPoint = intersects[0].point;
        const boxMaxY = new THREE.Box3().setFromObject(intersects[0].object).max
          .y;

        const distance = boxMaxY + 10;
        const angel = Math.PI / 5;

        const position = {
          x: clickPoint.x,
          y: this.camera.position.y,
          z: clickPoint.z,
        };

        const tween = new TWEEN.Tween(this.camera.position).to(position, 1000);
        const tween1 = new TWEEN.Tween(this.controls.object).to(
          intersects[0].object.position,
          3000
        );

        this.controls.enabled = false;
        tween.onComplete(() => {
          this.controls.enabled = true;
        });

        tween.start();
        tween1.start();
      }
    });
  }

  // 控制相机居中，全屏渲染模型
  centerScale(group: THREE.Object3D) {
    // 包围盒计算模型对象的大小和位置
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const groundGeometry = new THREE.PlaneGeometry(400, 400, 10, 10);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotateX(-Math.PI / 2);
    ground.position.set(center.x, box.min.y + 1, center.z);
    ground.name = "ground";
    this.floorMesh = ground;
    this.scene.add(ground);

    // 计算包围盒的最大边长
    function maxSize(vec3: THREE.Vector3) {
      let max;
      if (vec3.x > vec3.y) {
        max = vec3.x;
      } else {
        max = vec3.y;
      }
      if (max > vec3.z) {
        //
      } else {
        max = vec3.z;
      }
      return max;
    }
    const max = maxSize(size); //包围盒长宽高中最大的一个值，用来表征模型的尺寸
    // 1.相机位于模型包围盒之外  算法：模型世界坐标三个分量分别+1.5倍max
    const cameraPosition = new THREE.Vector3(
      center.x - size.x / 2,
      2,
      center.z
    );
    // debugger;
    this.camera.position.set(center.x - size.x / 2, 2, center.z);
    this.camera.scale.set(20, 20, 20);
    // this.camera.up.set(0, 0, 1);
    // 2. 居中渲染：设置相机目标观察点，指向包围盒几何中心
    this.camera.lookAt(center.x, 2, center.z);
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
    // this.controls.object.copy(center);
  }

  destroy() {
    this.renderer?.dispose();
    this.scene?.clear();
  }
}

export default RenderScene3d;
