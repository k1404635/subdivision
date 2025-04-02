import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { SkinningAnimation } from "./App.js";
import { Mat4, Vec3, Vec4, Vec2, Mat2, Quat } from "../lib/TSM.js";
import { Bone } from "./Scene.js";
import { Keyframe } from "./Scene.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Scene } from "../lib/threejs/src/Three.js";

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

  private our_prevX: number;
  private our_prevY: number;

  private height: number;
  private viewPortHeight: number;
  private width: number;
  private viewPortWidth: number;

  private animation: SkinningAnimation;

  private selectedBone: number = -1;

  private selectedKeyframe: number = -1;

  public time: number;
  public mode: Mode;

  public hoverX: number = 0;
  public hoverY: number = 0;

  public dragStartKF: number = -1;


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
    this.viewPortWidth = this.width - 320;
    this.prevX = 0;
    this.prevY = 0;
    
    this.animation = animation;
    
    this.reset();
    
    this.registerEventListeners(canvas);
  }

  public getNumKeyFrames(): number {
    //TODO: Fix for the status bar in the GUI
    return this.animation.getScene().meshes[0].keyframes.length;
  }
  
  public getTime(): number { 
  	return this.time; 
  }
  
  public getMaxTime(): number { 
    //TODO: The animation should stop after the last keyframe
    let keyframes: Keyframe[] = this.animation.getScene().meshes[0].keyframes;
    if(keyframes.length == 0)
      return 0;

    let last: Keyframe = keyframes[keyframes.length - 1];
    return last.startTime + last.duration;
  }

  public getSelectedBone(): number {
    return this.selectedBone;
  }

  public getSelectedKF(): number {
    return this.selectedKeyframe;
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
      this.viewPortWidth / this.viewPortHeight,
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

  private whichKF(x: number, y: number): number {
    if (y >= 24 && y <= 200 && x >= 800 && x <= 1120)
      return 0;
    else if (y >= 216 && y <= 392 && x >= 800 && x <= 1120)
      return 1;
    else if (408 <= y && y <= 584 && x >= 800 && x <= 1120)
      return 2;
    else if (600 <= y && y <= 776 && x >= 800 && x <= 1120)
      return 3;
    return -1;
  }

  /**
   * Callback function for the start of a drag event.
   * @param mouse
   */
  public dragStart(mouse: MouseEvent): void {
    if (mouse.offsetX > 800 && mouse.offsetX < 1120 && mouse.offsetY < 800){
      this.dragStartKF = this.whichKF(mouse.offsetX, mouse.offsetY);
      return;
    } else if (mouse.offsetY > 600) {
      // outside the main panel
      return;
    } 
	
    // TODO: Add logic to rotate the bones, instead of moving the camera, if there is a currently highlighted bone
    
    this.dragging = true;
    this.prevX = mouse.screenX;
    this.prevY = mouse.screenY;
    this.our_prevX = mouse.offsetX;
    this.our_prevY = mouse.offsetY;
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
          if(this.selectedBone == -1) { // no bone to rotate
            if (this.fps) {
              this.camera.rotate(rotAxis, GUI.rotationSpeed);
            } else {
              this.camera.orbitTarget(rotAxis, GUI.rotationSpeed);
            }
          } else { // rotate highlighted bone
            let bone: Bone = this.animation.getScene().meshes[0].bones[this.selectedBone];
            let joint_world: Vec4 = new Vec4([bone.position.x, bone.position.y, bone.position.z, 1.0]);
            let joint_ndc: Vec4 = new Vec4(); 
            joint_world.multiplyMat4(this.viewMatrix().copy(), joint_ndc);
            joint_ndc.multiplyMat4(this.projMatrix().copy());
            let ndc: Vec3 = new Vec3([joint_ndc.x / joint_ndc.w, joint_ndc.y / joint_ndc.w, joint_ndc.z / joint_ndc.w]);
            let ndcx: number = (ndc.x + 1) / 2.0 * this.viewPortWidth;
            let ndcy: number = (1 - ndc.y) / 2.0 * this.viewPortHeight;
            let joint_screen: Vec3 = new Vec3([ndcx, ndcy, 0.0]);
            
            let prev_mouse: Vec3 = new Vec3([this.our_prevX, this.our_prevY, 0.0]);
            let curr_mouse: Vec3 = new Vec3([x, y, 0.0]);
            let joint_prev_mouse: Vec3 = new Vec3();
            prev_mouse.subtract(joint_screen, joint_prev_mouse);

            let joint_curr_mouse: Vec3 = new Vec3();
            curr_mouse.subtract(joint_screen, joint_curr_mouse);

            let temp_calc: number = (Vec3.dot(joint_prev_mouse, joint_curr_mouse) / joint_prev_mouse.length()) / joint_curr_mouse.length();
            
            let angle: number = Math.acos(Math.max(-1.0, Math.min(temp_calc, 1.0)));
            let cross: Vec3  = Vec3.cross(joint_prev_mouse, joint_curr_mouse);
            if (cross.z > 0)
              angle = -angle;

            // calculate axis
            let quat: Quat = new Quat();
            Quat.fromAxisAngle(this.camera.forward().copy(), angle, quat);
            let new_R: Mat4 = new Mat4();
            new_R = quat.toMat4();
            bone.setRMatrix(new_R, this.animation.getScene().meshes[0].bones, true, true);
          }
          this.our_prevX = x;
          this.our_prevY = y;
          break;
        }
        case 2: {
          /* Right button, or secondary button */
          this.camera.offsetDist(Math.sign(mouseDir.y) * GUI.zoomSpeed);
          this.prevX = mouse.screenX;
          this.prevY = mouse.screenY;
          break;
        }
        default: {
          break;
        }
      }
    } else { // hovering
      let bones: Bone[] = this.animation.getScene().meshes[0].bones;
      let ndc: Vec4 = new Vec4([ ((2.0 * x) / this.viewPortWidth) - 1.0, 1.0 - ((2.0 * y) / this.viewPortHeight), -1.0, 0.0]);
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
      let ray_origin: Vec4 = new Vec4([this.camera.pos().x, this.camera.pos().y, this.camera.pos().z, 1.0]);
      P_inv.multiplyVec4(ray_origin);
      ray_origin.w = 1.0;

      let min_t: number = Number.MAX_SAFE_INTEGER;
      this.selectedBone = -1;
      bones.forEach((curr, index) => {
        let boneD: Mat4 = curr.getDMatrix();

        let Dinv: Mat4 = new Mat4();
        boneD.inverse(Dinv);

        let origin_local: Vec4 = new Vec4();
        Dinv.multiplyVec4(ray_origin, origin_local);

        let dir_local: Vec4 = new Vec4();
        Dinv.multiplyVec4(ray, dir_local);
        dir_local.normalize();

        let joint_local: Vec4 = new Vec4();
        Dinv.multiplyVec4(new Vec4([curr.position.x, curr.position.y, curr.position.z, 1.0]), joint_local);
        let endpoint_local: Vec4 = new Vec4();
        Dinv.multiplyVec4(new Vec4([curr.endpoint.x, curr.endpoint.y, curr.endpoint.z, 1.0]), endpoint_local);

        // align the bone to the y-axis
        let bone_vec: Vec4 = new Vec4();
        bone_vec = joint_local.subtract(endpoint_local, bone_vec);
        bone_vec.w = 1.0;
        let bone_dir = new Vec3(bone_vec.xyz);
        bone_dir.normalize();
        let target_dir: Vec3 = new Vec3([0, 1, 0]);
        let rotation_axis: Vec3 = Vec3.cross(bone_dir, target_dir);
        if (!(rotation_axis.x == 0 && rotation_axis.y == 0 && rotation_axis.z == 0)) {
          rotation_axis.normalize();
          let rotation_angle: number = Math.acos(Vec3.dot(bone_dir, target_dir));
          let quat: Quat = new Quat();
          Quat.fromAxisAngle(rotation_axis, rotation_angle, quat);
          let rotation_matrix: Mat4 = quat.toMat4();

          endpoint_local.multiplyMat4(rotation_matrix);
          joint_local.multiplyMat4(rotation_matrix);

          dir_local.multiplyMat4(rotation_matrix);
          origin_local.multiplyMat4(rotation_matrix);
        }

        let distance: number = Vec3.distance(new Vec3 (joint_local.xyz), new Vec3 (origin_local.xyz));
        let radius: number = 0.05 * (distance / 6.0);

        let a: number = dir_local.x * dir_local.x + dir_local.z * dir_local.z;
        let b: number = 2 * (dir_local.x * origin_local.x + dir_local.z * origin_local.z);
        let c: number = origin_local.x * origin_local.x + origin_local.z * origin_local.z - (0.05 * 0.05); // radius = 0.05

        let min_y: number = Math.min(joint_local.y, endpoint_local.y);
        let max_y: number = Math.max(joint_local.y, endpoint_local.y);

        let discriminant: number = b * b - 4 * a * c;
        let do_t2: boolean = false;
        if (discriminant >= 0) {
          let t1: number = (-b - Math.sqrt(discriminant)) / (2 * a);
          if (t1 >= 0) {
            let y1: number = origin_local.y + (dir_local.y * t1);
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
            let y2: number = origin_local.y + (dir_local.y * t2);
            if (t2 < min_t && y2 >= min_y && y2 <= max_y) {
              min_t = t2;
              this.selectedBone = index;
            }
          }
        }
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
    this.our_prevX = 0;
    this.our_prevY = 0;

    if (mouse.offsetX > 800 && mouse.offsetX < 1120 && mouse.offsetY < 800) {
      if(this.whichKF(mouse.offsetX, mouse.offsetY) == this.dragStartKF) 
        this.selectedKeyframe = this.dragStartKF;
      else
        this.dragStartKF = -1;
    } else {
      this.dragStartKF = -1;
    }
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
        this.animation.previewTextures = [];
        this.animation.setScene("./static/assets/skinning/split_cube.dae");
        this.selectedKeyframe = -1;
        break;
      }
      case "Digit2": {
        this.animation.previewTextures = [];
        this.animation.setScene("./static/assets/skinning/long_cubes.dae");
        this.selectedKeyframe = -1;
        break;
      }
      case "Digit3": {
        this.animation.previewTextures = [];
        this.animation.setScene("./static/assets/skinning/simple_art.dae");
        this.selectedKeyframe = -1;
        break;
      }      
      case "Digit4": {
        this.animation.previewTextures = [];
        this.animation.setScene("./static/assets/skinning/mapped_cube.dae");
        this.selectedKeyframe = -1;
        break;
      }
      case "Digit5": {
        this.animation.previewTextures = [];
        this.animation.setScene("./static/assets/skinning/robot.dae");
        this.selectedKeyframe = -1;
        break;
      }
      case "Digit6": {
        this.animation.previewTextures = [];
        this.animation.setScene("./static/assets/skinning/head.dae");
        this.selectedKeyframe = -1;
        break;
      }
      case "Digit7": {
        this.animation.previewTextures = [];
        this.animation.setScene("./static/assets/skinning/wolf.dae");
        this.selectedKeyframe = -1;
        break;
      }
      case "Digit8": {
        this.animation.previewTextures = [];
        this.animation.setScene("./static/assets/skinning/satellite.dae");
        this.selectedKeyframe = -1;
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
        this.selectedKeyframe = -1;
        break;
      }
      case "KeyZ": { //left
        this.camera = new Camera(
          new Vec3([6, 0, 0]),
          new Vec3([0, 0, 0]),
          new Vec3([0, 1, 0]),
          45,
          this.viewPortWidth / this.viewPortHeight,
          0.1,
          1000.0
        );
        break;
      }
      case "KeyX": { //right
        this.camera = new Camera(
          new Vec3([-6, 0, 0]),
          new Vec3([0, 0, 0]),
          new Vec3([0, 1, 0]),
          45,
          this.viewPortWidth / this.viewPortHeight,
          0.1,
          1000.0
        );
        break;
      }
      case "KeyC": { //front
        this.camera = new Camera(
          new Vec3([0, 0, -6]),
          new Vec3([0, 0, 0]),
          new Vec3([0, 1, 0]),
          45,
          this.viewPortWidth / this.viewPortHeight,
          0.1,
          1000.0
        );
        break;
      }
      case "KeyB": {
        this.camera = new Camera(
          new Vec3([0, 6, 0]),
          new Vec3([0, 0, 0]),
          new Vec3([0, 0, 1]),
          45,
          this.viewPortWidth / this.viewPortHeight,
          0.1,
          1000.0
        );
        break;
      }
      case "KeyV": { //back
        this.camera = new Camera(
          new Vec3([0, 0, 6]),
          new Vec3([0, 0, 0]),
          new Vec3([0, 1, 0]),
          45,
          this.viewPortWidth / this.viewPortHeight,
          0.1,
          1000.0
        );
        break;
      }
      case "KeyG": {
        let bones: Bone[] = this.animation.getScene().meshes[0].bones;
        for (let i: number = 0; i < bones.length; i++) {
          let curr: Bone = bones[i];
          curr.setRMatrix((new Mat4()).setIdentity(), bones, false, false);
        }
        break;
      }
      case "ArrowLeft": {
        //TODO: Handle bone rolls when a bone is selected
        if(this.selectedBone == -1) {
          this.camera.roll(GUI.rollSpeed, false);
          break;
        } else { // do bone rolling
          let bone: Bone = this.animation.getScene().meshes[0].bones[this.selectedBone];
          let boneD: Mat4 = bone.getDMatrix().copy(); 
          let Dinv: Mat4 = boneD.inverse();

          let joint_local: Vec4 = new Vec4([bone.position.x, bone.position.y, bone.position.z, 1.0]);
          joint_local.multiplyMat4(Dinv);
          let endpoint_local: Vec4 = new Vec4([bone.endpoint.x, bone.endpoint.y, bone.endpoint.z, 1.0]);
          endpoint_local.multiplyMat4(Dinv);

          let temp: Vec4 = new Vec4();
          endpoint_local.subtract(joint_local, temp);
          let axis: Vec3 = new Vec3(temp.xyz);
          axis.normalize();
          let angle: number = -Math.abs(GUI.rollSpeed);

          let quat: Quat = new Quat();
          Quat.fromAxisAngle(axis, angle, quat);
          let new_R: Mat4 = new Mat4();
          new_R = quat.toMat4();
          bone.setRMatrix(new_R, this.animation.getScene().meshes[0].bones, true, true);
          break;
        }
      }
      case "ArrowRight": {
        //TODO: Handle bone rolls when a bone is selected
        if(this.selectedBone == -1) {
          this.camera.roll(GUI.rollSpeed, true);
          break;
        } else { // do bone rolling
          let bone: Bone = this.animation.getScene().meshes[0].bones[this.selectedBone];
          let boneD: Mat4 = bone.getDMatrix(); 
          let Dinv: Mat4 = new Mat4();
          boneD.inverse(Dinv);

          let joint_local: Vec4 = new Vec4();
          Dinv.multiplyVec4(new Vec4([bone.position.x, bone.position.y, bone.position.z, 1.0]), joint_local);
          let endpoint_local: Vec4 = new Vec4();
          Dinv.multiplyVec4(new Vec4([bone.endpoint.x, bone.endpoint.y, bone.endpoint.z, 1.0]), endpoint_local);

          let temp: Vec4 = new Vec4();
          endpoint_local.subtract(joint_local, temp);
          let axis: Vec3 = new Vec3(temp.xyz);
          axis.normalize();
          let angle: number = Math.abs(GUI.rollSpeed);

          let quat: Quat = new Quat();
          Quat.fromAxisAngle(axis, angle, quat);
          let new_R: Mat4 = new Mat4();
          new_R = quat.toMat4();
          bone.setRMatrix(new_R, this.animation.getScene().meshes[0].bones, true, true);
          break;
        }
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
          let newKeyframe: Keyframe;
          let keyframes_len: number = this.animation.getScene().meshes[0].keyframes.length;
          if(keyframes_len == 0) 
            newKeyframe = new Keyframe(this.getMaxTime(), keyframes_len, 0);
          else
            newKeyframe = new Keyframe(this.getMaxTime(), keyframes_len, 1);
          newKeyframe.setOrientations(this.animation.getScene().meshes[0].bones);
          this.animation.getScene().meshes[0].keyframes.push(newKeyframe);
          this.animation.renderToTexture(-1);
        }
        break;
      }      
      case "KeyP": {
        if (this.mode === Mode.edit && this.getNumKeyFrames() > 1)
        {
          this.mode = Mode.playback;
          this.time = 0;
          this.animation.getScene().meshes[0].resetOrientations();
        } else if (this.mode === Mode.playback) { // pausing playing
          this.mode = Mode.edit;
        }
        break;
      }
      case "Equal": {
        let keyframes: Keyframe[] = this.animation.getScene().meshes[0].keyframes;
        if(this.selectedKeyframe != -1 && keyframes.length > this.selectedKeyframe) {
          this.animation.getScene().meshes[0].updateOrientations(keyframes[this.selectedKeyframe].getOrientations());
        }
        break;
      }
      case "Delete": { 
        if(this.selectedKeyframe != -1 && this.animation.getScene().meshes[0].keyframes.length > this.selectedKeyframe) {
          this.animation.previewTextures.splice(this.selectedKeyframe, 1);
          this.animation.getScene().meshes[0].keyframes.splice(this.selectedKeyframe, 1);
          let keyframes: Keyframe[] = this.animation.getScene().meshes[0].keyframes;
          for (let i: number = this.selectedKeyframe; i < keyframes.length; i++) {
            let curr: Keyframe = keyframes[i];
            curr.startTime -= 1;
            curr.index = i;
          }
          this.animation.updateTextures();
        }
        break;
      }
      case "KeyU": { 
        if(this.selectedKeyframe != -1 && this.animation.getScene().meshes[0].keyframes.length > this.selectedKeyframe) {
          let bones: Bone[] = this.animation.getScene().meshes[0].bones;
          this.animation.getScene().meshes[0].keyframes[this.selectedKeyframe].setOrientations(bones);
          this.animation.renderToTexture(this.selectedKeyframe);
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