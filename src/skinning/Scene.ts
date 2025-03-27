import { Mat3, Mat4, Quat, Vec3, Vec4 } from "../lib/TSM.js";
import { AttributeLoader, MeshGeometryLoader, BoneLoader, MeshLoader } from "./AnimationFileLoader.js";

//TODO: Generate cylinder geometry for highlighting bones

//General class for handling GLSL attributes
export class Attribute {
  values: Float32Array;
  count: number;
  itemSize: number;

  constructor(attr: AttributeLoader) {
    this.values = attr.values;
    this.count = attr.count;
    this.itemSize = attr.itemSize;
  }
}

//Class for handling mesh vertices and skin weights
export class MeshGeometry {
  position: Attribute;
  normal: Attribute;
  uv: Attribute | null;
  skinIndex: Attribute; // bones indices that affect each vertex
  skinWeight: Attribute; // weight of associated bone
  v0: Attribute; // position of each vertex of the mesh *in the coordinate system of bone skinIndex[0]'s joint*. Perhaps useful for LBS.
  v1: Attribute;
  v2: Attribute;
  v3: Attribute;

  constructor(mesh: MeshGeometryLoader) {
    this.position = new Attribute(mesh.position);
    this.normal = new Attribute(mesh.normal);
    if (mesh.uv) { this.uv = new Attribute(mesh.uv); }
    this.skinIndex = new Attribute(mesh.skinIndex);
    this.skinWeight = new Attribute(mesh.skinWeight);
    this.v0 = new Attribute(mesh.v0);
    this.v1 = new Attribute(mesh.v1);
    this.v2 = new Attribute(mesh.v2);
    this.v3 = new Attribute(mesh.v3);
  }
}

//Class for handling bones in the skeleton rig
export class Bone {
  public parent: number;
  public children: number[];
  public position: Vec3; // current position of the bone's joint *in world coordinates*. Used by the provided skeleton shader, so you need to keep this up to date.
  public endpoint: Vec3; // current position of the bone's second (non-joint) endpoint, in world coordinates
  public rotation: Quat; // current orientation of the joint *with respect to world coordinates*
  private orig_pos: Vec3; // original position of the bone's joint *in world coordinates*
  private orig_end: Vec3; // original position of the bone's endpoint *in world coordinates*
  private U: Mat4; // undeformed matrix: going from local to world coordinates
  private D: Mat4; // deformed matrix: going from local to world coordinates
  private R: Mat4; // rotation matrix *in local coordinates*
  private T: Mat4; // translation matrix from parent joint to this joint

  constructor(bone: BoneLoader) {
    this.parent = bone.parent;
    this.children = Array.from(bone.children);
    this.position = bone.position.copy();
    this.endpoint = bone.endpoint.copy();
    this.orig_pos = bone.position.copy();
    this.orig_end = bone.endpoint.copy();
    this.rotation = bone.rotation.copy();
    this.R = new Mat4();
    this.T = new Mat4();
    this.R.setIdentity();
    this.T.setIdentity();
    this.D = new Mat4();
    this.U = new Mat4();
  }

  public getDMatrix(): Mat4{
    return this.D;
  }

  public setDMatrix(D: Mat4, bones: Bone[]): void{
    this.D = new Mat4();
    D.multiply(this.T, this.D);
    this.D.multiply(this.R);

    for (let i: number = 0; i < this.children.length; i++) {
      let curr: Bone = bones[this.children[i]];
      curr.setDMatrix(this.D.copy(), bones);
    }
  }

  public setUMatrix(U: Mat4, bones: Bone[]): void{
    U.multiply(this.T, this.U);
    for (let i: number = 0; i < this.children.length; i++) {
      let curr: Bone = bones[this.children[i]];
      curr.setUMatrix(this.U.copy(), bones);
    }
  }

  public getUMatrix(): Mat4{
    return this.U;
  }
  
  public setRMatrix(mat: Mat4, bones: Bone[]): void{
    let temp: Mat4 = mat.copy();
    temp.multiply(this.R, this.R);
    if(this.parent != -1)
      this.setDMatrix(bones[this.parent].getDMatrix(), bones);
    else {
      this.setDMatrix(this.getUMatrix(), bones);
    }

    this.D.copy().toMat3().toQuat(this.rotation);
    this.updatePoints(bones);
  }

  private updatePoints(bones: Bone[]): void{
    let U_inv: Mat4 = new Mat4();
    this.U.inverse(U_inv);
    let orig_local_joint: Vec4 = new Vec4([this.orig_pos.x, this.orig_pos.y, this.orig_pos.z, 1.0]);
    orig_local_joint.multiplyMat4(U_inv);
    let orig_local_endpoint: Vec4 = new Vec4([this.orig_end.x, this.orig_end.y, this.orig_end.z, 1.0]);
    orig_local_endpoint.multiplyMat4(U_inv);

    let temp: Vec4 = new Vec4();
    this.D.multiplyVec4(orig_local_joint, temp);
    orig_local_joint.multiplyMat4(this.D, temp);
    this.position = new Vec3(temp.xyz);
    temp = new Vec4();
    this.D.multiplyVec4(orig_local_endpoint, temp);
    orig_local_endpoint.multiplyMat4(this.D, temp);
    this.endpoint = new Vec3(temp.xyz);

    this.D.copy().toMat3().toQuat(this.rotation);

    for (let i: number = 0; i < this.children.length; i++) {
      let curr: Bone = bones[this.children[i]];
      curr.updatePoints(bones);
    }
  }

  public getRMatrix(): Mat4{
    return this.R;
  }

  public setTMatrix(bones: Bone[], root: boolean) {
    if(!root) {
      let translation: Vec3 = new Vec3();
      this.position.subtract(bones[this.parent].position, translation);
      this.T = new Mat4([1, 0, 0, 0,
                          0, 1, 0, 0,
                          0, 0, 1, 0,
                          translation.x, translation.y, translation.z, 1]);
    }
  }
}

//Class for handling the overall mesh and rig
export class Mesh {
  public geometry: MeshGeometry;
  public worldMatrix: Mat4; // in this project all meshes and rigs have been transformed into world coordinates for you
  public rotation: Vec3;
  public bones: Bone[];
  public materialName: string;
  public imgSrc: String | null;

  private boneIndices: number[];
  private bonePositions: Float32Array;
  private boneIndexAttribute: Float32Array;

  constructor(mesh: MeshLoader) {
    this.geometry = new MeshGeometry(mesh.geometry);
    this.worldMatrix = mesh.worldMatrix.copy();
    this.rotation = mesh.rotation.copy();
    this.bones = [];
    mesh.bones.forEach(bone => {
      this.bones.push(new Bone(bone));
    });
    this.bones.forEach(bone => {
      if(bone.parent == -1) { // if root
        bone.setTMatrix(this.bones, true);
      }
      else {
        bone.setTMatrix(this.bones, false);
      }
    })
    this.bones.forEach(bone => {
      if(bone.parent == -1) { // if root
        let array: number[] = [1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                bone.position.x, bone.position.y, bone.position.z, 1];
        bone.setUMatrix(new Mat4(array), this.bones);
        bone.setDMatrix(new Mat4(array), this.bones);
      }
    })
    this.materialName = mesh.materialName;
    this.imgSrc = null;
    this.boneIndices = Array.from(mesh.boneIndices);
    this.bonePositions = new Float32Array(mesh.bonePositions);
    this.boneIndexAttribute = new Float32Array(mesh.boneIndexAttribute);
  }

  //TODO: Create functionality for bone manipulation/key-framing

  public getBoneIndices(): Uint32Array {
    return new Uint32Array(this.boneIndices);
  }

  public getBonePositions(): Float32Array {
    return this.bonePositions;
  }

  public getBoneIndexAttribute(): Float32Array {
    return this.boneIndexAttribute;
  }

  public getBoneTranslations(): Float32Array {
    let trans = new Float32Array(3 * this.bones.length);
    this.bones.forEach((bone, index) => {
      let res = bone.position.xyz;
      for (let i = 0; i < res.length; i++) {
        trans[3 * index + i] = res[i];
      }
    });
    return trans;
  }

  public getBoneRotations(): Float32Array {
    let trans = new Float32Array(4 * this.bones.length);
    this.bones.forEach((bone, index) => {
      let res = bone.rotation.xyzw;
      for (let i = 0; i < res.length; i++) {
        trans[4 * index + i] = res[i];
      }
    });
    return trans;
  }
}