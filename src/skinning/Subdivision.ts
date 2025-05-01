import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { SkinningAnimation } from "./App.js";
import { Mat4, Vec3, Vec4, Vec2, Mat2, Quat } from "../lib/TSM.js";
import { Mesh, MeshGeometry } from "./Scene.js";
import { AttributeLoader, MeshGeometryLoader, BoneLoader, MeshLoader } from "./AnimationFileLoader.js";


// Implements Loop and Catmull-Clark subdivision algorithms
export class adjacency_data {
  public faces: string[][]; // holds the indices of the 3 vertices for each face
  public verts: Map<string, Vec3>; // holds the vec3 vertex corresponding to a string of the xyz values
  public edgeFaceMap: Map<string, number[]>; // holds the edge as a key and the faces it is part of as the values in the Set
  public vertexAdjMap: Map<string, string[]>; // holds each vertex's neighboring vertices
  public faceEdgeMap: Map<number, string[]>; // holds the face index as a key and the edges on that face as the values in the Set

  constructor(mesh: Mesh) {
    const positions = mesh.geometry.position.values;
    this.vertexAdjMap = new Map<string, string[]>();
    this.verts = new Map<string, Vec3>();
    this.edgeFaceMap = new Map<string, number[]>();
    this.faceEdgeMap = new Map<number, string[]>();
    this.faces = [];

    for(let i = 0; i < positions.length; i += 9) {
      const v1 = `${positions[i]},${positions[i+1]},${positions[i+2]}`;
      const v2 = `${positions[i+3]},${positions[i+4]},${positions[i+5]}`;
      const v3 = `${positions[i+6]},${positions[i+7]},${positions[i+8]}`;
      this.verts.set(v1, new Vec3([positions[i], positions[i+1], positions[i+2]]));
      this.verts.set(v2, new Vec3([positions[i+3], positions[i+4], positions[i+5]]));
      this.verts.set(v3, new Vec3([positions[i+6], positions[i+7], positions[i+8]]));
      
      // vertex adjacency
      let val: string[] | undefined = this.vertexAdjMap.get(v1);
      if(val != undefined) {
        val.push(v2);
        val.push(v3);
      } else
        this.vertexAdjMap.set(v1, [v2, v3]);

      val = this.vertexAdjMap.get(v2);
      if(val != undefined) {
        val.push(v1);
        val.push(v3);
      } else
        this.vertexAdjMap.set(v2, [v1, v3]);

      val = this.vertexAdjMap.get(v3);
      if(val != undefined) {
        val.push(v1);
        val.push(v2);
      } else
        this.vertexAdjMap.set(v3, [v1, v2]);
      
      this.faces.push([v1, v2, v3]);
      const face_index = this.faces.length - 1;

      // make edges and set map for edge-face relations
      let edge1: string = v1 + '=>' + v2;
      let edge2: string = v1 + '=>' + v3;
      let edge3: string = v2 + '=>' + v3;
      let edgeVal: number[] | undefined = this.edgeFaceMap.get(edge1);
      if(edgeVal == undefined) {
        edge1 = v2 + '=>' + v1;
        edgeVal = this.edgeFaceMap.get(edge1);
        if(edgeVal == undefined)
          this.edgeFaceMap.set(edge1, [face_index]);
        else
          edgeVal.push(face_index);
      }
      else
        edgeVal.push(face_index);

      edgeVal = this.edgeFaceMap.get(edge2);
      if(edgeVal == undefined) {
        edge2 = v3 + '=>' + v1;
        edgeVal = this.edgeFaceMap.get(edge2);
        if(edgeVal == undefined)
          this.edgeFaceMap.set(edge2, [face_index]);
        else
          edgeVal.push(face_index);
      }
      else
        edgeVal.push(face_index);

      edgeVal = this.edgeFaceMap.get(edge3);
      if(edgeVal == undefined) {
        edge3 = v3 + '=>' + v2;
        edgeVal = this.edgeFaceMap.get(edge3);
        if(edgeVal == undefined)
          this.edgeFaceMap.set(edge3, [face_index]);
        else
          edgeVal.push(face_index);
      }
      else
        edgeVal.push(face_index);

      // make faceEdgeMap
      let face_edges: string[] | undefined = this.faceEdgeMap.get(face_index);
      if(face_edges != undefined) {
        face_edges.push(edge1);
        face_edges.push(edge2);
        face_edges.push(edge3);
      } else
        this.faceEdgeMap.set(face_index, [edge1, edge2, edge3]);
    }

    this.removeDuplicatesFromMaps();
    // console.log("vertex adj: ", this.vertexAdjMap.entries());
    // console.log("faceedge: ", this.faceEdgeMap.entries());
    // console.log("edgeface: ", this.edgeFaceMap.entries());
  }

  private removeDuplicatesFromMaps(): void {
    for (const [key, value] of this.vertexAdjMap.entries()) {
      const unique = Array.from(new Set(value));
      this.vertexAdjMap.set(key, unique);
    }
  
    for (const [key, value] of this.faceEdgeMap.entries()) {
      const unique = Array.from(new Set(value));
      this.faceEdgeMap.set(key, unique);
    }
  
    for (const [key, value] of this.edgeFaceMap.entries()) {
      const unique = Array.from(new Set(value));
      this.edgeFaceMap.set(key, unique);
    }
  }
}

// for the sake of the demo and testing, we will say that the first edge in the edgeFaceMap is a sharp crease
export function loopSubdivision(mesh: Mesh, iterations: number, adj: adjacency_data): void {
  const new_faces: string[][] = []; 
  const new_verts: Map<string, Vec3> = new Map<string, Vec3>(); 
  const new_edgeFaceMap: Map<string, Set<number>> = new Map<string, Set<number>>(); 
  const new_vertexAdjMap: Map<string, Set<string>> = new Map<string, Set<string>>();
  const new_faceEdgeMap: Map<number, Set<string>> = new Map<number, Set<string>>();
  const oldedge_vertMap: Map<string, string> = new Map<string, string>();
  const oldvert_newvert: Map<string, Vec3> = new Map<string, Vec3>();

  let beta: number = 3.0/16.0; // default assumes n = 3, n = # of neighboring vertices
  let first: boolean = true; // here just to mark first edge as sharp edge
  for (const [edge, faces] of adj.edgeFaceMap.entries()) {
    const [v1, v2] = edge.split('=>');
    const a = adj.verts.get(v1);
    const b = adj.verts.get(v2);
    if(faces.length == 2 && !first) { // interior edge (vertices on edge are also interior)
      // compute even (new) vertices
      if(a == undefined)
        console.log("huhhhhhhhhha");
      else {
        let new_vert_v1: Vec3 = new Vec3();
        const adj_verts_v1 = adj.vertexAdjMap.get(v1);
        if(adj_verts_v1 == undefined)
          console.log("huhadjv1");
        else {
          const n = adj_verts_v1.length;
          let sum: Vec3 = new Vec3();
          for(let i = 0; i < n; i++) {
            const [adj1, adj2, adj3] = adj_verts_v1[i].split(',').map(Number);
            sum.add(new Vec3([adj1, adj2, adj3]));
          }
          if(n > 3)
            beta = 3.0 / (8.0 * n);
          // new value = original point * (1-n*beta) + (sum up all points of neighboring vertices) * beta
          sum.scale(beta);
          a.scale(1 - n*beta, new_vert_v1);
          new_vert_v1.add(sum);
          oldvert_newvert.set(v1, new_vert_v1);
        }
      }
      
      if(b == undefined)
        console.log("huhhhhhhhhhb");
      else {
        let new_vert_v2: Vec3 = new Vec3();
        const adj_verts_v2 = adj.vertexAdjMap.get(v2);
        if(adj_verts_v2 == undefined)
          console.log("huhadjv2");
        else {
          const n = adj_verts_v2.length;
          let sum: Vec3 = new Vec3();
          for(let i = 0; i < n; i++) {
            const [adj1, adj2, adj3] = adj_verts_v2[i].split(',').map(Number);
            sum.add(new Vec3([adj1, adj2, adj3]));
          }
          if(n > 3)
            beta = 3.0 / (8.0 * n);
          // new value = original point * (1-n*beta) + (sum up all points of neighboring vertices) * beta
          sum.scale(beta);
          b.scale(1 - n*beta, new_vert_v2);
          new_vert_v2.add(sum);
          oldvert_newvert.set(v2, new_vert_v2);
        }
      }

      // compute odd (old) vertices
      // get c
      const edges_on_face1 = adj.faceEdgeMap.get(faces[0]);
      let string_c: string = '';
      if(edges_on_face1 == undefined)
        console.log("huhhhhhhhhhhc");
      else {
        for(let i = 0; i < 3; i++) {
          const curr_edge = edges_on_face1[i];
          if(curr_edge == edge)
            continue;
          const [curr_v1, curr_v2] = curr_edge.split('=>');
          if(curr_v1 == v1 || curr_v1 == v2)
            string_c = curr_v2;
          else if(curr_v2 == v1 || curr_v2 == v2)
            string_c = curr_v1;
        }
      }
      const c = adj.verts.get(string_c);

      // get d
      const edges_on_face2 = adj.faceEdgeMap.get(faces[1]);
      let string_d: string = '';
      if(edges_on_face2 == undefined)
        console.log("huhhhhhhhhhhd");
      else {
        for(let i = 0; i < 3; i++) {
          const curr_edge = edges_on_face2[i];
          if(curr_edge == edge)
            continue;
          const [curr_v1, curr_v2] = curr_edge.split('=>');
          if(curr_v1 == v1 || curr_v1 == v2)
            string_d = curr_v2;
          else if(curr_v2 == v1 || curr_v2 == v2)
            string_d = curr_v1;
        }
      }
      const d = adj.verts.get(string_d);

      let new_vert: Vec3 = new Vec3();
      if(a != undefined && b != undefined && c != undefined && d != undefined) {
        // 0.375 * (a+b) + 0.125 * (c+d)
        a.add(b, new_vert);
        new_vert.scale(0.375);
        let temp_cd: Vec3 = new Vec3();
        c.add(d, temp_cd);
        temp_cd.scale(0.125);
        new_vert.add(temp_cd);

        new_verts.set(`${new_vert}`, new_vert);
        oldedge_vertMap.set(edge, `${new_vert}`);
      } else
        console.log("huhhhhhhabcd");
    } else { // boundary or sharp edge
      first = false;
      if(a != undefined && b != undefined) {
        // compute even (old) vertices
        // new value = 0.125 * (a+b) + 0.75 * original point
        let new_vert_v1: Vec3 = new Vec3();
        a.add(b, new_vert_v1);
        new_vert_v1.scale(0.125);
        let temp: Vec3 = new Vec3();
        a.scale(0.75, temp);
        new_vert_v1.add(temp);

        let new_vert_v2: Vec3 = new Vec3();
        a.add(b, new_vert_v2);
        new_vert_v2.scale(0.125);
        temp = new Vec3();
        b.scale(0.75, temp);
        new_vert_v2.add(temp);

        oldvert_newvert.set(v1, new_vert_v1);
        oldvert_newvert.set(v2, new_vert_v2);

        // compute odd (new) vertices
        // 0.5 * (a+b)
        let new_vert: Vec3 = new Vec3();
        a.add(b, new_vert);
        new_vert.scale(0.5);

        new_verts.set(`${new_vert}`, new_vert);
        oldedge_vertMap.set(edge, `${new_vert}`);
      } else
        console.log("huhhhhhhab");
    }
  }
  /*     
    - NOTE: - make a map where keys are original vertices and values are new values
            - make a map where keys are the edges, value is new odd vertex points
            - edit this.vertices to hold new old values and new points
                - MAKE SURE TO REMOVE ORIGINAL VERTEX KEYS AND VALUES (MAYBE JUST MAKE NEW ONES AND SET THE NEW TO THE MAPS)
            - edit this.vertexAdjMap to hold new points and their adjacent vertices
                - MAKE SURE TO REMOVE ORIGINAL VERTEX KEYS AND VALUES
            - edit this.faces to hold new faces created by the new points
                - MAKE SURE TO REMOVE ORIGINAL FACES
            - edit this.edgeFaceMap to hold new edges from the new points, and the corresponding new faces connected to each
                - MAKE SURE TO REMOVE ORIGINAL EDGE AND ORIGINAL FACES
            - edit this.faceEdgeMap to hold new faces and the corresponding new edges formed from the new points
                - there should be 4 new faces for each original face, AND MAKE SURE TO REMOVE ORIGINAL FACE AND ORIGINAL EDGES
            - THIS IS ALL ONE ITERATION, SO MAKE A FOR LOOP AROUND THIS THAT GOES UNTIL iterations NUMBER OF TIMES!!!!!!
            - AFTER THE LOOP, LOOP THROUGH EACH FACE, GET THE THREE VERTICES ON THAT FACE, CROSS PRODUCT (IN DC) AND ADD TO A NEW 
                ARRAY OF VERTICES IN COUNTERCLOCKWISE ORDER, AND SET MESH'S GEOMETRY POSTION TO THIS NEW ARRAY
  */
}

export function catmullClarkSubdivision(mesh: Mesh, iterations: number): void {
  /*
    PSEUDOCODE THIS NEXT
  */
}