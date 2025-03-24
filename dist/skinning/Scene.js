import { Mat4, Vec3 } from "../lib/TSM.js";
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
        this.rotation = bone.rotation.copy();
        this.R = new Mat4();
        this.T = new Mat4();
        this.R.setIdentity();
        this.T.setIdentity();
    }
    getDMatrix() {
        return this.D;
    }
    setDMatrix(D, bones) {
        this.D = new Mat4();
        // console.log("Before multiplication, D matrix:", this.D.all());
        this.R.multiply(this.T, this.D);
        // console.log("After RxT, D matrix:", this.D.all());
        this.D.multiply(D, this.D);
        // console.log("After Dxthis.D, D matrix:", this.D.all());
        // this.R.multiply(this.T, this.D).multiply(D, this.D);
        for (let i = 0; i < this.children.length; i++) {
            let curr = bones[this.children[i]];
            curr.setDMatrix(this.D, bones);
        }
    }
    setUMatrix(U, bones) {
        this.U = new Mat4();
        this.T.multiply(U, this.U);
        for (let i = 0; i < this.children.length; i++) {
            let curr = bones[this.children[i]];
            curr.setUMatrix(this.U, bones);
        }
    }
    getUMatrix() {
        return this.U;
    }
    setRMatrix(mat) {
        this.R = mat;
    }
    getRMatrix() {
        return this.R;
    }
    setTMatrix(bones, root) {
        if (!root) {
            let translation = new Vec3();
            this.position.subtract(bones[this.parent].position, translation);
            this.T = new Mat4([1, 0, 0, translation.x,
                0, 1, 0, translation.y,
                0, 0, 1, translation.z,
                0, 0, 0, 1
            ]);
        }
        for (let i = 0; i < this.children.length; i++) {
            let curr = bones[this.children[i]];
            curr.setTMatrix(bones, false);
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
                let array = [1, 0, 0, bone.position.x,
                    0, 1, 0, bone.position.y,
                    0, 0, 1, bone.position.z,
                    0, 0, 0, 1];
                bone.setTMatrix(this.bones, true);
                bone.setDMatrix(new Mat4(array), this.bones);
                bone.setUMatrix(new Mat4(array), this.bones);
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