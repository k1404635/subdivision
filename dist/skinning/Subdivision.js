import { Vec3 } from "../lib/TSM.js";
export class loopsubdiv_adjacency_data {
    constructor(mesh) {
        const positions = mesh.geometry.position.values;
        this.vertexAdjMap = new Map();
        this.verts = new Map();
        this.edgeFaceMap = new Map();
        this.faceEdgeMap = new Map();
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
                val.push(v2);
                val.push(v3);
            }
            else
                this.vertexAdjMap.set(v1, [v2, v3]);
            val = this.vertexAdjMap.get(v2);
            if (val != undefined) {
                val.push(v1);
                val.push(v3);
            }
            else
                this.vertexAdjMap.set(v2, [v1, v3]);
            val = this.vertexAdjMap.get(v3);
            if (val != undefined) {
                val.push(v1);
                val.push(v2);
            }
            else
                this.vertexAdjMap.set(v3, [v1, v2]);
            this.faces.push([v1, v2, v3]);
            let face_index = this.faces.length - 1;
            if (i == 0)
                face_index = 0;
            // make edges and set map for edge-face relations
            let edge1 = v1 + '=>' + v2;
            let edge2 = v1 + '=>' + v3;
            let edge3 = v2 + '=>' + v3;
            let edgeVal = this.edgeFaceMap.get(edge1);
            if (edgeVal == undefined) {
                edge1 = v2 + '=>' + v1;
                edgeVal = this.edgeFaceMap.get(edge1);
                if (edgeVal == undefined)
                    this.edgeFaceMap.set(edge1, [face_index]);
                else
                    edgeVal.push(face_index);
            }
            else
                edgeVal.push(face_index);
            edgeVal = this.edgeFaceMap.get(edge2);
            if (edgeVal == undefined) {
                edge2 = v3 + '=>' + v1;
                edgeVal = this.edgeFaceMap.get(edge2);
                if (edgeVal == undefined)
                    this.edgeFaceMap.set(edge2, [face_index]);
                else
                    edgeVal.push(face_index);
            }
            else
                edgeVal.push(face_index);
            edgeVal = this.edgeFaceMap.get(edge3);
            if (edgeVal == undefined) {
                edge3 = v3 + '=>' + v2;
                edgeVal = this.edgeFaceMap.get(edge3);
                if (edgeVal == undefined)
                    this.edgeFaceMap.set(edge3, [face_index]);
                else
                    edgeVal.push(face_index);
            }
            else
                edgeVal.push(face_index);
            // make faceEdgeMap
            let face_edges = this.faceEdgeMap.get(face_index);
            if (face_edges != undefined) {
                face_edges.push(edge1);
                face_edges.push(edge2);
                face_edges.push(edge3);
            }
            else
                this.faceEdgeMap.set(face_index, [edge1, edge2, edge3]);
        }
        // removeDuplicatesFromMaps(this.vertexAdjMap, this.faceEdgeMap, this.edgeFaceMap);
        removeDuplicatesFromMap(this.edgeFaceMap);
        removeDuplicatesFromMap(this.faceEdgeMap);
        removeDuplicatesFromMap(this.vertexAdjMap);
    }
}
export class catmullclark_adjacency_data {
    constructor(mesh) {
        const positions = mesh.geometry.position.values;
        this.vertexFaceMap = new Map();
        this.verts = new Map();
        this.edgeFaceMap = new Map();
        this.faceEdgeMap = new Map();
        this.vertexEdgeMap = new Map();
        this.faces = [];
        for (let i = 0; i < positions.length; i += 12) {
            const v1 = `${positions[i]},${positions[i + 1]},${positions[i + 2]}`;
            const v2 = `${positions[i + 3]},${positions[i + 4]},${positions[i + 5]}`;
            const v3 = `${positions[i + 6]},${positions[i + 7]},${positions[i + 8]}`;
            const v4 = `${positions[i + 9]},${positions[i + 10]},${positions[i + 11]}`;
            this.verts.set(v1, new Vec3([positions[i], positions[i + 1], positions[i + 2]]));
            this.verts.set(v2, new Vec3([positions[i + 3], positions[i + 4], positions[i + 5]]));
            this.verts.set(v3, new Vec3([positions[i + 6], positions[i + 7], positions[i + 8]]));
            this.verts.set(v4, new Vec3([positions[i + 9], positions[i + 10], positions[i + 11]]));
            this.faces.push([v1, v2, v3, v4]);
            let face_index = this.faces.length - 1;
            if (i == 0)
                face_index = 0;
            // vertex adjacent faces
            let val = this.vertexFaceMap.get(v1);
            if (val != undefined)
                val.push(face_index);
            else
                this.vertexFaceMap.set(v1, [face_index]);
            val = this.vertexFaceMap.get(v2);
            if (val != undefined)
                val.push(face_index);
            else
                this.vertexFaceMap.set(v2, [face_index]);
            val = this.vertexFaceMap.get(v3);
            if (val != undefined)
                val.push(face_index);
            else
                this.vertexFaceMap.set(v3, [face_index]);
            val = this.vertexFaceMap.get(v4);
            if (val != undefined)
                val.push(face_index);
            else
                this.vertexFaceMap.set(v4, [face_index]);
            // make edges and set map for edge-face and vertex-edge relations
            let edge1 = v1 + '=>' + v2;
            let edge2 = v2 + '=>' + v3;
            let edge3 = v3 + '=>' + v4;
            let edge4 = v4 + '=>' + v1;
            let edges = this.vertexEdgeMap.get(v1);
            if (edges == undefined)
                this.vertexEdgeMap.set(v1, [edge1, edge4]);
            else
                edges.push(edge1, edge4);
            edges = this.vertexEdgeMap.get(v2);
            if (edges == undefined)
                this.vertexEdgeMap.set(v2, [edge1, edge2]);
            else
                edges.push(edge1, edge2);
            edges = this.vertexEdgeMap.get(v3);
            if (edges == undefined)
                this.vertexEdgeMap.set(v3, [edge2, edge3]);
            else
                edges.push(edge2, edge3);
            edges = this.vertexEdgeMap.get(v4);
            if (edges == undefined)
                this.vertexEdgeMap.set(v4, [edge3, edge4]);
            else
                edges.push(edge3, edge4);
            let edgeVal = this.edgeFaceMap.get(edge1);
            if (edgeVal == undefined) {
                edge1 = v2 + '=>' + v1;
                edgeVal = this.edgeFaceMap.get(edge1);
                if (edgeVal == undefined)
                    this.edgeFaceMap.set(edge1, [face_index]);
                else
                    edgeVal.push(face_index);
            }
            else
                edgeVal.push(face_index);
            edgeVal = this.edgeFaceMap.get(edge2);
            if (edgeVal == undefined) {
                edge2 = v3 + '=>' + v2;
                edgeVal = this.edgeFaceMap.get(edge2);
                if (edgeVal == undefined)
                    this.edgeFaceMap.set(edge2, [face_index]);
                else
                    edgeVal.push(face_index);
            }
            else
                edgeVal.push(face_index);
            edgeVal = this.edgeFaceMap.get(edge3);
            if (edgeVal == undefined) {
                edge3 = v4 + '=>' + v3;
                edgeVal = this.edgeFaceMap.get(edge3);
                if (edgeVal == undefined)
                    this.edgeFaceMap.set(edge3, [face_index]);
                else
                    edgeVal.push(face_index);
            }
            else
                edgeVal.push(face_index);
            edgeVal = this.edgeFaceMap.get(edge4);
            if (edgeVal == undefined) {
                edge4 = v1 + '=>' + v4;
                edgeVal = this.edgeFaceMap.get(edge4);
                if (edgeVal == undefined)
                    this.edgeFaceMap.set(edge4, [face_index]);
                else
                    edgeVal.push(face_index);
            }
            else
                edgeVal.push(face_index);
            // make faceEdgeMap
            let face_edges = this.faceEdgeMap.get(face_index);
            if (face_edges != undefined) {
                face_edges.push(edge1);
                face_edges.push(edge2);
                face_edges.push(edge3);
                face_edges.push(edge4);
            }
            else
                this.faceEdgeMap.set(face_index, [edge1, edge2, edge3, edge4]);
        }
        // removeDuplicatesFromMaps(this.vertexFaceMap, this.faceEdgeMap, this.edgeFaceMap);
        removeDuplicatesFromMap(this.edgeFaceMap);
        removeDuplicatesFromMap(this.faceEdgeMap);
        removeDuplicatesFromMap(this.vertexEdgeMap);
        removeDuplicatesFromMap(this.vertexFaceMap);
    }
}
function removeDuplicatesFromMap(map) {
    for (const [key, value] of map.entries()) {
        const unique = Array.from(new Set(value));
        map.set(key, unique);
    }
}
function loopSubdivision_newVerts(adj, new_verts, oldedge_vertMap, oldvert_newvert) {
    let beta = 3.0 / 16.0; // default assumes n = 3, n = # of neighboring vertices
    // let first: boolean = true; // here just to mark first edge as sharp edge////////////////////////////////////////////////////////////
    let first = false;
    for (const [edge, faces] of adj.edgeFaceMap.entries()) {
        const [v1, v2] = edge.split('=>');
        const a = adj.verts.get(v1);
        const b = adj.verts.get(v2);
        if (faces.length == 2 && !first) { // interior edge (vertices on edge are also interior)
            // compute even (new) vertices
            if (a != undefined) {
                let new_vert_v1 = new Vec3();
                const adj_verts_v1 = adj.vertexAdjMap.get(v1);
                if (adj_verts_v1 != undefined) {
                    const n = adj_verts_v1.length;
                    let sum = new Vec3();
                    for (let i = 0; i < n; i++) {
                        const [adj1, adj2, adj3] = adj_verts_v1[i].split(',').map(Number);
                        sum.add(new Vec3([adj1, adj2, adj3]));
                    }
                    beta = (1.0 / n) * (0.625 - Math.pow((0.375 + 0.25 * Math.cos((2 * Math.PI) / n)), 2));
                    // new value = original point * (1-n*beta) + (sum up all points of neighboring vertices) * beta
                    sum.scale(beta);
                    a.scale(1 - n * beta, new_vert_v1);
                    new_vert_v1.add(sum);
                    oldvert_newvert.set(v1, new_vert_v1);
                    new_verts.set(`${new_vert_v1.x},${new_vert_v1.y},${new_vert_v1.z}`, new_vert_v1);
                }
            }
            if (b != undefined) {
                let new_vert_v2 = new Vec3();
                const adj_verts_v2 = adj.vertexAdjMap.get(v2);
                if (adj_verts_v2 != undefined) {
                    const n = adj_verts_v2.length;
                    let sum = new Vec3();
                    for (let i = 0; i < n; i++) {
                        const [adj1, adj2, adj3] = adj_verts_v2[i].split(',').map(Number);
                        sum.add(new Vec3([adj1, adj2, adj3]));
                    }
                    beta = (1.0 / n) * (0.625 - Math.pow((0.375 + 0.25 * Math.cos((2 * Math.PI) / n)), 2));
                    // new value = original point * (1-n*beta) + (sum up all points of neighboring vertices) * beta
                    sum.scale(beta);
                    b.scale(1 - n * beta, new_vert_v2);
                    new_vert_v2.add(sum);
                    oldvert_newvert.set(v2, new_vert_v2);
                    new_verts.set(`${new_vert_v2.x},${new_vert_v2.y},${new_vert_v2.z}`, new_vert_v2);
                }
            }
            // compute odd (old) vertices
            // get c
            const edges_on_face1 = adj.faceEdgeMap.get(faces[0]);
            let string_c = '';
            if (edges_on_face1 != undefined) {
                for (let i = 0; i < 3; i++) {
                    const curr_edge = edges_on_face1[i];
                    if (curr_edge == edge)
                        continue;
                    const [curr_v1, curr_v2] = curr_edge.split('=>');
                    if (curr_v1 == v1 || curr_v1 == v2)
                        string_c = curr_v2;
                    else if (curr_v2 == v1 || curr_v2 == v2)
                        string_c = curr_v1;
                }
            }
            const c = adj.verts.get(string_c);
            // get d
            const edges_on_face2 = adj.faceEdgeMap.get(faces[1]);
            let string_d = '';
            if (edges_on_face2 != undefined) {
                for (let i = 0; i < 3; i++) {
                    const curr_edge = edges_on_face2[i];
                    if (curr_edge == edge)
                        continue;
                    const [curr_v1, curr_v2] = curr_edge.split('=>');
                    if (curr_v1 == v1 || curr_v1 == v2)
                        string_d = curr_v2;
                    else if (curr_v2 == v1 || curr_v2 == v2)
                        string_d = curr_v1;
                }
            }
            const d = adj.verts.get(string_d);
            let new_vert = new Vec3();
            if (a != undefined && b != undefined && c != undefined && d != undefined) {
                // 0.375 * (a+b) + 0.125 * (c+d)
                a.add(b, new_vert);
                new_vert.scale(0.375);
                let temp_cd = new Vec3();
                c.add(d, temp_cd);
                temp_cd.scale(0.125);
                new_vert.add(temp_cd);
                new_verts.set(`${new_vert.x},${new_vert.y},${new_vert.z}`, new_vert);
                oldedge_vertMap.set(edge, `${new_vert.x},${new_vert.y},${new_vert.z}`);
            }
        }
        else { // boundary or sharp edge
            first = false;
            if (a != undefined && b != undefined) {
                // compute even (old) vertices
                // new value = 0.125 * (a+b) + 0.75 * original point
                let new_vert_v1 = new Vec3();
                a.add(b, new_vert_v1);
                new_vert_v1.scale(0.125);
                let temp = new Vec3();
                a.scale(0.75, temp);
                new_vert_v1.add(temp);
                let new_vert_v2 = new Vec3();
                a.add(b, new_vert_v2);
                new_vert_v2.scale(0.125);
                temp = new Vec3();
                b.scale(0.75, temp);
                new_vert_v2.add(temp);
                oldvert_newvert.set(v1, new_vert_v1);
                oldvert_newvert.set(v2, new_vert_v2);
                new_verts.set(`${new_vert_v1.x},${new_vert_v1.y},${new_vert_v1.z}`, new_vert_v1);
                new_verts.set(`${new_vert_v2.x},${new_vert_v2.y},${new_vert_v2.z}`, new_vert_v2);
                // compute odd (new) vertices
                // 0.5 * (a+b)
                let new_vert = new Vec3();
                a.add(b, new_vert);
                new_vert.scale(0.5);
                new_verts.set(`${new_vert.x},${new_vert.y},${new_vert.z}`, new_vert);
                oldedge_vertMap.set(edge, `${new_vert.x},${new_vert.y},${new_vert.z}`);
            }
        }
    }
}
function loopsubdiv_add_adjacent_verts(new_vert1, new_vert2, new_vert3, new_vertexAdjMap) {
    let temp_adjverts = new_vertexAdjMap.get(`${new_vert1.x},${new_vert1.y},${new_vert1.z}`);
    if (temp_adjverts != undefined) {
        temp_adjverts.push(new_vert2);
        temp_adjverts.push(new_vert3);
    }
    else {
        new_vertexAdjMap.set(`${new_vert1.x},${new_vert1.y},${new_vert1.z}`, [new_vert2,
            new_vert3]);
    }
    temp_adjverts = new_vertexAdjMap.get(new_vert3);
    if (temp_adjverts != undefined) {
        temp_adjverts.push(new_vert2);
        temp_adjverts.push(`${new_vert1.x},${new_vert1.y},${new_vert1.z}`);
    }
    else {
        new_vertexAdjMap.set(new_vert3, [new_vert2,
            `${new_vert1.x},${new_vert1.y},${new_vert1.z}`]);
    }
    temp_adjverts = new_vertexAdjMap.get(new_vert2);
    if (temp_adjverts != undefined) {
        temp_adjverts.push(new_vert3);
        temp_adjverts.push(`${new_vert1.x},${new_vert1.y},${new_vert1.z}`);
    }
    else {
        new_vertexAdjMap.set(new_vert2, [new_vert3,
            `${new_vert1.x},${new_vert1.y},${new_vert1.z}`]);
    }
}
function loopsubdiv_get_newEdgeVerts_oldVerts(edges, oldedge_vertMap) {
    const edge1 = edges[0];
    const [e1v1, e1v2] = edge1.split('=>');
    const new_e1_vert = oldedge_vertMap.get(edge1);
    const edge2 = edges[1];
    const [e2v1, e2v2] = edge2.split('=>');
    const new_e2_vert = oldedge_vertMap.get(edge2);
    const edge3 = edges[2];
    const [e3v1, e3v2] = edge3.split('=>');
    const new_e3_vert = oldedge_vertMap.get(edge3);
    // vertex between edge1 and edge2
    let old_vert_a = '';
    if (e1v1 == e2v1 || e1v1 == e2v2)
        old_vert_a = e1v1;
    else if (e1v2 == e2v1 || e1v2 == e2v2)
        old_vert_a = e1v2;
    // vertex between edge3 and edge1
    let old_vert_b = '';
    if (e3v1 == e1v1 || e3v1 == e1v2)
        old_vert_b = e3v1;
    else if (e3v2 == e1v1 || e3v2 == e1v2)
        old_vert_b = e3v2;
    // vertex between edge2 and edge3
    let old_vert_c = '';
    if (e2v1 == e3v1 || e2v1 == e3v2)
        old_vert_c = e2v1;
    else if (e2v2 == e3v1 || e2v2 == e3v2)
        old_vert_c = e2v2;
    return [new_e1_vert, new_e2_vert, new_e3_vert, old_vert_a, old_vert_b, old_vert_c];
}
// for the sake of the demo and testing, we will say that the first edge in the edgeFaceMap is a sharp crease
export function loopSubdivision(mesh, iterations, adj) {
    for (let iter = 0; iter < iterations; iter++) {
        let new_verts = new Map();
        let oldedge_vertMap = new Map();
        let oldvert_newvert = new Map();
        let new_faces = [];
        let new_edgeFaceMap = new Map();
        let new_vertexAdjMap = new Map();
        let new_faceEdgeMap = new Map();
        loopSubdivision_newVerts(adj, new_verts, oldedge_vertMap, oldvert_newvert);
        let curr_face_index = 0;
        for (let f = 0; f < adj.faces.length; f++) {
            const edges = adj.faceEdgeMap.get(f);
            if (edges != undefined) {
                const [new_e1_vert, new_e2_vert, new_e3_vert, old_vert_a, old_vert_b, old_vert_c] = loopsubdiv_get_newEdgeVerts_oldVerts(edges, oldedge_vertMap);
                const new_vert_a = oldvert_newvert.get(old_vert_a);
                const new_vert_b = oldvert_newvert.get(old_vert_b);
                const new_vert_c = oldvert_newvert.get(old_vert_c);
                if (new_vert_a != undefined && new_vert_b != undefined && new_vert_c != undefined && new_e1_vert != undefined
                    && new_e2_vert != undefined && new_e3_vert != undefined) {
                    // make new face 1 (using b, new vert on edge1, and new vert on edge3)
                    if ((old_vert_a == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_a == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_b == adj.faces[f][2]))
                        new_faces.push([`${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}`, new_e3_vert, new_e1_vert]);
                    if ((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2]))
                        new_faces.push([`${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}`, new_e1_vert, new_e3_vert]);
                    // add to adjVert
                    loopsubdiv_add_adjacent_verts(new_vert_b, new_e1_vert, new_e3_vert, new_vertexAdjMap);
                    let new_e3_1 = `${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}=>${new_e3_vert}`;
                    let new_e1_1 = `${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}=>${new_e1_vert}`;
                    let new_face_e1 = `${new_e3_vert}=>${new_e1_vert}`;
                    // add to new_edgeFaceMap
                    let temp_edgefaces = new_edgeFaceMap.get(new_e3_1);
                    if (temp_edgefaces == undefined) {
                        new_e3_1 = `${new_e3_vert}=>${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_e3_1);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_e3_1, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    temp_edgefaces = new_edgeFaceMap.get(new_e1_1);
                    if (temp_edgefaces == undefined) {
                        new_e1_1 = `${new_e1_vert}=>${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_e1_1);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_e1_1, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    temp_edgefaces = new_edgeFaceMap.get(new_face_e1);
                    if (temp_edgefaces == undefined) {
                        new_face_e1 = `${new_e1_vert}=>${new_e3_vert}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_face_e1);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_face_e1, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    // add to new_faceEdgeMap
                    let temp_faceedges = new_faceEdgeMap.get(curr_face_index);
                    if (temp_faceedges != undefined) {
                        temp_faceedges.push(new_e3_1);
                        temp_faceedges.push(new_e1_1);
                        temp_faceedges.push(new_face_e1);
                    }
                    else
                        new_faceEdgeMap.set(curr_face_index, [new_e3_1, new_e1_1, new_face_e1]);
                    // make new face 2 (using c, new vert on edge2, and new vert on edge3)
                    curr_face_index++;
                    if ((old_vert_a == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_a == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_b == adj.faces[f][2]))
                        new_faces.push([`${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}`, new_e2_vert, new_e3_vert]);
                    if ((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2]))
                        new_faces.push([`${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}`, new_e3_vert, new_e2_vert]);
                    // add to adjVert
                    loopsubdiv_add_adjacent_verts(new_vert_c, new_e2_vert, new_e3_vert, new_vertexAdjMap);
                    let new_e3_2 = `${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}=>${new_e3_vert}`;
                    let new_e2_1 = `${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}=>${new_e2_vert}`;
                    let new_face_e2 = `${new_e3_vert}=>${new_e2_vert}`;
                    // add to new_edgeFaceMap
                    temp_edgefaces = new_edgeFaceMap.get(new_e3_2);
                    if (temp_edgefaces == undefined) {
                        new_e3_2 = `${new_e3_vert}=>${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_e3_2);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_e3_2, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    temp_edgefaces = new_edgeFaceMap.get(new_e2_1);
                    if (temp_edgefaces == undefined) {
                        new_e2_1 = `${new_e2_vert}=>${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_e2_1);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_e2_1, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
                    if (temp_edgefaces == undefined) {
                        new_face_e2 = `${new_e2_vert}=>${new_e3_vert}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_face_e2, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    // add to new_faceEdgeMap
                    temp_faceedges = new_faceEdgeMap.get(curr_face_index);
                    if (temp_faceedges != undefined) {
                        temp_faceedges.push(new_e3_2);
                        temp_faceedges.push(new_e2_1);
                        temp_faceedges.push(new_face_e2);
                    }
                    else
                        new_faceEdgeMap.set(curr_face_index, [new_e3_2, new_e2_1, new_face_e2]);
                    // make new face 3 (using a, new vert on edge2, and new vert on edge1)
                    curr_face_index++;
                    if ((old_vert_a == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_a == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_b == adj.faces[f][2]))
                        new_faces.push([`${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}`, new_e1_vert, new_e2_vert]);
                    if ((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2]))
                        new_faces.push([`${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}`, new_e2_vert, new_e1_vert]);
                    // add to adjVert
                    loopsubdiv_add_adjacent_verts(new_vert_a, new_e2_vert, new_e1_vert, new_vertexAdjMap);
                    let new_e1_2 = `${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}=>${new_e1_vert}`;
                    let new_e2_2 = `${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}=>${new_e2_vert}`;
                    let new_face_e3 = `${new_e1_vert}=>${new_e2_vert}`;
                    // add to new_edgeFaceMap
                    temp_edgefaces = new_edgeFaceMap.get(new_e1_2);
                    if (temp_edgefaces == undefined) {
                        new_e1_2 = `${new_e1_vert}=>${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_e1_2);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_e1_2, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    temp_edgefaces = new_edgeFaceMap.get(new_e2_2);
                    if (temp_edgefaces == undefined) {
                        new_e2_2 = `${new_e2_vert}=>${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_e2_2);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_e2_2, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    temp_edgefaces = new_edgeFaceMap.get(new_face_e3);
                    if (temp_edgefaces == undefined) {
                        new_face_e3 = `${new_e2_vert}=>${new_e1_vert}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_face_e3);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_face_e3, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    // add to new_faceEdgeMap
                    temp_faceedges = new_faceEdgeMap.get(curr_face_index);
                    if (temp_faceedges != undefined) {
                        temp_faceedges.push(new_e1_2);
                        temp_faceedges.push(new_e2_2);
                        temp_faceedges.push(new_face_e3);
                    }
                    else
                        new_faceEdgeMap.set(curr_face_index, [new_e1_2, new_e2_2, new_face_e3]);
                    // make new face 4 (using new vert on edge1, new vert on edge2, and new vert on edge3)
                    curr_face_index++;
                    if ((old_vert_a == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_a == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_b == adj.faces[f][2]))
                        new_faces.push([new_e1_vert, new_e3_vert, new_e2_vert]);
                    if ((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2]))
                        new_faces.push([new_e1_vert, new_e2_vert, new_e3_vert]);
                    // add to adjVert
                    const [temp1, temp2, temp3] = new_e1_vert.split(',').map(Number);
                    const new_e1_vert_vec = new Vec3([temp1, temp2, temp3]);
                    loopsubdiv_add_adjacent_verts(new_e1_vert_vec, new_e2_vert, new_e3_vert, new_vertexAdjMap);
                    // add to new_edgeFaceMap
                    new_face_e1 = `${new_e3_vert}=>${new_e1_vert}`;
                    new_face_e2 = `${new_e3_vert}=>${new_e2_vert}`;
                    new_face_e3 = `${new_e1_vert}=>${new_e2_vert}`;
                    temp_edgefaces = new_edgeFaceMap.get(new_face_e1);
                    if (temp_edgefaces == undefined) {
                        new_face_e1 = `${new_e1_vert}=>${new_e3_vert}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_face_e1);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_face_e1, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
                    if (temp_edgefaces == undefined) {
                        new_face_e2 = `${new_e2_vert}=>${new_e3_vert}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_face_e2, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    temp_edgefaces = new_edgeFaceMap.get(new_face_e3);
                    if (temp_edgefaces == undefined) {
                        new_face_e3 = `${new_e2_vert}=>${new_e1_vert}`;
                        temp_edgefaces = new_edgeFaceMap.get(new_face_e3);
                        if (temp_edgefaces == undefined)
                            new_edgeFaceMap.set(new_face_e3, [curr_face_index]);
                        else
                            temp_edgefaces.push(curr_face_index);
                    }
                    else
                        temp_edgefaces.push(curr_face_index);
                    // add to new_faceEdgeMap
                    temp_faceedges = new_faceEdgeMap.get(curr_face_index);
                    if (temp_faceedges != undefined) {
                        temp_faceedges.push(new_face_e1);
                        temp_faceedges.push(new_face_e2);
                        temp_faceedges.push(new_face_e3);
                    }
                    else
                        new_faceEdgeMap.set(curr_face_index, [new_face_e1, new_face_e2, new_face_e3]);
                    curr_face_index++;
                }
            }
        }
        adj.faces = new_faces;
        adj.edgeFaceMap = new_edgeFaceMap;
        adj.faceEdgeMap = new_faceEdgeMap;
        adj.vertexAdjMap = new_vertexAdjMap;
        adj.verts = new_verts;
    }
    loopsubdiv_remake_mesh_positions(adj, mesh);
}
// assuming each face already has vertices in counterclockwise order
function loopsubdiv_remake_mesh_positions(adj, mesh) {
    let new_positions = [];
    let new_normals = [];
    for (let f = 0; f < adj.faces.length; f++) {
        const a = adj.verts.get(adj.faces[f][0]);
        const b = adj.verts.get(adj.faces[f][1]);
        const c = adj.verts.get(adj.faces[f][2]);
        if (a != undefined && b != undefined && c != undefined) {
            new_positions.push(a.x);
            new_positions.push(a.y);
            new_positions.push(a.z);
            new_positions.push(b.x);
            new_positions.push(b.y);
            new_positions.push(b.z);
            new_positions.push(c.x);
            new_positions.push(c.y);
            new_positions.push(c.z);
            let vec_ab = new Vec3();
            b.subtract(a, vec_ab);
            let vec_ac = new Vec3();
            c.subtract(a, vec_ac);
            let normal = new Vec3();
            Vec3.cross(vec_ab, vec_ac, normal);
            normal.normalize();
            for (let i = 0; i < 3; i++) {
                new_normals.push(normal.x, normal.y, normal.z);
            }
        }
    }
    mesh.geometry.position.values = new Float32Array(new_positions);
    mesh.geometry.position.count = new_positions.length / 3;
    mesh.geometry.normal.values = new Float32Array(new_normals);
    mesh.geometry.normal.count = new_normals.length / 3;
}
function catmullclark_compute_facepoints(face_points, faces, verts, new_verts) {
    for (let f = 0; f < faces.length; f++) {
        let sum = new Vec3();
        const face_verts = faces[f];
        const v1 = verts.get(face_verts[0]);
        const v2 = verts.get(face_verts[1]);
        const v3 = verts.get(face_verts[2]);
        const v4 = verts.get(face_verts[3]);
        if (v1 != undefined && v2 != undefined && v3 != undefined && v4 != undefined) {
            v1.add(v2, sum);
            sum.add(v3);
            sum.add(v4);
            sum.scale(0.25);
            face_points[f] = sum;
            new_verts.set(`${sum.x},${sum.y},$${sum.z}`, sum);
        }
        else
            console.log("huhv1v2v3v4");
    }
}
function catmullclark_compute_edgepoints(edgeFaceMap, face_points, verts, oldedge_edgepoint, new_verts) {
    edgeFaceMap.forEach((faces, edge) => {
        const temp = edge.split('=>');
        const v1_str = temp[0];
        const v2_str = temp[1];
        const v1 = verts.get(v1_str);
        const v2 = verts.get(v2_str);
        let new_edgepoint = new Vec3();
        if (v1 != undefined && v2 != undefined) {
            if (faces.length == 2) { // interior edge
                const facepoint1 = face_points[faces[0]];
                const facepoint2 = face_points[faces[1]];
                v1.add(v2, new_edgepoint);
                new_edgepoint.add(facepoint1);
                new_edgepoint.add(facepoint2);
                new_edgepoint.scale(0.25);
            }
            else { // boundary edge (maybe also sharp edge??)
                const facepoint = face_points[faces[0]];
                v1.add(v2, new_edgepoint);
                new_edgepoint.add(facepoint);
                new_edgepoint.scale(1.0 / 3.0);
            }
            oldedge_edgepoint.set(edge, new_edgepoint);
            new_verts.set(`${new_edgepoint.x},${new_edgepoint.y},${new_edgepoint.z}`, new_edgepoint);
        }
        else
            console.log("huhv1v2");
    });
}
function catmullclark_compute_new_verts(verts, vertexFaceMap, face_points, oldedge_edgepoint, vertexEdgeMap, oldvert_newvert, new_verts) {
    verts.forEach((vec, str) => {
        // average all face points on adjacent faces
        const adj_faces = vertexFaceMap.get(str);
        let F = new Vec3();
        let n = 0;
        if (adj_faces != undefined) {
            n = adj_faces.length;
            for (let f = 0; f < n; f++) {
                F.add(face_points[adj_faces[f]]);
            }
            F.scale(1.0 / n);
        }
        else
            console.log("huhadjfaces");
        // average of edgepoints of all edges this vertex is on
        const edges = vertexEdgeMap.get(str);
        let R = new Vec3();
        if (edges != undefined) {
            for (let e = 0; e < edges.length; e++) {
                const curr_edge = oldedge_edgepoint.get(edges[e]);
                console.log("edges: ", edges);
                console.log("looking for: ", edges[e]);
                console.log(oldedge_edgepoint.entries());
                if (curr_edge != undefined)
                    R.add(curr_edge);
                else
                    console.log("huhedge");
            }
            R.scale(1.0 / edges.length);
        }
        else
            console.log("huhedges");
        let new_vert = new Vec3();
        vec.scale(n - 3, new_vert);
        R.scale(2);
        new_vert.add(R);
        new_vert.add(F);
        new_vert.scale(1.0 / n);
        oldvert_newvert.set(str, new_vert);
        new_verts.set(`${new_vert.x},${new_vert.y},${new_vert.z}`, new_vert);
    });
}
function catmullclark_make_newface(v1, v2, v3, v4, curr_face_index, new_edgeFaceMap, new_vertexFaceMap, new_faceEdgeMap, new_vertexEdgeMap) {
    let edge_v1v2 = v1 + '=>' + v2;
    let edge_v2v3 = v2 + '=>' + v3;
    let edge_v3v4 = v3 + '=>' + v4;
    let edge_v4v1 = v4 + '=>' + v1;
    // add to new_edgeFaceMap
    let tempedgeface = new_edgeFaceMap.get(edge_v1v2);
    if (tempedgeface == undefined) {
        edge_v1v2 = v2 + '=>' + v1;
        tempedgeface = new_edgeFaceMap.get(edge_v1v2);
        if (tempedgeface == undefined)
            new_edgeFaceMap.set(edge_v1v2, [curr_face_index]);
        else
            tempedgeface.push(curr_face_index);
    }
    else
        tempedgeface.push(curr_face_index);
    tempedgeface = new_edgeFaceMap.get(edge_v2v3);
    if (tempedgeface == undefined) {
        edge_v2v3 = v3 + '=>' + v2;
        tempedgeface = new_edgeFaceMap.get(edge_v2v3);
        if (tempedgeface == undefined)
            new_edgeFaceMap.set(edge_v2v3, [curr_face_index]);
        else
            tempedgeface.push(curr_face_index);
    }
    else
        tempedgeface.push(curr_face_index);
    tempedgeface = new_edgeFaceMap.get(edge_v3v4);
    if (tempedgeface == undefined) {
        edge_v3v4 = v4 + '=>' + v3;
        tempedgeface = new_edgeFaceMap.get(edge_v3v4);
        if (tempedgeface == undefined)
            new_edgeFaceMap.set(edge_v3v4, [curr_face_index]);
        else
            tempedgeface.push(curr_face_index);
    }
    else
        tempedgeface.push(curr_face_index);
    tempedgeface = new_edgeFaceMap.get(edge_v4v1);
    if (tempedgeface == undefined) {
        edge_v4v1 = v1 + '=>' + v4;
        tempedgeface = new_edgeFaceMap.get(edge_v4v1);
        if (tempedgeface == undefined)
            new_edgeFaceMap.set(edge_v4v1, [curr_face_index]);
        else
            tempedgeface.push(curr_face_index);
    }
    else
        tempedgeface.push(curr_face_index);
    // add to new_vertexFaceMap
    catmullclark_add_vertexFaceMap(new_vertexFaceMap, curr_face_index, v1, v2, v3, v4);
    // add to new_faceEdgeMap
    new_faceEdgeMap.set(curr_face_index, [edge_v1v2, edge_v2v3, edge_v3v4, edge_v4v1]);
    // add to new_vertexEdgeMap
    catmullclark_add_vertexEdgeMap(v1, v2, v3, v4, edge_v1v2, edge_v2v3, edge_v3v4, edge_v4v1, new_vertexEdgeMap);
}
function catmullclark_add_vertexFaceMap(new_vertexFaceMap, curr_face_index, v1, v2, v3, v4) {
    let tempvertexface = new_vertexFaceMap.get(v1);
    if (tempvertexface == undefined)
        new_vertexFaceMap.set(v1, [curr_face_index]);
    else
        tempvertexface.push(curr_face_index);
    tempvertexface = new_vertexFaceMap.get(v2);
    if (tempvertexface == undefined)
        new_vertexFaceMap.set(v2, [curr_face_index]);
    else
        tempvertexface.push(curr_face_index);
    tempvertexface = new_vertexFaceMap.get(v3);
    if (tempvertexface == undefined)
        new_vertexFaceMap.set(v3, [curr_face_index]);
    else
        tempvertexface === null || tempvertexface === void 0 ? void 0 : tempvertexface.push(curr_face_index);
    tempvertexface = new_vertexFaceMap.get(v4);
    if (tempvertexface == undefined)
        new_vertexFaceMap.set(v4, [curr_face_index]);
    else
        tempvertexface === null || tempvertexface === void 0 ? void 0 : tempvertexface.push(curr_face_index);
}
function catmullclark_add_vertexEdgeMap(v1, v2, v3, v4, ev1v2, ev2v3, ev3v4, ev4v1, new_vertexEdgeMap) {
    let tempedges = new_vertexEdgeMap.get(v1);
    if (tempedges == undefined)
        new_vertexEdgeMap.set(v1, [ev1v2, ev4v1]);
    else
        tempedges.push(ev1v2, ev4v1);
    tempedges = new_vertexEdgeMap.get(v2);
    if (tempedges == undefined)
        new_vertexEdgeMap.set(v2, [ev1v2, ev2v3]);
    else
        tempedges.push(ev1v2, ev2v3);
    tempedges = new_vertexEdgeMap.get(v3);
    if (tempedges == undefined)
        new_vertexEdgeMap.set(v3, [ev2v3, ev3v4]);
    else
        tempedges.push(ev2v3, ev3v4);
    tempedges = new_vertexEdgeMap.get(v4);
    if (tempedges == undefined)
        new_vertexEdgeMap.set(v4, [ev3v4, ev4v1]);
    else
        tempedges.push(ev3v4, ev4v1);
}
export function catmullClarkSubdivision(mesh, iterations, adj) {
    for (let iter = 0; iter < iterations; iter++) {
        let new_faces = [];
        let new_verts = new Map();
        let new_edgeFaceMap = new Map();
        let new_vertexFaceMap = new Map();
        let new_faceEdgeMap = new Map();
        let new_vertexEdgeMap = new Map();
        let face_points = [];
        catmullclark_compute_facepoints(face_points, adj.faces, adj.verts, new_verts);
        let oldedge_edgepoint = new Map();
        catmullclark_compute_edgepoints(adj.edgeFaceMap, face_points, adj.verts, oldedge_edgepoint, new_verts);
        let oldvert_newvert = new Map();
        catmullclark_compute_new_verts(adj.verts, adj.vertexFaceMap, face_points, oldedge_edgepoint, adj.vertexEdgeMap, oldvert_newvert, new_verts);
        let curr_face_index = 0;
        for (let f = 0; f < adj.faces.length; f++) {
            const curr_facepoint = face_points[f];
            const v1_str = adj.faces[f][0];
            const v2_str = adj.faces[f][1];
            const v3_str = adj.faces[f][2];
            const v4_str = adj.faces[f][3];
            const v1 = oldvert_newvert.get(v1_str);
            const v2 = oldvert_newvert.get(v2_str);
            const v3 = oldvert_newvert.get(v3_str);
            const v4 = oldvert_newvert.get(v4_str);
            const edges = adj.faceEdgeMap.get(f);
            let e12 = '';
            let e23 = '';
            let e34 = '';
            let e41 = '';
            if (edges != undefined) {
                // find which edge is edge between v1 and v2
                if (edges[0].includes(v1_str) && edges[0].includes(v2_str))
                    e12 = edges[0];
                else if (edges[1].includes(v1_str) && edges[0].includes(v2_str))
                    e12 = edges[1];
                else if (edges[2].includes(v1_str) && edges[2].includes(v2_str))
                    e12 = edges[2];
                else if (edges[3].includes(v1_str) && edges[3].includes(v2_str))
                    e12 = edges[3];
                else
                    console.log("huhe12");
                // find which edge is edge between v2 and v3
                if (edges[0].includes(v2_str) && edges[0].includes(v3_str))
                    e23 = edges[0];
                else if (edges[1].includes(v2_str) && edges[0].includes(v3_str))
                    e23 = edges[1];
                else if (edges[2].includes(v2_str) && edges[2].includes(v3_str))
                    e23 = edges[2];
                else if (edges[3].includes(v2_str) && edges[3].includes(v3_str))
                    e23 = edges[3];
                else
                    console.log("huhe23");
                // find which edge is edge between v3 and v4
                if (edges[0].includes(v3_str) && edges[0].includes(v4_str))
                    e34 = edges[0];
                else if (edges[1].includes(v3_str) && edges[0].includes(v4_str))
                    e34 = edges[1];
                else if (edges[2].includes(v3_str) && edges[2].includes(v4_str))
                    e34 = edges[2];
                else if (edges[3].includes(v3_str) && edges[3].includes(v4_str))
                    e34 = edges[3];
                else
                    console.log("huhe34");
                // find which edge is edge between v1 and v2
                if (edges[0].includes(v4_str) && edges[0].includes(v1_str))
                    e41 = edges[0];
                else if (edges[1].includes(v4_str) && edges[0].includes(v1_str))
                    e41 = edges[1];
                else if (edges[2].includes(v4_str) && edges[2].includes(v1_str))
                    e41 = edges[2];
                else if (edges[3].includes(v4_str) && edges[3].includes(v1_str))
                    e41 = edges[3];
                else
                    console.log("huhe41");
            }
            else
                console.log("huhedgesconnect");
            // make new face 1 (using v1, e12, curr_facepoint, and e41)
            const curr_facepoint_str = `${curr_facepoint.x},${curr_facepoint.y},${curr_facepoint.z}`;
            new_faces.push([v1_str, e41, curr_facepoint_str, e12]);
            catmullclark_make_newface(v1_str, e12, curr_facepoint_str, e41, curr_face_index, new_edgeFaceMap, new_vertexFaceMap, new_faceEdgeMap, new_vertexEdgeMap);
            curr_face_index++;
            // make new face 2 (using e12, curr_facepoint, e23, and v2)
            new_faces.push([e12, curr_facepoint_str, e23, v2_str]);
            catmullclark_make_newface(e12, v2_str, e23, curr_facepoint_str, curr_face_index, new_edgeFaceMap, new_vertexFaceMap, new_faceEdgeMap, new_vertexEdgeMap);
            curr_face_index++;
            // make new face 3 (using e41, v4, e34, and curr_facepoint)
            new_faces.push([e41, v4_str, e34, curr_facepoint_str]);
            catmullclark_make_newface(e41, curr_facepoint_str, e34, v4_str, curr_face_index, new_edgeFaceMap, new_vertexFaceMap, new_faceEdgeMap, new_vertexEdgeMap);
            curr_face_index++;
            // make new face 4 (using curr_facepoint, e34, v3, and e23)
            new_faces.push([curr_facepoint_str, e34, v3_str, e23]);
            catmullclark_make_newface(curr_facepoint_str, e23, v3_str, e34, curr_face_index, new_edgeFaceMap, new_vertexFaceMap, new_faceEdgeMap, new_vertexEdgeMap);
            curr_face_index++;
        }
        adj.edgeFaceMap = new_edgeFaceMap;
        adj.faceEdgeMap = new_faceEdgeMap;
        adj.faces = new_faces;
        adj.vertexEdgeMap = new_vertexEdgeMap;
        adj.vertexFaceMap = new_vertexFaceMap;
        adj.verts = new_verts;
    }
    catmullclark_remake_mesh_positions(adj, mesh);
}
function catmullclark_remake_mesh_positions(adj, mesh) {
    let new_positions = [];
    let new_normals = [];
    for (let f = 0; f < adj.faces.length; f++) {
        const a = adj.verts.get(adj.faces[f][0]);
        const b = adj.verts.get(adj.faces[f][1]);
        const c = adj.verts.get(adj.faces[f][2]);
        const d = adj.verts.get(adj.faces[f][3]);
        if (a != undefined && b != undefined && c != undefined && d != undefined) {
            // triangle 1
            new_positions.push(a.x);
            new_positions.push(a.y);
            new_positions.push(a.z);
            new_positions.push(b.x);
            new_positions.push(b.y);
            new_positions.push(b.z);
            new_positions.push(c.x);
            new_positions.push(c.y);
            new_positions.push(c.z);
            // triangle 2
            new_positions.push(c.x);
            new_positions.push(c.y);
            new_positions.push(c.z);
            new_positions.push(d.x);
            new_positions.push(d.y);
            new_positions.push(d.z);
            new_positions.push(a.x);
            new_positions.push(a.y);
            new_positions.push(a.z);
            let vec_ab = new Vec3();
            b.subtract(a, vec_ab);
            let vec_ac = new Vec3();
            c.subtract(a, vec_ac);
            let normal = new Vec3();
            Vec3.cross(vec_ab, vec_ac, normal);
            normal.normalize();
            for (let i = 0; i < 6; i++) {
                new_normals.push(normal.x, normal.y, normal.z);
            }
        }
        else
            console.log("huhabcd");
    }
    mesh.geometry.position.values = new Float32Array(new_positions);
    mesh.geometry.position.count = new_positions.length / 3;
    mesh.geometry.normal.values = new Float32Array(new_normals);
    mesh.geometry.normal.count = new_normals.length / 3;
}
//# sourceMappingURL=Subdivision.js.map