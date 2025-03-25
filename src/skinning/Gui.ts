import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { SkinningAnimation } from "./App.js";
import { Mat4, Vec3, Vec4, Vec2, Mat2, Quat } from "../lib/TSM.js";
import { Bone } from "./Scene.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Scene } from "../lib/threejs/src/Three.js";
import { boneVSText } from "./Shaders.js";

/**
 * Might be useful for designing any animation GUI
 */
interface IGUI {
  viewMatrix(): Mat4;
  projMatrix(): Mat4;
  dragStart(me: MouseEvent): void;
  drag(me: MouseEvent): void;
  dragEnd(me: MouseEvent): void;
  onKeydown(ke: KeyboardEvent): void;
}

export enum Mode {
  playback,  
  edit  
}

	
/**
 * Handles Mouse and Button events along with
 * the the camera.
 */

export class GUI implements IGUI {
  private static readonly rotationSpeed: number = 0.05;
  private static readonly zoomSpeed: number = 0.1;
  private static readonly rollSpeed: number = 0.1;
  private static readonly panSpeed: number = 0.1;

  private camera: Camera;
  private dragging: boolean;
  private fps: boolean;
  private prevX: number;
  private prevY: number;

  private height: number;
  private viewPortHeight: number;
  private width: number;

  private animation: SkinningAnimation;

  private selectedBone: number;
  private boneDragging: boolean;

  public time: number;
  public mode: Mode;

  public hoverX: number = 0;
  public hoverY: number = 0;


  /**
   *
   * @param canvas required to get the width and height of the canvas
   * @param animation required as a back pointer for some of the controls
   * @param sponge required for some of the controls
   */
  constructor(canvas: HTMLCanvasElement, animation: SkinningAnimation) {
    this.height = canvas.height;
    this.viewPortHeight = this.height - 200;
    this.width = canvas.width;
    this.prevX = 0;
    this.prevY = 0;
    
    this.animation = animation;
    
    this.reset();
    
    this.registerEventListeners(canvas);
  }

  public getNumKeyFrames(): number {
    //TODO: Fix for the status bar in the GUI
    return 0;
  }
  
  public getTime(): number { 
  	return this.time; 
  }
  
  public getMaxTime(): number { 
    //TODO: The animation should stop after the last keyframe
    return 0;
  }

  public getSelectedBone(): number {
    return this.selectedBone;
  }

  /**
   * Resets the state of the GUI
   */
  public reset(): void {
    this.fps = false;
    this.dragging = false;
    this.time = 0;
	this.mode = Mode.edit;
    
    this.camera = new Camera(
      new Vec3([0, 0, -6]),
      new Vec3([0, 0, 0]),
      new Vec3([0, 1, 0]),
      45,
      this.width / this.viewPortHeight,
      0.1,
      1000.0
    );
  }

  /**
   * Sets the GUI's camera to the given camera
   * @param cam a new camera
   */
  public setCamera(
    pos: Vec3,
    target: Vec3,
    upDir: Vec3,
    fov: number,
    aspect: number,
    zNear: number,
    zFar: number
  ) {
    this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
  }

  /**
   * Returns the view matrix of the camera
   */
  public viewMatrix(): Mat4 {
    return this.camera.viewMatrix();
  }

  /**
   * Returns the projection matrix of the camera
   */
  public projMatrix(): Mat4 {
    return this.camera.projMatrix();
  }

  /**
   * Callback function for the start of a drag event.
   * @param mouse
   */
  public dragStart(mouse: MouseEvent): void {
    if (mouse.offsetY > 600) {
      // outside the main panel
      return;
    }
	
    // TODO: Add logic to rotate the bones, instead of moving the camera, if there is a currently highlighted bone
    
    this.dragging = true;
    this.prevX = mouse.screenX;
    this.prevY = mouse.screenY;
  }

  public incrementTime(dT: number): void {
    if (this.mode === Mode.playback) {
      this.time += dT;
      if (this.time >= this.getMaxTime()) {
        this.time = 0;
        this.mode = Mode.edit;
      }
    }
  }
  

  /**
   * The callback function for a drag event.
   * This event happens after dragStart and
   * before dragEnd.
   * @param mouse
   */
  public drag(mouse: MouseEvent): void {
    let x = mouse.offsetX;
    let y = mouse.offsetY;
    if (this.dragging) {
      const dx = mouse.screenX - this.prevX;
      const dy = mouse.screenY - this.prevY;
      this.prevX = mouse.screenX;
      this.prevY = mouse.screenY;

      /* Left button, or primary button */
      const mouseDir: Vec3 = this.camera.right();
      mouseDir.scale(-dx);
      mouseDir.add(this.camera.up().scale(dy));
      mouseDir.normalize();

      if (dx === 0 && dy === 0) {
        return;
      }

      switch (mouse.buttons) {
        case 1: {
          let rotAxis: Vec3 = Vec3.cross(this.camera.forward(), mouseDir);
          rotAxis = rotAxis.normalize();

          if (this.fps) {
            this.camera.rotate(rotAxis, GUI.rotationSpeed);
          } else {
            this.camera.orbitTarget(rotAxis, GUI.rotationSpeed);
          }
          break;
        }
        case 2: {
          /* Right button, or secondary button */
          this.camera.offsetDist(Math.sign(mouseDir.y) * GUI.zoomSpeed);
          break;
        }
        default: {
          break;
        }
      }
    } else { // hovering
      let bones: Bone[] = this.animation.getScene().meshes[0].bones;
      let ndc: Vec4 = new Vec4([ ((2.0 * x) / this.width) - 1.0, 1.0 - ((2.0 * y) / this.viewPortHeight), -1.0, 0.0]);
      let V_inv: Mat4 = new Mat4();
      let P_inv: Mat4 = new Mat4();
      this.viewMatrix().inverse(V_inv);
      this.projMatrix().inverse(P_inv);
      let q: Vec4 = new Vec4([ndc.x, ndc.y, 0.0, 1.0]);
      let p: Vec4 = new Vec4([ndc.x, ndc.y, 1.0, 1.0]);
      q.multiplyMat4(P_inv);
      p.multiplyMat4(P_inv);
      let q_world: Vec4 = new Vec4();
      q.multiplyMat4(V_inv, q_world);
      q_world.scale(1.0 / q_world.w);
      let p_world: Vec4 = new Vec4();
      p.multiplyMat4(V_inv, p_world);
      p_world.scale(1.0 / p_world.w);
      let ray: Vec4 = new Vec4();
      p_world.subtract(q_world, ray);
      ray.w = 0.0;
      ray.normalize();
      // let ray_origin: Vec4 = p_world.copy();
      // ray_origin.w = 1.0;
      let ray_origin: Vec4 = new Vec4([this.camera.pos().x, this.camera.pos().y, this.camera.pos().z, 1.0]);
      P_inv.multiplyVec4(ray_origin);
      ray_origin.w = 1.0;

      let min_t: number = Number.MAX_SAFE_INTEGER;
      this.selectedBone = -1;
      bones.forEach((curr, index) => {
        let boneD: Mat4 = curr.getDMatrix();
        // console.log("boneD Matrix: ", boneD.all());

        let Dinv: Mat4 = new Mat4();
        boneD.inverse(Dinv);
        
        // console.log("ray origin: ", ray_origin.xyzw);
        // console.log("ray dir: ", ray.xyzw);

        let origin_local: Vec4 = new Vec4();
        Dinv.multiplyVec4(ray_origin, origin_local);

        console.log("origin_local: ", origin_local.xyzw);
        console.log("origin_global: ", ray_origin.xyzw);
        let dir_local: Vec4 = new Vec4();
        Dinv.multiplyVec4(ray, dir_local);
        dir_local.normalize();
        console.log("dir_local: ", dir_local.xyzw);
        console.log("dir_global: ", ray.xyzw);

        let joint_local: Vec4 = new Vec4();
        Dinv.multiplyVec4(new Vec4([curr.position.x, curr.position.y, curr.position.z, 1.0]), joint_local);
        let endpoint_local: Vec4 = new Vec4();
        Dinv.multiplyVec4(new Vec4([curr.endpoint.x, curr.endpoint.y, curr.endpoint.z, 1.0]), endpoint_local);

        let min_y: number = Math.min(joint_local.y, endpoint_local.y);
        let max_y: number = Math.max(joint_local.y, endpoint_local.y);
        // let height: number = Vec3.distance(curr.position, curr.endpoint);
        // console.log ("height:" + height);
        // console.log("joint local: ", joint_local.xyz);
        // console.log("endpoint local: ", endpoint_local.xyz);
        console.log("joint world: ", curr.position.xyz);
        console.log("endpoint world: ", curr.endpoint.xyz);
        // console.log("min_y: ", min_y);
        // console.log("max_y: ", max_y);

        let a: number = dir_local.x * dir_local.x + dir_local.z * dir_local.z;
        // console.log("a: " + a + "\n");
        let b: number = 2 * (dir_local.x * origin_local.x + dir_local.z * origin_local.z);
        // console.log("b: " + b + "\n");
        let c: number = origin_local.x * origin_local.x + origin_local.z * origin_local.z - (0.05 * 0.05); // radius = 0.1
        // console.log("c: " + c + "\n");

        let discriminant: number = b * b - 4 * a * c;
        // console.log("Discriminant: " + discriminant + "\n");
        let do_t2: boolean = false;
        if (discriminant >= 0) {
          let t1: number = (-b - Math.sqrt(discriminant)) / (2 * a);
          if (t1 >= 0) {
            console.log("t1: " + t1 + "\n");
            let y1: number = origin_local.y + (dir_local.y * t1);
            console.log("y1: ", y1);
            // if (y1 <= 0 && y1 <= height) {
            if(y1 >= min_y && y1 <= max_y) {
              if (t1 < min_t) {
                min_t = t1;
                this.selectedBone = index;
              }
            } else {
              do_t2 = true;
            }
          } else {
            do_t2 = true;
          }
          
          if (do_t2) {
            let t2: number = (-b + Math.sqrt(discriminant)) / (2 * a);
            console.log("t2: " + t2 + "\n");
            let y2: number = origin_local.y + (dir_local.y * t2);
            console.log("y2: ", y2);
            // if (t2 < min_t && y2 >= 0 && y2 <= height) {
            if (t2 < min_t && y2 >= min_y && y2 <= max_y) {
              min_t = t2;
              this.selectedBone = index;
            }
          }
        }
        // console.log("Selected Bone Index: " + this.selectedBone + "\n");
      });      
    } 
    // TODO: Add logic here:
    // 1) To highlight a bone, if the mouse is hovering over a bone;
    // 2) To rotate a bone, if the mouse button is pressed and currently highlighting a bone.
  }
  
 
  public getModeString(): string {
    switch (this.mode) {
      case Mode.edit: { return "edit: " + this.getNumKeyFrames() + " keyframes"; }
      case Mode.playback: { return "playback: " + this.getTime().toFixed(2) + " / " + this.getMaxTime().toFixed(2); }
    }
  }
  
  /**
   * Callback function for the end of a drag event
   * @param mouse
   */
  public dragEnd(mouse: MouseEvent): void {
    this.dragging = false;
    this.prevX = 0;
    this.prevY = 0;
   
    // TODO: Handle ending highlight/dragging logic as needed
    this.selectedBone = -1;
  }

  /**
   * Callback function for a key press event
   * @param key
   */
  public onKeydown(key: KeyboardEvent): void {
    switch (key.code) {
      case "Digit1": {
        this.animation.setScene("./static/assets/skinning/split_cube.dae");
        break;
      }
      case "Digit2": {
        this.animation.setScene("./static/assets/skinning/long_cubes.dae");
        break;
      }
      case "Digit3": {
        this.animation.setScene("./static/assets/skinning/simple_art.dae");
        break;
      }      
      case "Digit4": {
        this.animation.setScene("./static/assets/skinning/mapped_cube.dae");
        break;
      }
      case "Digit5": {
        this.animation.setScene("./static/assets/skinning/robot.dae");
        break;
      }
      case "Digit6": {
        this.animation.setScene("./static/assets/skinning/head.dae");
        break;
      }
      case "Digit7": {
        this.animation.setScene("./static/assets/skinning/wolf.dae");
        break;
      }
      case "KeyW": {
        this.camera.offset(
            this.camera.forward().negate(),
            GUI.zoomSpeed,
            true
          );
        break;
      }
      case "KeyA": {
        this.camera.offset(this.camera.right().negate(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyS": {
        this.camera.offset(this.camera.forward(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyD": {
        this.camera.offset(this.camera.right(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyR": {
        this.animation.reset();
        break;
      }
      case "ArrowLeft": {
		//TODO: Handle bone rolls when a bone is selected
		this.camera.roll(GUI.rollSpeed, false);
        break;
      }
      case "ArrowRight": {
		//TODO: Handle bone rolls when a bone is selected
		this.camera.roll(GUI.rollSpeed, true);
        break;
      }
      case "ArrowUp": {
        this.camera.offset(this.camera.up(), GUI.zoomSpeed, true);
        break;
      }
      case "ArrowDown": {
        this.camera.offset(this.camera.up().negate(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyK": {
        if (this.mode === Mode.edit) {
		//TODO: Add keyframes if required by project spec
        }
        break;
      }      
      case "KeyP": {
        if (this.mode === Mode.edit && this.getNumKeyFrames() > 1)
        {
          this.mode = Mode.playback;
          this.time = 0;
        } else if (this.mode === Mode.playback) {
          this.mode = Mode.edit;
        }
        break;
      }
      default: {
        console.log("Key : '", key.code, "' was pressed.");
        break;
      }
    }
  }

  /**
   * Registers all event listeners for the GUI
   * @param canvas The canvas being used
   */
  private registerEventListeners(canvas: HTMLCanvasElement): void {
    /* Event listener for key controls */
    window.addEventListener("keydown", (key: KeyboardEvent) =>
      this.onKeydown(key)
    );

    /* Event listener for mouse controls */
    canvas.addEventListener("mousedown", (mouse: MouseEvent) =>
      this.dragStart(mouse)
    );

    canvas.addEventListener("mousemove", (mouse: MouseEvent) =>
      this.drag(mouse)
    );

    canvas.addEventListener("mouseup", (mouse: MouseEvent) =>
      this.dragEnd(mouse)
    );

    /* Event listener to stop the right click menu */
    canvas.addEventListener("contextmenu", (event: any) =>
      event.preventDefault()
    );
  }
}
