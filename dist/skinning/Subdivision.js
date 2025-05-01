import { Vec3 } from "../lib/TSM.js";
// Implements Loop and Catmull-Clark subdivision algorithms
export class adjacency_data {
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
            const face_index = this.faces.length - 1;
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
        this.removeDuplicatesFromMaps();
        // const numbers = [1, 2, 2, 3, 4, 4, 5];
        // const uniqueNumbers = Array.from(new Set(numbers));
        // console.log(uniqueNumbers); // [1, 2, 3, 4, 5]
        console.log("vertex adj: ", this.vertexAdjMap.entries());
        console.log("faceedge: ", this.faceEdgeMap.entries());
        console.log("edgeface: ", this.edgeFaceMap.entries());
    }
    removeDuplicatesFromMaps() {
        // Remove duplicates from vertexAdjMap
        for (const [key, value] of this.vertexAdjMap.entries()) {
            const unique = Array.from(new Set(value));
            this.vertexAdjMap.set(key, unique);
        }
        // Remove duplicates from faceEdgeMap
        for (const [key, value] of this.faceEdgeMap.entries()) {
            const unique = Array.from(new Set(value));
            this.faceEdgeMap.set(key, unique);
        }
        // Remove duplicates from edgeFaceMap
        for (const [key, value] of this.edgeFaceMap.entries()) {
            const unique = Array.from(new Set(value));
            this.edgeFaceMap.set(key, unique);
        }
    }
}
function find_opposing_vertex(edge_on_face, edge, v1, v2) {
    let opp_vert_str = '';
    if (!edge_on_face.includes(edge)) {
        const [ev1, ev2] = edge_on_face.split('=>');
        if (!(ev1.includes(v1) || ev1.includes(v2)))
            opp_vert_str = ev1;
        else if (!(ev2.includes(v1) || ev2.includes(v2)))
            opp_vert_str = ev2;
    }
    return opp_vert_str;
}
// for the sake of the demo and testing, we will say that the first edge in the edgeFaceMap is a sharp crease
export function loopSubdivision(mesh, iterations, adj) {
    const new_faces = [];
    const new_verts = new Map();
    const new_edgeFaceMap = new Map();
    const new_vertexAdjMap = new Map();
    const new_faceEdgeMap = new Map();
    // compute odd (new) vertices
    let first = true; // here just to mark first edge as sharp edge
    let beta = 3.0 / 16.0; // default assumes n = 3
    for (const [edge, faces] of adj.edgeFaceMap.entries()) {
        if (faces.size == 2 && !first) { // interior edge (vertices on edge are also interior)
            //- if interior, new point on edge = 0.375 * (a+b) + 0.125 * (c+d) where 
            // - a and b are endpoints of the edge, and c and d are opposing vertices of the two faces connected to the edge
            const [v1, v2] = edge.split('=>');
            const a = adj.verts.get(v1);
            const b = adj.verts.get(v2);
            // get c
            const face1_iter = adj.faceEdgeMap.values();
            let edge_on_face1 = face1_iter.next().value;
            let string_c = find_opposing_vertex(edge_on_face1, edge, v1, v2);
            if (string_c == '') {
                edge_on_face1 = face1_iter.next().value;
                string_c = find_opposing_vertex(edge_on_face1, edge, v1, v2);
                if (string_c == '') {
                    edge_on_face1 = face1_iter.next().value;
                    string_c = find_opposing_vertex(edge_on_face1, edge, v1, v2);
                }
            }
            const c = adj.verts.get(string_c);
            // get d
            const face2_iter = adj.faceEdgeMap.values();
            let edge_on_face2 = face2_iter.next().value;
            let string_d = find_opposing_vertex(edge_on_face2, edge, v1, v2);
            if (string_d == '') {
                edge_on_face2 = face2_iter.next().value;
                string_d = find_opposing_vertex(edge_on_face2, edge, v1, v2);
                if (string_d == '') {
                    edge_on_face2 = face2_iter.next().value;
                    string_d = find_opposing_vertex(edge_on_face2, edge, v1, v2);
                }
            }
            const d = adj.verts.get(string_d);
        }
        else { // boundary or sharp edge
            first = false;
            //- new point on edge is midpoint 0.5 * (a+b)
        }
    }
    /*
      - odd = new vertices; even = old vertices
      - n = # of neighboring vertices
      - n > 3, beta = 3/8n
          
      - computing even vertices:
          - in same loop as ^ if interior, then new value = original point * (1-n*beta) + (sum up all points of neighboring verices) * beta
          - else (is boundary or sharp edge)
              - new value = 0.125 * (a+b) + 0.75 * original point
      
      - NOTE: - make a map where keys are original vertices and values are new values
              - make a map (IN CONSTRUCTOR) where key is face, and value is set of edges for that face
              - make a map where keys are the edges, value is new odd vertex points
              - edit this.vertices to hold new old values and new points
                  - MAKE SURE TO REMOVE ORIGINAL VERTEX KEYS AND VALUES (MAYBE JUST MAKE NEW ONES AND SET THE NEW TO THE MAPS)
              - edit this.vertexAdjMap to hold new points and their adjacent vertices
                  - MAKE SURE TO REMOVE ORIGINAL VERTEX KEYS AND VALUES
              - edit this.faces to hold new faces created by the new points
                  - MAKE SURE TO REMOVE ORIGINAL FACES
              - edit this.edgeFaceMap to hold new edges from the new points, and the corresponding new faces connected to each
                  - MAKE SURE TO REMOVE ORIGINAL EDGE AND ORIGINAL FACES
              - edit this.faceEdgeMap (make this first!!) to hold new faces and the corresponding new edges formed from the new points
                  - there should be 4 new faces for each original face, AND MAKE SURE TO REMOVE ORIGINAL FACE AND ORIGINAL EDGES
              - THIS IS ALL ONE ITERATION, SO MAKE A FOR LOOP AROUND THIS THAT GOES UNTIL iterations NUMBER OF TIMES!!!!!!
              - AFTER THE LOOP, LOOP THROUGH EACH FACE, GET THE THREE VERTICES ON THAT FACE, CROSS PRODUCT (IN DC) AND ADD TO A NEW
                  ARRAY OF VERTICES IN COUNTERCLOCKWISE ORDER, AND SET MESH'S GEOMETRY POSTION TO THIS NEW ARRAY
    */
}
export function catmullClarkSubdivision(mesh, iterations) {
    /*
      PSEUDOCODE THIS NEXT
    */
}
//# sourceMappingURL=Subdivision.js.map