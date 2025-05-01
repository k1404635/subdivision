import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { SkinningAnimation } from "./App.js";
import { Mat4, Vec3, Vec4, Vec2, Mat2, Quat } from "../lib/TSM.js";
import { Mesh, MeshGeometry } from "./Scene.js";
import { AttributeLoader, MeshGeometryLoader, BoneLoader, MeshLoader } from "./AnimationFileLoader.js";
import { NormalAnimationBlendMode } from "../lib/threejs/src/constants.js";


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

  public removeDuplicatesFromMaps(): void {
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
  const new_verts: Map<string, Vec3> = new Map<string, Vec3>(); 
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
        console.log("huha");
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
          new_verts.set(`${new_vert_v1[0]},${new_vert_v1[1]},${new_vert_v1[2]}`, new_vert_v1);
        }
      }
      
      if(b == undefined)
        console.log("huhb");
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
          new_verts.set(`${new_vert_v2[0]},${new_vert_v2[1]},${new_vert_v2[2]}`, new_vert_v2);
        }
      }

      // compute odd (old) vertices
      // get c
      const edges_on_face1 = adj.faceEdgeMap.get(faces[0]);
      let string_c: string = '';
      if(edges_on_face1 == undefined)
        console.log("huhc");
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
        console.log("huhd");
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

        new_verts.set(`${new_vert[0]},${new_vert[1]},${new_vert[2]}`, new_vert);
        oldedge_vertMap.set(edge, `${new_vert[0]},${new_vert[1]},${new_vert[2]}`);
      } else
        console.log("huhabcd");
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
        new_verts.set(`${new_vert_v1[0]},${new_vert_v1[1]},${new_vert_v1[2]}`, new_vert_v1);
        new_verts.set(`${new_vert_v2[0]},${new_vert_v2[1]},${new_vert_v2[2]}`, new_vert_v2);

        // compute odd (new) vertices
        // 0.5 * (a+b)
        let new_vert: Vec3 = new Vec3();
        a.add(b, new_vert);
        new_vert.scale(0.5);

        new_verts.set(`${new_vert[0]},${new_vert[1]},${new_vert[2]}`, new_vert);
        oldedge_vertMap.set(edge, `${new_vert[0]},${new_vert[1]},${new_vert[2]}`);
      } else
        console.log("huhab");
    }
  }

  const new_faces: string[][] = []; 
  const new_edgeFaceMap: Map<string, number[]> = new Map<string, number[]>(); 
  const new_vertexAdjMap: Map<string, string[]> = new Map<string, string[]>();
  const new_faceEdgeMap: Map<number, string[]> = new Map<number, string[]>();
  for(let f = 0; f < adj.faces.length; f++) {
    let curr_face_index: number = new_faces.length - 1;
    const edges = adj.faceEdgeMap.get(f);
    if(edges != undefined) {
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
      let old_vert_a: string = ''; 
      if(e1v1 == e2v1 || e1v1 == e2v2)
        old_vert_a = e1v1;
      else if(e1v2 == e2v1 || e1v2 == e2v2)
        old_vert_a = e1v2;
      
      // vertex between edge3 and edge1
      let old_vert_b: string = ''; 
      if(e3v1 == e1v1 || e3v1 == e1v2)
        old_vert_b = e3v1;
      else if(e3v2 == e1v1 || e3v2 == e1v2)
        old_vert_b = e3v2;
      
      // vertex between edge2 and edge3
      let old_vert_c: string = ''; 
      if(e2v1 == e3v1 || e2v1 == e3v2)
        old_vert_c = e2v1;
      else if(e2v2 == e3v1 || e2v2 == e3v2)
        old_vert_c = e2v2;

      const new_vert_a = oldvert_newvert.get(old_vert_a);
      const new_vert_b = oldvert_newvert.get(old_vert_b);
      const new_vert_c = oldvert_newvert.get(old_vert_c);
      if(new_vert_a != undefined && new_vert_b != undefined && new_vert_c != undefined && new_e1_vert != undefined
          && new_e2_vert != undefined && new_e3_vert != undefined) {
        // make new face 1 (using b, new vert on edge1, and new vert on edge3)
        if((old_vert_a == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_a == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_b == adj.faces[f][2])) 
          new_faces.push([`${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}`, `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`, `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`]);
        if((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2])) 
          new_faces.push([`${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}`, `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`, `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`]);
        // add to adjVert
        let temp_adjverts: string[] | undefined = new_vertexAdjMap.get(`${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`);
          temp_adjverts.push(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}`, 
                                [`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`, 
                                  `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`]);
        }

        temp_adjverts = new_vertexAdjMap.get(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`);
          temp_adjverts.push(`${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`, 
                                [`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`, 
                                  `${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}`]);
        }
        
        temp_adjverts = new_vertexAdjMap.get(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`);
          temp_adjverts.push(`${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`, 
                                [`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`, 
                                  `${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}`]);
        }

        let new_e3_1: string = `${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}=>${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`;
        let new_e1_1: string = `${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}=>${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`;
        let new_face_e1: string = `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}=>${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`;
        
        // add to new_edgeFaceMap
        let temp_edgefaces: number[] | undefined = new_edgeFaceMap.get(new_e3_1);
        if(temp_edgefaces == undefined) {
          new_e3_1 = `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}=>${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_e3_1);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_e3_1, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        temp_edgefaces = new_edgeFaceMap.get(new_e1_1);
        if(temp_edgefaces == undefined) {
          new_e1_1 = `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}=>${new_vert_b[0]},${new_vert_b[1]},${new_vert_b[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_e1_1);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_e1_1, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        temp_edgefaces = new_edgeFaceMap.get(new_face_e1);
        if(temp_edgefaces == undefined) {
          new_face_e1 = `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}=>${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_face_e1);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_face_e1, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        // add to new_faceEdgeMap
        let temp_faceedges: string[] | undefined = new_faceEdgeMap.get(curr_face_index);
        if(temp_faceedges != undefined) {
          temp_faceedges.push(new_e3_1);
          temp_faceedges.push(new_e1_1);
          temp_faceedges.push(new_face_e1);
        } else
          new_faceEdgeMap.set(curr_face_index, [new_e3_1, new_e1_1, new_face_e1]);

        // make new face 2 (using c, new vert on edge2, and new vert on edge3)
        curr_face_index++;
        if((old_vert_a == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_a == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_b == adj.faces[f][2])) 
          new_faces.push([`${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}`, `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`]);
        if((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2])) 
          new_faces.push([`${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}`, `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`, `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`]);
        // add to adjVert
        temp_adjverts = new_vertexAdjMap.get(`${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`);
          temp_adjverts.push(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}`, 
                                [`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, 
                                  `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`]);
        }

        temp_adjverts = new_vertexAdjMap.get(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`);
          temp_adjverts.push(`${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`, 
                                [`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, 
                                  `${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}`]);
        }
        
        temp_adjverts = new_vertexAdjMap.get(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`);
          temp_adjverts.push(`${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, 
                                [`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`, 
                                  `${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}`]);
        }

        let new_e3_2: string = `${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}=>${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`;
        let new_e2_1: string = `${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}=>${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`;
        let new_face_e2: string = `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}=>${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`;
        
        // add to new_edgeFaceMap
        temp_edgefaces = new_edgeFaceMap.get(new_e3_2);
        if(temp_edgefaces == undefined) {
          new_e3_2 = `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}=>${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_e3_2);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_e3_2, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        temp_edgefaces = new_edgeFaceMap.get(new_e2_1);
        if(temp_edgefaces == undefined) {
          new_e2_1 = `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}=>${new_vert_c[0]},${new_vert_c[1]},${new_vert_c[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_e2_1);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_e2_1, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
        if(temp_edgefaces == undefined) {
          new_face_e2 = `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}=>${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_face_e2, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        // add to new_faceEdgeMap
        temp_faceedges = new_faceEdgeMap.get(curr_face_index);
        if(temp_faceedges != undefined) {
          temp_faceedges.push(new_e3_2);
          temp_faceedges.push(new_e2_1);
          temp_faceedges.push(new_face_e2);
        } else
          new_faceEdgeMap.set(curr_face_index, [new_e3_2, new_e2_1, new_face_e2]);

        // make new face 3 (using a, new vert on edge2, and new vert on edge1)
        curr_face_index++;
        if((old_vert_a == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_a == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_b == adj.faces[f][2])) 
          new_faces.push([`${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}`, `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`, `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`]);
        if((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2])) 
          new_faces.push([`${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}`, `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`]);
        // add to adjVert
        temp_adjverts = new_vertexAdjMap.get(`${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`);
          temp_adjverts.push(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}`, 
                                [`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, 
                                  `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`]);
        }

        temp_adjverts = new_vertexAdjMap.get(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`);
          temp_adjverts.push(`${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`, 
                                [`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, 
                                  `${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}`]);
        }
        
        temp_adjverts = new_vertexAdjMap.get(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`);
          temp_adjverts.push(`${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, 
                                [`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`, 
                                  `${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}`]);
        }

        let new_e1_2: string = `${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}=>${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`;
        let new_e2_2: string = `${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}=>${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`;
        let new_face_e3: string = `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}=>${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`;
        
        // add to new_edgeFaceMap
        temp_edgefaces = new_edgeFaceMap.get(new_e1_2);
        if(temp_edgefaces == undefined) {
          new_e1_2 = `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}=>${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_e1_2);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_e1_2, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        temp_edgefaces = new_edgeFaceMap.get(new_e2_2);
        if(temp_edgefaces == undefined) {
          new_e2_2 = `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}=>${new_vert_a[0]},${new_vert_a[1]},${new_vert_a[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_e2_2);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_e2_2, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        temp_edgefaces = new_edgeFaceMap.get(new_face_e3);
        if(temp_edgefaces == undefined) {
          new_face_e3 = `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}=>${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_face_e3);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_face_e3, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        // add to new_faceEdgeMap
        temp_faceedges = new_faceEdgeMap.get(curr_face_index);
        if(temp_faceedges != undefined) {
          temp_faceedges.push(new_e1_2);
          temp_faceedges.push(new_e2_2);
          temp_faceedges.push(new_face_e3);
        } else
          new_faceEdgeMap.set(curr_face_index, [new_e1_2, new_e2_2, new_face_e3]);

        // make new face 4 (using new vert on edge1, new vert on edge2, and new vert on edge3)
        curr_face_index++;
        if((old_vert_a == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_a == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_b == adj.faces[f][2])) 
          new_faces.push([`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`, `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`, `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`]);
        if((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2])) 
          new_faces.push([`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`, `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`]);
        // add to adjVert
        temp_adjverts = new_vertexAdjMap.get(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`);
          temp_adjverts.push(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`, 
                                [`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, 
                                  `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`]);
        }

        temp_adjverts = new_vertexAdjMap.get(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`);
          temp_adjverts.push(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`, 
                                [`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, 
                                  `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`]);
        }
        
        temp_adjverts = new_vertexAdjMap.get(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`);
        if(temp_adjverts != undefined) {
          temp_adjverts.push(`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`);
          temp_adjverts.push(`${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`);
        } else {
          new_vertexAdjMap.set(`${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`, 
                                [`${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`, 
                                  `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`]);
        }
        
        // add to new_edgeFaceMap
        new_face_e1 = `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}=>${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`;
        new_face_e2 = `${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}=>${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`;
        new_face_e3 = `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}=>${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}`;
        temp_edgefaces = new_edgeFaceMap.get(new_face_e1);
        if(temp_edgefaces == undefined) {
          new_face_e1 = `${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}=>${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_face_e1);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_face_e1, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
        if(temp_edgefaces == undefined) {
          new_face_e2 = `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}=>${new_e3_vert[0]},${new_e3_vert[1]},${new_e3_vert[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_face_e2, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        temp_edgefaces = new_edgeFaceMap.get(new_face_e3);
        if(temp_edgefaces == undefined) {
          new_face_e3 = `${new_e2_vert[0]},${new_e2_vert[1]},${new_e2_vert[2]}=>${new_e1_vert[0]},${new_e1_vert[1]},${new_e1_vert[2]}`;
          temp_edgefaces = new_edgeFaceMap.get(new_face_e3);
          if(temp_edgefaces == undefined)
            new_edgeFaceMap.set(new_face_e3, [curr_face_index]);
          else
            temp_edgefaces.push(curr_face_index);
        } else
          temp_edgefaces.push(curr_face_index);

        // add to new_faceEdgeMap
        temp_faceedges = new_faceEdgeMap.get(curr_face_index);
        if(temp_faceedges != undefined) {
          temp_faceedges.push(new_face_e1);
          temp_faceedges.push(new_face_e2);
          temp_faceedges.push(new_face_e3);
        } else
          new_faceEdgeMap.set(curr_face_index, [new_face_e1, new_face_e2, new_face_e3]);
      } else
        console.log("huhbunchofstuff3");
    } else {
      console.log("huhedge");
    }
  }

  adj.faces = new_faces;
  adj.edgeFaceMap = new_edgeFaceMap;
  adj.faceEdgeMap = new_faceEdgeMap;
  adj.vertexAdjMap = new_vertexAdjMap;
  adj.verts = new_verts;
  // I DON'T THINK THERE ARE ANY DUPLICATES??? BUT MIGHT WANT TO CHECK AND SEE IF THERE IS DIFFERENCE AFTER CALLING REMOVEDUPLICATES METHOD

  remake_mesh_positions(adj, mesh);
}

// assuming each face already has vertices in counterclockwise order
function remake_mesh_positions(adj: adjacency_data, mesh: Mesh): void {
  let new_positions: number[] = [];
  for(let f = 0; f < adj.faces.length; f++) {
    const verts = adj.faces[f];
    const a = adj.verts.get(verts[0]);
    const b = adj.verts.get(verts[1]);
    const c = adj.verts.get(verts[2]);

    if(a != undefined && b != undefined && c != undefined) {
      new_positions.push(a[0]);
      new_positions.push(a[1]);
      new_positions.push(a[2]);

      new_positions.push(b[0]);
      new_positions.push(b[1]);
      new_positions.push(b[2]);

      new_positions.push(c[0]);
      new_positions.push(c[1]);
      new_positions.push(c[2]);
    } else
      console.log("huhfacesabc");
  }
  mesh.geometry.position.values = new Float32Array(new_positions);
}
/*     
    - NOTE:
      - THIS IS ALL ONE ITERATION, SO MAKE A FOR LOOP AROUND THIS THAT GOES UNTIL iterations NUMBER OF TIMES!!!!!!
      - AFTER THE LOOP, LOOP THROUGH EACH FACE, GET THE THREE VERTICES ON THAT FACE, CROSS PRODUCT (IN DC) AND ADD TO A NEW 
          ARRAY OF VERTICES IN COUNTERCLOCKWISE ORDER, AND SET MESH'S GEOMETRY POSTION TO THIS NEW ARRAY
  */

export function catmullClarkSubdivision(mesh: Mesh, iterations: number): void {
  /*
    PSEUDOCODE THIS NEXT
  */
}