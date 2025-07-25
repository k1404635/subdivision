import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { SkinningAnimation } from "./App.js";
import { Mat4, Vec3, Vec4, Vec2, Mat2, Quat } from "../lib/TSM.js";
import { Bone, Mesh } from "./Scene.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";

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

  public subdivision_iter: number;
  public quadmesh: boolean;

  public obj_location: string;

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
    this.subdivision_iter = 0;
    this.quadmesh = false;
    
    this.animation = animation;
    this.obj_location = "";
    
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
  
  }

  /**
   * Callback function for a key press event
   * @param key
   */
  public onKeydown(key: KeyboardEvent): void {
    switch (key.code) {
      case "Digit1": {
        this.subdivision_iter = 0;
        this.quadmesh = false;
        this.obj_location = "";
        // this.animation.setScene("./static/assets/skinning/cross_cubes.dae");
        this.animation.setScene("./static/assets/skinning/single_cube.dae");
        break;
      }
      case "Digit2": {
        this.subdivision_iter = 1;
        this.quadmesh = false;
        this.obj_location = "";
        this.animation.setScene("./static/assets/skinning/cross_cubes.dae");
        // this.animation.setScene("./static/assets/skinning/single_cube.dae");
        break;
      }
      case "Digit3": {
        this.subdivision_iter = 2;
        this.quadmesh = false;
        this.obj_location = "";
        this.animation.setScene("./static/assets/skinning/cross_cubes.dae");
        // this.animation.setScene("./static/assets/skinning/single_cube.dae");
        break;
      }      
      case "Digit4": {
        this.subdivision_iter = 3;
        this.quadmesh = false;
        this.obj_location = "";
        this.animation.setScene("./static/assets/skinning/cross_cubes.dae");
        // this.animation.setScene("./static/assets/skinning/single_cube.dae");
        break;
      }
      case "Digit5": {
        this.subdivision_iter = 7;
        this.quadmesh = false;
        this.animation.setScene("./static/assets/skinning/cross_cubes.dae");
        // this.animation.setScene("./static/assets/skinning/single_cube.dae");
        break;
      }
      case "Digit6": {
        this.quadmesh = true;
        this.subdivision_iter = 1;
        this.obj_location = "./static/assets/skinning/cross_cubes_quads.obj";
        this.animation.setScene("./static/assets/skinning/cross_cubes.dae");
        // this.obj_location = "./static/assets/skinning/single_cube_quads.obj";
        // this.animation.setScene("./static/assets/skinning/single_cube.dae");
        break;
      }
      case "Digit7": {
        this.quadmesh = true;
        this.subdivision_iter = 2;
        this.obj_location = "./static/assets/skinning/cross_cubes_quads.obj";
        this.animation.setScene("./static/assets/skinning/cross_cubes.dae");
        // this.obj_location = "./static/assets/skinning/single_cube_quads.obj";
        // this.animation.setScene("./static/assets/skinning/single_cube.dae");
        break;
      }
      case "Digit8": {
        this.quadmesh = true;
        this.subdivision_iter = 3;
        this.obj_location = "./static/assets/skinning/cross_cubes_quads.obj";
        this.animation.setScene("./static/assets/skinning/cross_cubes.dae");
        // this.obj_location = "./static/assets/skinning/single_cube_quads.obj";
        // this.animation.setScene("./static/assets/skinning/single_cube.dae");
        break;
      }
      case "Digit9": {
        this.quadmesh = true;
        this.subdivision_iter = 6;
        this.obj_location = "./static/assets/skinning/cross_cubes_quads.obj";
        this.animation.setScene("./static/assets/skinning/cross_cubes.dae");
        // this.obj_location = "./static/assets/skinning/single_cube_quads.obj";
        // this.animation.setScene("./static/assets/skinning/single_cube.dae");
        break;
      }
      case "Digit0": {
        this.quadmesh = true;
        this.subdivision_iter = 7;
        this.obj_location = "./static/assets/skinning/cross_cubes_quads.obj";
        this.animation.setScene("./static/assets/skinning/cross_cubes.dae");
        // this.obj_location = "./static/assets/skinning/single_cube_quads.obj";
        // this.animation.setScene("./static/assets/skinning/single_cube.dae");
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