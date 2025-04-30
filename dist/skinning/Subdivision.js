import { Vec3 } from "../lib/TSM.js";
// Implements Loop and Catmull-Clark subdivision algorithms
export class adjacency_data {
    constructor(mesh) {
        const positions = mesh.geometry.position.values;
        this.vertexAdjMap = new Map();
        this.verts = new Map();
        this.edgeFaceMap = new Map();
        this.faces = [];
        for (let i = 0; i < positions.length; i += 9) {
            const v1 = `${positions[i]},${positions[i + 1]},${positions[i + 2]}`;
            const v2 = `${positions[i + 3]},${positions[i + 4]},${positions[i + 5]}`;
            const v3 = `${positions[i + 6]},${positions[i + 7]},${positions[i + 8]}`;
            this.verts.set(v1, new Vec3([positions[i], positions[i + 1], positions[i + 2]]));
            this.verts.set(v2, new Vec3([positions[i + 3], positions[i + 4], positions[i + 5]]));
            this.verts.set(v3, new Vec3([positions[i + 6], positions[i + 7], positions[i + 8]]));
            // vertex adjacency
            let val = this.vertexAdjMap.get(v1);
            if (val != undefined) {
                val.add(v2);
                val.add(v3);
            }
            else {
                const set = new Set();
                set.add(v2);
                set.add(v3);
                this.vertexAdjMap.set(v1, set);
            }
            val = this.vertexAdjMap.get(v2);
            if (val != undefined) {
                val.add(v1);
                val.add(v3);
            }
            else {
                const set = new Set();
                set.add(v1);
                set.add(v3);
                this.vertexAdjMap.set(v2, set);
            }
            val = this.vertexAdjMap.get(v3);
            if (val != undefined) {
                val.add(v1);
                val.add(v2);
            }
            else {
                const set = new Set();
                set.add(v1);
                set.add(v2);
                this.vertexAdjMap.set(v3, set);
            }
            this.faces.push([v1, v2, v3]);
            // make edges and set map for edge-face relations
            let edge1 = v1 + '=>' + v2;
            let edge2 = v1 + '=>' + v3;
            let edge3 = v2 + '=>' + v3;
            let edgeVal = this.edgeFaceMap.get(edge1);
            if (edgeVal == undefined) {
                edge1 = v2 + '=>' + v1;
                edgeVal = this.edgeFaceMap.get(edge1);
                if (edgeVal == undefined) {
                    const set = new Set();
                    set.add(this.faces.length - 1);
                    this.edgeFaceMap.set(edge1, set);
                }
                else
                    edgeVal.add(this.faces.length - 1);
            }
            else
                edgeVal.add(this.faces.length - 1);
            edgeVal = this.edgeFaceMap.get(edge2);
            if (edgeVal == undefined) {
                edge2 = v3 + '=>' + v1;
                edgeVal = this.edgeFaceMap.get(edge2);
                if (edgeVal == undefined) {
                    const set = new Set();
                    set.add(this.faces.length - 1);
                    this.edgeFaceMap.set(edge2, set);
                }
                else
                    edgeVal.add(this.faces.length - 1);
            }
            else
                edgeVal.add(this.faces.length - 1);
            edgeVal = this.edgeFaceMap.get(edge3);
            if (edgeVal == undefined) {
                edge3 = v3 + '=>' + v2;
                edgeVal = this.edgeFaceMap.get(edge3);
                if (edgeVal == undefined) {
                    const set = new Set();
                    set.add(this.faces.length - 1);
                    this.edgeFaceMap.set(edge3, set);
                }
                else
                    edgeVal.add(this.faces.length - 1);
            }
            else
                edgeVal.add(this.faces.length - 1);
        }
        console.log("edges: ", this.edgeFaceMap.entries());
        console.log("faces: ", this.faces.length);
    }
}
export function loopSubdivision(mesh, iterations) {
    // Make vertex neighbor map and edge-newVertexIndex map
    let newVertices = [];
    let edgeFace = new Map();
    let vertexAdj = new Map();
}
export function catmullClarkSubdivision(mesh, iterations) {
    // TODO: Implement Catmull-Clark Subdivision algorithm
    //
}
//# sourceMappingURL=Subdivision.js.map