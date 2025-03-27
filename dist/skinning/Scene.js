import { Mat4, Vec3, Vec4 } from "../lib/TSM.js";
//TODO: Generate cylinder geometry for highlighting bones
//General class for handling GLSL attributes
export class Attribute {
    constructor(attr) {
        this.values = attr.values;
        this.count = attr.count;
        this.itemSize = attr.itemSize;
    }
}
//Class for handling mesh vertices and skin weights
export class MeshGeometry {
    constructor(mesh) {
        this.position = new Attribute(mesh.position);
        this.normal = new Attribute(mesh.normal);
        if (mesh.uv) {
            this.uv = new Attribute(mesh.uv);
        }
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
    constructor(bone) {
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
    getDMatrix() {
        return this.D;
    }
    setDMatrix(D, bones) {
        this.D = new Mat4();
        D.multiply(this.T, this.D);
        this.D.multiply(this.R);
        for (let i = 0; i < this.children.length; i++) {
            let curr = bones[this.children[i]];
            curr.setDMatrix(this.D.copy(), bones);
        }
    }
    setUMatrix(U, bones) {
        U.multiply(this.T, this.U);
        for (let i = 0; i < this.children.length; i++) {
            let curr = bones[this.children[i]];
            curr.setUMatrix(this.U.copy(), bones);
        }
    }
    getUMatrix() {
        return this.U;
    }
    setRMatrix(mat, bones) {
        let temp = mat.copy();
        temp.multiply(this.R, this.R);
        if (this.parent != -1)
            this.setDMatrix(bones[this.parent].getDMatrix(), bones);
        else {
            this.setDMatrix(this.getUMatrix(), bones);
        }
        this.D.copy().toMat3().toQuat(this.rotation);
        this.updatePoints(bones);
    }
    updatePoints(bones) {
        let U_inv = new Mat4();
        this.U.inverse(U_inv);
        let orig_local_joint = new Vec4([this.orig_pos.x, this.orig_pos.y, this.orig_pos.z, 1.0]);
        orig_local_joint.multiplyMat4(U_inv);
        let orig_local_endpoint = new Vec4([this.orig_end.x, this.orig_end.y, this.orig_end.z, 1.0]);
        orig_local_endpoint.multiplyMat4(U_inv);
        let temp = new Vec4();
        this.D.multiplyVec4(orig_local_joint, temp);
        orig_local_joint.multiplyMat4(this.D, temp);
        this.position = new Vec3(temp.xyz);
        temp = new Vec4();
        this.D.multiplyVec4(orig_local_endpoint, temp);
        orig_local_endpoint.multiplyMat4(this.D, temp);
        this.endpoint = new Vec3(temp.xyz);
        this.D.copy().toMat3().toQuat(this.rotation);
        for (let i = 0; i < this.children.length; i++) {
            let curr = bones[this.children[i]];
            curr.updatePoints(bones);
        }
    }
    getRMatrix() {
        return this.R;
    }
    setTMatrix(bones, root) {
        if (!root) {
            let translation = new Vec3();
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
    constructor(mesh) {
        this.geometry = new MeshGeometry(mesh.geometry);
        this.worldMatrix = mesh.worldMatrix.copy();
        this.rotation = mesh.rotation.copy();
        this.bones = [];
        mesh.bones.forEach(bone => {
            this.bones.push(new Bone(bone));
        });
        this.bones.forEach(bone => {
            if (bone.parent == -1) { // if root
                bone.setTMatrix(this.bones, true);
            }
            else {
                bone.setTMatrix(this.bones, false);
            }
        });
        this.bones.forEach(bone => {
            if (bone.parent == -1) { // if root
                let array = [1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    bone.position.x, bone.position.y, bone.position.z, 1];
                bone.setUMatrix(new Mat4(array), this.bones);
                bone.setDMatrix(new Mat4(array), this.bones);
            }
        });
        this.materialName = mesh.materialName;
        this.imgSrc = null;
        this.boneIndices = Array.from(mesh.boneIndices);
        this.bonePositions = new Float32Array(mesh.bonePositions);
        this.boneIndexAttribute = new Float32Array(mesh.boneIndexAttribute);
    }
    //TODO: Create functionality for bone manipulation/key-framing
    getBoneIndices() {
        return new Uint32Array(this.boneIndices);
    }
    getBonePositions() {
        return this.bonePositions;
    }
    getBoneIndexAttribute() {
        return this.boneIndexAttribute;
    }
    getBoneTranslations() {
        let trans = new Float32Array(3 * this.bones.length);
        this.bones.forEach((bone, index) => {
            let res = bone.position.xyz;
            for (let i = 0; i < res.length; i++) {
                trans[3 * index + i] = res[i];
            }
        });
        return trans;
    }
    getBoneRotations() {
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
//# sourceMappingURL=Scene.js.map