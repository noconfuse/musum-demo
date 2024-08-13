import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

class CustomControls {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private docElement: HTMLCanvasElement;
  private raycaster: THREE.Raycaster;
  private startPoint: THREE.Vector2 = new THREE.Vector2();
  private isPressDown = false;
  private startEuler: THREE.Euler = new THREE.Euler(0, 0, 0, "YXZ");
  private pointerSpeed = 1.0;
  private _PI_2 = Math.PI / 2;
  private maxPolarAngle = Math.PI / 8;
  private minPolarAngle = -Math.PI / 16;
  private _enabled = true;
  private moveBaseObjectName = "ground";
  private moveTween?: TWEEN.Tween<THREE.Vector3>;
  constructor(
    camera: THREE.Camera,
    docElement: HTMLCanvasElement,
    scene: THREE.Scene
  ) {
    this.camera = camera;
    this.scene = scene;
    this.docElement = docElement;
    this.raycaster = new THREE.Raycaster();
  }
  public set enabled(b: boolean) {
    this._enabled = b;
  }
  public initEvents(options: { moveBaseObjectName?: string } = {}) {
    this.docElement.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.docElement.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.docElement.addEventListener("mouseup", this.onMouseUp.bind(this));
    if (options.moveBaseObjectName) {
      this.moveBaseObjectName = options.moveBaseObjectName;
    }
  }

  private remoteEvents() {
    this.docElement.removeEventListener(
      "mousedown",
      this.onMouseDown.bind(this)
    );
    this.docElement.removeEventListener(
      "mousemove",
      this.onMouseMove.bind(this)
    );
    this.docElement.removeEventListener("mouseup", this.onMouseUp.bind(this));
  }

  private onMouseDown(e: MouseEvent) {
    e.preventDefault();
    this.moveTween?.stop();
    if (e.which == 1) {
      this.isPressDown = true;
      this.startEuler.setFromQuaternion(this.camera.quaternion);
      this.startPoint.x = e.clientX;
      this.startPoint.y = e.clientY;
    }
  }
  private onMouseMove(e: MouseEvent) {
    if (!this.isPressDown) return;
    const offsetX = e.clientX - this.startPoint.x;
    const offsetY = e.clientY - this.startPoint.y;
    const euler = new THREE.Euler(0, 0, 0, "YXZ");
    euler.y = this.startEuler.y + offsetX * 0.002 * this.pointerSpeed;
    euler.x = this.startEuler.x + offsetY * 0.002 * this.pointerSpeed;
    euler.z = this.startEuler.z;
    console.log(euler.x);
    // euler.x = Math.max(
    //   this._PI_2 - this.maxPolarAngle,
    //   Math.min(this._PI_2 - this.minPolarAngle, euler.x)
    // );
    if (euler.x < this.minPolarAngle) {
      euler.x = this.minPolarAngle;
    }
    if (euler.x > this.maxPolarAngle) {
      euler.x = this.maxPolarAngle;
    }
    this.camera.quaternion.setFromEuler(euler);
  }

  private onMouseUp(e: MouseEvent) {
    e.preventDefault();
    if (e.which == 1) {
      this.isPressDown = false;
      const x = e.clientX;
      const y = e.clientY;
      if (this.startPoint.x == x && this.startPoint.y == y) {
        this.move(e);
      }
    }
  }

  update(dt: number) {
    TWEEN.update();
  }

  private move(e: MouseEvent) {
    const mouse = new THREE.Vector2();
    mouse.x = (e.clientX / this.docElement.offsetWidth) * 2 - 1;
    mouse.y = -(e.clientY / this.docElement.offsetHeight) * 2 + 1;
    this.raycaster.setFromCamera(mouse, this.camera);
    const boxIntersects = this.raycaster.intersectObject(this.scene, true);
    if (boxIntersects.length > 0) {
      const clickObj = boxIntersects[0].object;
      if (clickObj.name == this.moveBaseObjectName) {
        const clickPoint = boxIntersects[0].point;

        const position = {
          x: clickPoint.x,
          y: this.camera.position.y,
          z: clickPoint.z,
        };

        this.moveTween = new TWEEN.Tween(this.camera.position).to(
          position,
          1000
        );
        this.moveTween.onComplete(() => {
          // this.controls.enabled = true;
          // const screenCenter = new THREE.Vector3(
          //   this.container.offsetWidth / 2,
          //   this.container.offsetHeight / 2,
          //   0
          // );
          // const worldCenter = screenCenter.unproject(this.controls.object);
          // this.controls.target.copy(worldCenter);
          // this.controls.target.copy(this.camera.position);
          // this.controls.update();
        });

        this.moveTween.start();
      }
    }
  }
}

export default CustomControls;
