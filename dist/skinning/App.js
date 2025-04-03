import { Debugger } from "../lib/webglutils/Debugging.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { Floor } from "../lib/webglutils/Floor.js";
import { GUI, Mode } from "./Gui.js";
import { sceneFSText, sceneVSText, floorFSText, floorVSText, skeletonFSText, skeletonVSText, sBackVSText, sBackFSText, previewVSText, previewFSText, quadVSText, quadFSText } from "./Shaders.js";
import { Mat4, Vec4, Quat } from "../lib/TSM.js";
import { CLoader } from "./AnimationFileLoader.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Keyframe } from "./Scene.js";
export class SkinningAnimation extends CanvasAnimation {
    constructor(canvas) {
        super(canvas);
        this.canvas2d = document.getElementById("textCanvas");
        this.canvas2d.width += 320;
        this.ctx2 = this.canvas2d.getContext("2d");
        if (this.ctx2) {
            this.ctx2.font = "25px serif";
            this.ctx2.fillStyle = "#ffffffff";
        }
        this.ctx = Debugger.makeDebugContext(this.ctx);
        let gl = this.ctx;
        this.floor = new Floor();
        this.floorRenderPass = new RenderPass(this.extVAO, gl, floorVSText, floorFSText);
        this.sceneRenderPass = new RenderPass(this.extVAO, gl, sceneVSText, sceneFSText);
        this.skeletonRenderPass = new RenderPass(this.extVAO, gl, skeletonVSText, skeletonFSText);
        // Preview section
        this.previewRenderPass = new RenderPass(this.extVAO, gl, previewVSText, previewFSText);
        //TODO: Add in other rendering initializations for other shaders such as bone highlighting
        this.gui = new GUI(this.canvas2d, this);
        this.lightPosition = new Vec4([-10, 10, -10, 1]);
        this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);
        this.initFloor();
        this.scene = new CLoader("");
        // Status bar
        this.sBackRenderPass = new RenderPass(this.extVAO, gl, sBackVSText, sBackFSText);
        // Textured Quads
        this.quadRenderPass = new RenderPass(this.extVAO, gl, quadVSText, quadFSText);
        this.previewTextures = [];
        this.initGui();
        this.millis = new Date().getTime();
    }
    getScene() {
        return this.scene;
    }
    /**
     * Setup the animation. This can be called again to reset the animation.
     */
    reset() {
        this.gui.reset();
        this.setScene(this.loadedScene);
        this.previewTextures = [];
    }
    initGui() {
        // Status bar background
        let verts = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
        this.sBackRenderPass.setIndexBufferData(new Uint32Array([1, 0, 2, 2, 0, 3]));
        this.sBackRenderPass.addAttribute("vertPosition", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, verts);
        this.sBackRenderPass.setDrawData(this.ctx.TRIANGLES, 6, this.ctx.UNSIGNED_INT, 0);
        this.sBackRenderPass.setup();
    }
    initScene() {
        if (this.scene.meshes.length === 0) {
            return;
        }
        this.initModel();
        this.initSkeleton();
        this.initPreview();
        this.initQuads();
        this.gui.reset();
    }
    initPreview() {
        let gl = this.ctx;
        this.previewRenderPass = new RenderPass(this.extVAO, gl, previewVSText, previewFSText);
        this.previewRenderPass.addUniform("selectedKF", (gl, loc) => {
            gl.uniform1f(loc, this.gui.getSelectedKF());
        });
        let verts = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
        this.previewRenderPass.setIndexBufferData(new Uint32Array([1, 0, 2, 2, 0, 3]));
        this.previewRenderPass.addAttribute("vertPosition", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, verts);
        this.previewRenderPass.setDrawData(this.ctx.TRIANGLES, 6, this.ctx.UNSIGNED_INT, 0);
        this.previewRenderPass.setup();
    }
    /**
     * Sets up the mesh and mesh drawing
     */
    initModel() {
        this.sceneRenderPass = new RenderPass(this.extVAO, this.ctx, sceneVSText, sceneFSText);
        let faceCount = this.scene.meshes[0].geometry.position.count / 3;
        let fIndices = new Uint32Array(faceCount * 3);
        for (let i = 0; i < faceCount * 3; i += 3) {
            fIndices[i] = i;
            fIndices[i + 1] = i + 1;
            fIndices[i + 2] = i + 2;
        }
        this.sceneRenderPass.setIndexBufferData(fIndices);
        this.sceneRenderPass.addAttribute("aNorm", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.normal.values);
        if (this.scene.meshes[0].geometry.uv) {
            this.sceneRenderPass.addAttribute("aUV", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.uv.values);
        }
        else {
            this.sceneRenderPass.addAttribute("aUV", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array(this.scene.meshes[0].geometry.normal.values.length));
        }
        //Note that these attributes will error until you use them in the shader
        this.sceneRenderPass.addAttribute("skinIndices", 4, this.ctx.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.skinIndex.values);
        this.sceneRenderPass.addAttribute("skinWeights", 4, this.ctx.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.skinWeight.values);
        this.sceneRenderPass.addAttribute("v0", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v0.values);
        this.sceneRenderPass.addAttribute("v1", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v1.values);
        this.sceneRenderPass.addAttribute("v2", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v2.values);
        this.sceneRenderPass.addAttribute("v3", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v3.values);
        this.sceneRenderPass.addUniform("lightPosition", (gl, loc) => {
            gl.uniform4fv(loc, this.lightPosition.xyzw);
        });
        this.sceneRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(new Mat4().setIdentity().all()));
        });
        this.sceneRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.sceneRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.sceneRenderPass.addUniform("jTrans", (gl, loc) => {
            gl.uniform3fv(loc, this.scene.meshes[0].getBoneTranslations());
        });
        this.sceneRenderPass.addUniform("jRots", (gl, loc) => {
            gl.uniform4fv(loc, this.scene.meshes[0].getBoneRotations());
        });
        this.sceneRenderPass.setDrawData(this.ctx.TRIANGLES, this.scene.meshes[0].geometry.position.count, this.ctx.UNSIGNED_INT, 0);
        this.sceneRenderPass.setup();
    }
    /**
     * Sets up the skeleton drawing
     */
    initSkeleton() {
        this.skeletonRenderPass.setIndexBufferData(this.scene.meshes[0].getBoneIndices());
        this.skeletonRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].getBonePositions());
        this.skeletonRenderPass.addAttribute("boneIndex", 1, this.ctx.FLOAT, false, 1 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].getBoneIndexAttribute());
        this.skeletonRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.skeletonRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.skeletonRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.skeletonRenderPass.addUniform("bTrans", (gl, loc) => {
            gl.uniform3fv(loc, this.getScene().meshes[0].getBoneTranslations());
        });
        this.skeletonRenderPass.addUniform("bRots", (gl, loc) => {
            gl.uniform4fv(loc, this.getScene().meshes[0].getBoneRotations());
        });
        this.skeletonRenderPass.addUniform("selectedBone", (gl, loc) => {
            gl.uniform1f(loc, this.gui.getSelectedBone());
        });
        this.skeletonRenderPass.setDrawData(this.ctx.LINES, this.scene.meshes[0].getBoneIndices().length, this.ctx.UNSIGNED_INT, 0);
        this.skeletonRenderPass.setup();
    }
    //TODO: Set up a Render Pass for the bone highlighting
    initBone() {
        // not used
    }
    /**
     * Sets up the floor drawing
     */
    initFloor() {
        this.floorRenderPass.setIndexBufferData(this.floor.indicesFlat());
        this.floorRenderPass.addAttribute("aVertPos", 4, this.ctx.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.floor.positionsFlat());
        this.floorRenderPass.addUniform("uLightPos", (gl, loc) => {
            gl.uniform4fv(loc, this.lightPosition.xyzw);
        });
        this.floorRenderPass.addUniform("uWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.floorRenderPass.addUniform("uProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.floorRenderPass.addUniform("uView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.floorRenderPass.addUniform("uProjInv", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
        });
        this.floorRenderPass.addUniform("uViewInv", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
        });
        this.floorRenderPass.setDrawData(this.ctx.TRIANGLES, this.floor.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
        this.floorRenderPass.setup();
    }
    /** @internal
     * Draws a single frame
     *
     */
    draw() {
        // Update skeleton state
        let curr = new Date().getTime();
        let deltaT = curr - this.millis;
        this.millis = curr;
        deltaT /= 1000;
        this.getGUI().incrementTime(deltaT);
        //TODO: Handle mesh playback if implementing for project spec
        if (this.getGUI().mode == Mode.playback) { // playing animation
            let orientations = [];
            let gui_time = this.getGUI().time;
            let keyframes = this.getScene().meshes[0].keyframes;
            if (gui_time >= this.getGUI().getMaxTime()) {
                this.getGUI().mode = Mode.edit;
            }
            else {
                let curr_keyframe = new Keyframe(0, 0, 0);
                // find current keyframe
                for (let i = 0; i < keyframes.length; i++) {
                    curr_keyframe = keyframes[i];
                    if (gui_time >= curr_keyframe.startTime && gui_time < curr_keyframe.startTime + curr_keyframe.duration)
                        break;
                }
                if (curr_keyframe.index != 0) {
                    let bones = this.getScene().meshes[0].bones;
                    for (let i = 0; i < bones.length; i++) {
                        let curr = bones[i];
                        let curr_orientation = new Quat();
                        let prev_keyframe = keyframes[curr_keyframe.index - 1];
                        let prev_quat = prev_keyframe.getOrientations()[i].copy().toMat3().toQuat();
                        let curr_quat = curr_keyframe.getOrientations()[i].copy().toMat3().toQuat();
                        Quat.slerpShort(prev_quat, curr_quat, gui_time - curr_keyframe.startTime, curr_orientation);
                        curr.setRMatrix(curr_orientation.toMat4(), bones, false, false);
                    }
                }
            }
        }
        if (this.ctx2) {
            this.ctx2.clearRect(0, 0, this.ctx2.canvas.width, this.ctx2.canvas.height);
            if (this.scene.meshes.length > 0) {
                this.ctx2.fillText(this.getGUI().getModeString(), 50, 710);
            }
        }
        // Drawing
        const gl = this.ctx;
        const bg = this.backgroundColor;
        gl.clearColor(bg.r, bg.g, bg.b, bg.a);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
        this.drawScene(0, 200, 800, 600);
        /* Draw status bar */
        if (this.scene.meshes.length > 0) {
            gl.viewport(0, 0, 800, 200);
            this.sBackRenderPass.draw();
        }
        /* Draw preview section with quads */
        if (this.scene.meshes.length > 0) {
            gl.viewport(800, 0, 320, 800);
            this.previewRenderPass.draw();
            gl.disable(gl.DEPTH_TEST);
            this.quadRenderPass.draw();
            gl.enable(gl.DEPTH_TEST);
        }
    }
    drawScene(x, y, width, height) {
        const gl = this.ctx;
        gl.viewport(x, y, width, height);
        this.floorRenderPass.draw();
        /* Draw Scene */
        if (this.scene.meshes.length > 0) {
            this.sceneRenderPass.draw();
            gl.disable(gl.DEPTH_TEST);
            this.skeletonRenderPass.draw();
            //TODO: Add functionality for drawing the highlighted bone when necessary
            gl.enable(gl.DEPTH_TEST);
        }
    }
    getGUI() {
        return this.gui;
    }
    /**
     * Loads and sets the scene from a Collada file
     * @param fileLocation URI for the Collada file
     */
    setScene(fileLocation) {
        this.loadedScene = fileLocation;
        this.scene = new CLoader(fileLocation);
        this.scene.load(() => this.initScene());
    }
    renderToTexture(index) {
        // Drawing
        const gl = this.ctx;
        const bg = this.backgroundColor;
        gl.clearColor(bg.r, bg.g, bg.b, bg.a);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);
        // create to render to
        const targetTextureWidth = 800;
        const targetTextureHeight = 600;
        const targetTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, targetTexture);
        // define size and format of level 0
        const level = 0;
        const internalFormat = gl.RGBA;
        const border = 0;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        const data = null;
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, targetTextureWidth, targetTextureHeight, border, format, type, data);
        // set the filtering so we don't need mips
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // Create and bind the framebuffer
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, targetTextureWidth, targetTextureHeight);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
        // attach the texture as the first color attachment
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.drawScene(0, 0, targetTextureWidth, targetTextureHeight);
        // Reset framebuffer binding to default (the screen)
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (index == -1)
            this.previewTextures.push(targetTexture);
        else
            this.previewTextures[index] = targetTexture;
        this.updateTextures();
    }
    updateTextures() {
        let gl = this.ctx;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.previewTextures[0]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.previewTextures[1]);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.previewTextures[2]);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.previewTextures[3]);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this.createDefaultTexture());
    }
    initQuads() {
        // set uniforms for drawing the preview
        let gl = this.ctx;
        this.quadRenderPass = new RenderPass(this.extVAO, gl, quadVSText, quadFSText);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.previewTextures[0]);
        this.quadRenderPass.addUniform("tex0", (gl, loc) => {
            gl.uniform1i(loc, 0);
        });
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.previewTextures[1]);
        this.quadRenderPass.addUniform("tex1", (gl, loc) => {
            gl.uniform1i(loc, 1);
        });
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.previewTextures[2]);
        this.quadRenderPass.addUniform("tex2", (gl, loc) => {
            gl.uniform1i(loc, 2);
        });
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.previewTextures[3]);
        this.quadRenderPass.addUniform("tex3", (gl, loc) => {
            gl.uniform1i(loc, 3);
        });
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this.createDefaultTexture());
        this.quadRenderPass.addUniform("tex4", (gl, loc) => {
            gl.uniform1i(loc, 4);
        });
        this.quadRenderPass.addUniform("numKeyFrames", (gl, loc) => {
            gl.uniform1f(loc, this.gui.getNumKeyFrames());
        });
        // Textured Quads
        let quad_verts = new Float32Array([
            -0.667, 0.92,
            -0.667, 0.52,
            0.667, 0.92,
            0.667, 0.52,
            -0.667, 0.44,
            -0.667, 0.04,
            0.667, 0.44,
            0.667, 0.04,
            -0.667, -0.04,
            -0.667, -0.44,
            0.667, -0.04,
            0.667, -0.44,
            -0.667, -0.52,
            -0.667, -0.92,
            0.667, -0.52,
            0.667, -0.92
        ]);
        let quad_indices = new Uint32Array([
            0, 1, 2,
            2, 1, 3,
            4, 5, 6,
            6, 5, 7,
            8, 9, 10,
            10, 9, 11,
            12, 13, 14,
            14, 13, 15
        ]);
        let texcoords = new Float32Array([
            0, 1,
            0, 0,
            1, 1,
            1, 0,
            0, 1,
            0, 0,
            1, 1,
            1, 0,
            0, 1,
            0, 0,
            1, 1,
            1, 0,
            0, 1,
            0, 0,
            1, 1,
            1, 0
        ]);
        this.quadRenderPass.setIndexBufferData(quad_indices);
        this.quadRenderPass.addAttribute("vertPosition", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, quad_verts);
        this.quadRenderPass.addAttribute("texcoords", 2, this.ctx.FLOAT, false, 2 * Uint32Array.BYTES_PER_ELEMENT, 0, undefined, texcoords);
        this.quadRenderPass.setDrawData(this.ctx.TRIANGLES, 24, this.ctx.UNSIGNED_INT, 0);
        this.quadRenderPass.setup();
    }
    createDefaultTexture() {
        const gl = this.ctx;
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Creates an 800x600 background-colored texture
        let bg = new Vec4([0, 95, 95, 255]);
        const width = 800, height = 600;
        const data = new Uint8Array(width * height * 4);
        for (let i = 0; i < data.length; i += 4) {
            data[i] = bg.r; // Red
            data[i + 1] = bg.g; // Green
            data[i + 2] = bg.b; // Blue
            data[i + 3] = bg.a; // Alpha
        }
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return texture;
    }
}
export function initializeCanvas() {
    const canvas = document.getElementById("glCanvas");
    canvas.width += 320;
    /* Start drawing */
    const canvasAnimation = new SkinningAnimation(canvas);
    canvasAnimation.start();
    canvasAnimation.setScene("./static/assets/skinning/split_cube.dae");
}
//# sourceMappingURL=App.js.map