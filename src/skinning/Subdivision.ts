import { Vec3 } from "../lib/TSM.js";
import { Mesh } from "./Scene.js";

export class loopsubdiv_adjacency_data {
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
      let face_index: number = this.faces.length - 1;
      if(i == 0)
        face_index = 0;

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

    removeDuplicatesFromMap(this.edgeFaceMap);
    removeDuplicatesFromMap(this.faceEdgeMap);
    removeDuplicatesFromMap(this.vertexAdjMap);
  }
}

export class catmullclark_adjacency_data {
  public faces: string[][]; // holds the indices of the 4 vertices for each face
  public verts: Map<string, Vec3>; // holds the vec3 vertex corresponding to a string of the xyz values
  public edgeFaceMap: Map<string, number[]>; // holds the edge as a key and the faces it is part of as the values in the Set
  public vertexFaceMap: Map<string, number[]>; // holds each vertex's adjacent faces
  public faceEdgeMap: Map<number, string[]>; // holds the face index as a key and the edges on that face as the values in the Set
  public vertexEdgeMap: Map<string, string[]>; // holds the vertex as a key and the values are the edges that vertex is on

  constructor(positions: number[]) {
    this.vertexFaceMap = new Map<string, number[]>();
    this.verts = new Map<string, Vec3>();
    this.edgeFaceMap = new Map<string, number[]>();
    this.faceEdgeMap = new Map<number, string[]>();
    this.vertexEdgeMap = new Map<string, string[]>();
    this.faces = [];

    for(let i = 0; i < positions.length; i += 12) {
      const v1 = `${positions[i]},${positions[i+1]},${positions[i+2]}`;
      const v2 = `${positions[i+3]},${positions[i+4]},${positions[i+5]}`;
      const v3 = `${positions[i+6]},${positions[i+7]},${positions[i+8]}`;
      const v4 = `${positions[i+9]},${positions[i+10]},${positions[i+11]}`;
      this.verts.set(v1, new Vec3([positions[i], positions[i+1], positions[i+2]]));
      this.verts.set(v2, new Vec3([positions[i+3], positions[i+4], positions[i+5]]));
      this.verts.set(v3, new Vec3([positions[i+6], positions[i+7], positions[i+8]]));
      this.verts.set(v4, new Vec3([positions[i+9], positions[i+10], positions[i+11]]));
      
      this.faces.push([v1, v2, v3, v4]);
      let face_index: number = this.faces.length - 1;
      if(i == 0)
        face_index = 0;

      // vertex adjacent faces
      let val: number[] | undefined = this.vertexFaceMap.get(v1);
      if(val != undefined)
        val.push(face_index);
      else
        this.vertexFaceMap.set(v1, [face_index]);

      val = this.vertexFaceMap.get(v2);
      if(val != undefined)
        val.push(face_index);
      else
        this.vertexFaceMap.set(v2, [face_index]);

      val = this.vertexFaceMap.get(v3);
      if(val != undefined)
        val.push(face_index);
      else
        this.vertexFaceMap.set(v3, [face_index]);

      val = this.vertexFaceMap.get(v4);
      if(val != undefined)
        val.push(face_index);
      else
        this.vertexFaceMap.set(v4, [face_index]);

      // make edges and set map for edge-face and vertex-edge relations
      let edge1: string = v1 + '=>' + v2;
      let edge2: string = v2 + '=>' + v3;
      let edge3: string = v3 + '=>' + v4;
      let edge4: string = v4 + '=>' + v1;

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
        edge2 = v3 + '=>' + v2;
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
        edge3 = v4 + '=>' + v3;
        edgeVal = this.edgeFaceMap.get(edge3);
        if(edgeVal == undefined)
          this.edgeFaceMap.set(edge3, [face_index]);
        else
          edgeVal.push(face_index);
      }
      else
        edgeVal.push(face_index);

      edgeVal = this.edgeFaceMap.get(edge4);
      if(edgeVal == undefined) {
        edge4 = v1 + '=>' + v4;
        edgeVal = this.edgeFaceMap.get(edge4);
        if(edgeVal == undefined)
          this.edgeFaceMap.set(edge4, [face_index]);
        else
          edgeVal.push(face_index);
      }
      else
        edgeVal.push(face_index);

      let edges: string[] | undefined = this.vertexEdgeMap.get(v1);
      if(edges == undefined)
        this.vertexEdgeMap.set(v1, [edge1, edge4]);
      else 
        edges.push(edge1, edge4);

      edges = this.vertexEdgeMap.get(v2);
      if(edges == undefined)
        this.vertexEdgeMap.set(v2, [edge1, edge2]);
      else
        edges.push(edge1, edge2);

      edges = this.vertexEdgeMap.get(v3);
      if(edges == undefined)
        this.vertexEdgeMap.set(v3, [edge2, edge3]);
      else
        edges.push(edge2, edge3);

      edges = this.vertexEdgeMap.get(v4);
      if(edges == undefined)
        this.vertexEdgeMap.set(v4, [edge3, edge4]);
      else
        edges.push(edge3, edge4);

      // make faceEdgeMap
      let face_edges: string[] | undefined = this.faceEdgeMap.get(face_index);
      if(face_edges != undefined) {
        face_edges.push(edge1);
        face_edges.push(edge2);
        face_edges.push(edge3);
        face_edges.push(edge4);
      } else
        this.faceEdgeMap.set(face_index, [edge1, edge2, edge3, edge4]);
    }

    removeDuplicatesFromMap(this.edgeFaceMap);
    removeDuplicatesFromMap(this.faceEdgeMap);
    removeDuplicatesFromMap(this.vertexEdgeMap);
    removeDuplicatesFromMap(this.vertexFaceMap);
  }
}

function removeDuplicatesFromMap(map): void {
  for (const [key, value] of map.entries()) {
    const unique = Array.from(new Set(value));
    map.set(key, unique);
  }
}

function loopSubdivision_newVerts(adj: loopsubdiv_adjacency_data, new_verts: Map<string, Vec3>, oldedge_vertMap: Map<string, string>,
                                    oldvert_newvert: Map<string, Vec3>): void {
  let beta: number = 3.0/16.0; // default assumes n = 3, n = # of neighboring vertices
  for (const [edge, faces] of adj.edgeFaceMap.entries()) {
    const [v1, v2] = edge.split('=>');
    const a = adj.verts.get(v1);
    const b = adj.verts.get(v2);
    if(faces.length == 2) { // interior edge (vertices on edge are also interior)
      // compute even (new) vertices
      if(a != undefined) {
        let new_vert_v1: Vec3 = new Vec3();
        const adj_verts_v1 = adj.vertexAdjMap.get(v1);
        if(adj_verts_v1 != undefined) {
          const n = adj_verts_v1.length;
          let sum: Vec3 = new Vec3();
          for(let i = 0; i < n; i++) {
            const [adj1, adj2, adj3] = adj_verts_v1[i].split(',').map(Number);
            sum.add(new Vec3([adj1, adj2, adj3]));
          }
          beta = (1.0/n) * (0.625 - Math.pow((0.375 + 0.25 * Math.cos((2*Math.PI)/n)), 2));
          // new value = original point * (1-n*beta) + (sum up all points of neighboring vertices) * beta
          sum.scale(beta);
          a.scale(1 - n*beta, new_vert_v1);
          new_vert_v1.add(sum);
          oldvert_newvert.set(v1, new_vert_v1);
          new_verts.set(`${new_vert_v1.x},${new_vert_v1.y},${new_vert_v1.z}`, new_vert_v1);
        }
      }
      
      if(b != undefined) {
        let new_vert_v2: Vec3 = new Vec3();
        const adj_verts_v2 = adj.vertexAdjMap.get(v2);
        if(adj_verts_v2 != undefined) {
          const n = adj_verts_v2.length;
          let sum: Vec3 = new Vec3();
          for(let i = 0; i < n; i++) {
            const [adj1, adj2, adj3] = adj_verts_v2[i].split(',').map(Number);
            sum.add(new Vec3([adj1, adj2, adj3]));
          }
          beta = (1.0/n) * (0.625 - Math.pow((0.375 + 0.25 * Math.cos((2*Math.PI)/n)), 2));
          sum.scale(beta);
          b.scale(1 - n*beta, new_vert_v2);
          new_vert_v2.add(sum);
          oldvert_newvert.set(v2, new_vert_v2);
          new_verts.set(`${new_vert_v2.x},${new_vert_v2.y},${new_vert_v2.z}`, new_vert_v2);
        }
      }

      // compute odd (old) vertices
      // get c
      const edges_on_face1 = adj.faceEdgeMap.get(faces[0]);
      let string_c: string = '';
      if(edges_on_face1 != undefined) {
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
      if(edges_on_face2 != undefined) {
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

        new_verts.set(`${new_vert.x},${new_vert.y},${new_vert.z}`, new_vert);
        oldedge_vertMap.set(edge, `${new_vert.x},${new_vert.y},${new_vert.z}`);
      }
    } else { // boundary or sharp edge
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
        new_verts.set(`${new_vert_v1.x},${new_vert_v1.y},${new_vert_v1.z}`, new_vert_v1);
        new_verts.set(`${new_vert_v2.x},${new_vert_v2.y},${new_vert_v2.z}`, new_vert_v2);

        // compute odd (new) vertices
        // 0.5 * (a+b)
        let new_vert: Vec3 = new Vec3();
        a.add(b, new_vert);
        new_vert.scale(0.5);

        new_verts.set(`${new_vert.x},${new_vert.y},${new_vert.z}`, new_vert);
        oldedge_vertMap.set(edge, `${new_vert.x},${new_vert.y},${new_vert.z}`);
      }
    }
  }
}

function loopsubdiv_add_adjacent_verts(new_vert1: Vec3, new_vert2: string, new_vert3: string, new_vertexAdjMap: Map<string, string[]>): void {
  let temp_adjverts: string[] | undefined = new_vertexAdjMap.get(`${new_vert1.x},${new_vert1.y},${new_vert1.z}`);
  if(temp_adjverts != undefined) {
    temp_adjverts.push(new_vert2);
    temp_adjverts.push(new_vert3);
  } else {
    new_vertexAdjMap.set(`${new_vert1.x},${new_vert1.y},${new_vert1.z}`, [new_vert2, new_vert3]);
  }

  temp_adjverts = new_vertexAdjMap.get(new_vert3);
  if(temp_adjverts != undefined) {
    temp_adjverts.push(new_vert2);
    temp_adjverts.push(`${new_vert1.x},${new_vert1.y},${new_vert1.z}`);
  } else {
    new_vertexAdjMap.set(new_vert3, [new_vert2, `${new_vert1.x},${new_vert1.y},${new_vert1.z}`]);
  }
  
  temp_adjverts = new_vertexAdjMap.get(new_vert2);
  if(temp_adjverts != undefined) {
    temp_adjverts.push(new_vert3);
    temp_adjverts.push(`${new_vert1.x},${new_vert1.y},${new_vert1.z}`);
  } else {
    new_vertexAdjMap.set(new_vert2, [new_vert3, `${new_vert1.x},${new_vert1.y},${new_vert1.z}`]);
  }
}

function loopsubdiv_get_newEdgeVerts_oldVerts(edges: string[], oldedge_vertMap: Map<string, string>): [string|undefined, string|undefined, string|undefined, string, string, string] {
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

  return [new_e1_vert, new_e2_vert, new_e3_vert, old_vert_a, old_vert_b, old_vert_c];
}

export function loopSubdivision(mesh: Mesh, iterations: number, adj: loopsubdiv_adjacency_data): void {
  for(let iter = 0; iter < iterations; iter++)
  {
    let new_verts: Map<string, Vec3> = new Map<string, Vec3>(); 
    let oldedge_vertMap: Map<string, string> = new Map<string, string>();
    let oldvert_newvert: Map<string, Vec3> = new Map<string, Vec3>();
    let new_faces: string[][] = []; 
    let new_edgeFaceMap: Map<string, number[]> = new Map<string, number[]>(); 
    let new_vertexAdjMap: Map<string, string[]> = new Map<string, string[]>();
    let new_faceEdgeMap: Map<number, string[]> = new Map<number, string[]>();
    
    loopSubdivision_newVerts(adj, new_verts, oldedge_vertMap, oldvert_newvert);

    let curr_face_index: number = 0;
    for(let f = 0; f < adj.faces.length; f++) {
      const edges = adj.faceEdgeMap.get(f);
      if(edges != undefined) {
        const [new_e1_vert, new_e2_vert, new_e3_vert, 
                old_vert_a, old_vert_b, old_vert_c] = loopsubdiv_get_newEdgeVerts_oldVerts(edges, oldedge_vertMap);

        const new_vert_a = oldvert_newvert.get(old_vert_a);
        const new_vert_b = oldvert_newvert.get(old_vert_b);
        const new_vert_c = oldvert_newvert.get(old_vert_c);
        if(new_vert_a != undefined && new_vert_b != undefined && new_vert_c != undefined && new_e1_vert != undefined
            && new_e2_vert != undefined && new_e3_vert != undefined) {
          // make new face 1 (using b, new vert on edge1, and new vert on edge3)
          if((old_vert_a == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_a == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_b == adj.faces[f][2])) 
            new_faces.push([`${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}`, new_e3_vert, new_e1_vert]);
          if((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2])) 
            new_faces.push([`${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}`, new_e1_vert, new_e3_vert]);
          
          // add to adjVert
          loopsubdiv_add_adjacent_verts(new_vert_b, new_e1_vert, new_e3_vert, new_vertexAdjMap);

          let new_e3_1: string = `${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}=>${new_e3_vert}`;
          let new_e1_1: string = `${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}=>${new_e1_vert}`;
          let new_face_e1: string = `${new_e3_vert}=>${new_e1_vert}`;
          
          // add to new_edgeFaceMap
          let temp_edgefaces: number[] | undefined = new_edgeFaceMap.get(new_e3_1);
          if(temp_edgefaces == undefined) {
            new_e3_1 = `${new_e3_vert}=>${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}`;
            temp_edgefaces = new_edgeFaceMap.get(new_e3_1);
            if(temp_edgefaces == undefined)
              new_edgeFaceMap.set(new_e3_1, [curr_face_index]);
            else
              temp_edgefaces.push(curr_face_index);
          } else
            temp_edgefaces.push(curr_face_index);

          temp_edgefaces = new_edgeFaceMap.get(new_e1_1);
          if(temp_edgefaces == undefined) {
            new_e1_1 = `${new_e1_vert}=>${new_vert_b.x},${new_vert_b.y},${new_vert_b.z}`;
            temp_edgefaces = new_edgeFaceMap.get(new_e1_1);
            if(temp_edgefaces == undefined)
              new_edgeFaceMap.set(new_e1_1, [curr_face_index]);
            else
              temp_edgefaces.push(curr_face_index);
          } else
            temp_edgefaces.push(curr_face_index);

          temp_edgefaces = new_edgeFaceMap.get(new_face_e1);
          if(temp_edgefaces == undefined) {
            new_face_e1 = `${new_e1_vert}=>${new_e3_vert}`;
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
            new_faces.push([`${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}`, new_e2_vert, new_e3_vert]);
          if((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2])) 
            new_faces.push([`${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}`, new_e3_vert, new_e2_vert]);
          
          // add to adjVert
          loopsubdiv_add_adjacent_verts(new_vert_c, new_e2_vert, new_e3_vert, new_vertexAdjMap);

          let new_e3_2: string = `${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}=>${new_e3_vert}`;
          let new_e2_1: string = `${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}=>${new_e2_vert}`;
          let new_face_e2: string = `${new_e3_vert}=>${new_e2_vert}`;
          
          // add to new_edgeFaceMap
          temp_edgefaces = new_edgeFaceMap.get(new_e3_2);
          if(temp_edgefaces == undefined) {
            new_e3_2 = `${new_e3_vert}=>${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}`;
            temp_edgefaces = new_edgeFaceMap.get(new_e3_2);
            if(temp_edgefaces == undefined)
              new_edgeFaceMap.set(new_e3_2, [curr_face_index]);
            else
              temp_edgefaces.push(curr_face_index);
          } else
            temp_edgefaces.push(curr_face_index);

          temp_edgefaces = new_edgeFaceMap.get(new_e2_1);
          if(temp_edgefaces == undefined) {
            new_e2_1 = `${new_e2_vert}=>${new_vert_c.x},${new_vert_c.y},${new_vert_c.z}`;
            temp_edgefaces = new_edgeFaceMap.get(new_e2_1);
            if(temp_edgefaces == undefined)
              new_edgeFaceMap.set(new_e2_1, [curr_face_index]);
            else
              temp_edgefaces.push(curr_face_index);
          } else
            temp_edgefaces.push(curr_face_index);

          temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
          if(temp_edgefaces == undefined) {
            new_face_e2 = `${new_e2_vert}=>${new_e3_vert}`;
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
            new_faces.push([`${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}`, new_e1_vert, new_e2_vert]);
          if((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2])) 
            new_faces.push([`${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}`, new_e2_vert, new_e1_vert]);
          
          // add to adjVert
          loopsubdiv_add_adjacent_verts(new_vert_a, new_e2_vert, new_e1_vert, new_vertexAdjMap);

          let new_e1_2: string = `${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}=>${new_e1_vert}`;
          let new_e2_2: string = `${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}=>${new_e2_vert}`;
          let new_face_e3: string = `${new_e1_vert}=>${new_e2_vert}`;
          
          // add to new_edgeFaceMap
          temp_edgefaces = new_edgeFaceMap.get(new_e1_2);
          if(temp_edgefaces == undefined) {
            new_e1_2 = `${new_e1_vert}=>${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}`;
            temp_edgefaces = new_edgeFaceMap.get(new_e1_2);
            if(temp_edgefaces == undefined)
              new_edgeFaceMap.set(new_e1_2, [curr_face_index]);
            else
              temp_edgefaces.push(curr_face_index);
          } else
            temp_edgefaces.push(curr_face_index);

          temp_edgefaces = new_edgeFaceMap.get(new_e2_2);
          if(temp_edgefaces == undefined) {
            new_e2_2 = `${new_e2_vert}=>${new_vert_a.x},${new_vert_a.y},${new_vert_a.z}`;
            temp_edgefaces = new_edgeFaceMap.get(new_e2_2);
            if(temp_edgefaces == undefined)
              new_edgeFaceMap.set(new_e2_2, [curr_face_index]);
            else
              temp_edgefaces.push(curr_face_index);
          } else
            temp_edgefaces.push(curr_face_index);

          temp_edgefaces = new_edgeFaceMap.get(new_face_e3);
          if(temp_edgefaces == undefined) {
            new_face_e3 = `${new_e2_vert}=>${new_e1_vert}`;
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
            new_faces.push([new_e1_vert, new_e3_vert, new_e2_vert]);
          if((old_vert_a == adj.faces[f][0] && old_vert_c == adj.faces[f][1] && old_vert_b == adj.faces[f][2]) || (old_vert_b == adj.faces[f][0] && old_vert_a == adj.faces[f][1] && old_vert_c == adj.faces[f][2]) || (old_vert_c == adj.faces[f][0] && old_vert_b == adj.faces[f][1] && old_vert_a == adj.faces[f][2])) 
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
          if(temp_edgefaces == undefined) {
            new_face_e1 = `${new_e1_vert}=>${new_e3_vert}`;
            temp_edgefaces = new_edgeFaceMap.get(new_face_e1);
            if(temp_edgefaces == undefined)
              new_edgeFaceMap.set(new_face_e1, [curr_face_index]);
            else
              temp_edgefaces.push(curr_face_index);
          } else
            temp_edgefaces.push(curr_face_index);

          temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
          if(temp_edgefaces == undefined) {
            new_face_e2 = `${new_e2_vert}=>${new_e3_vert}`;
            temp_edgefaces = new_edgeFaceMap.get(new_face_e2);
            if(temp_edgefaces == undefined)
              new_edgeFaceMap.set(new_face_e2, [curr_face_index]);
            else
              temp_edgefaces.push(curr_face_index);
          } else
            temp_edgefaces.push(curr_face_index);

          temp_edgefaces = new_edgeFaceMap.get(new_face_e3);
          if(temp_edgefaces == undefined) {
            new_face_e3 = `${new_e2_vert}=>${new_e1_vert}`;
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

function loopsubdiv_remake_mesh_positions(adj: loopsubdiv_adjacency_data, mesh: Mesh): void {
  let new_positions: number[] = [];
  let new_normals: number[] = [];
  for(let f = 0; f < adj.faces.length; f++) {
    const a = adj.verts.get(adj.faces[f][0]);
    const b = adj.verts.get(adj.faces[f][1]);
    const c = adj.verts.get(adj.faces[f][2]);

    if(a != undefined && b != undefined && c != undefined) {
      new_positions.push(a.x);
      new_positions.push(a.y);
      new_positions.push(a.z);

      new_positions.push(b.x);
      new_positions.push(b.y);
      new_positions.push(b.z);

      new_positions.push(c.x);
      new_positions.push(c.y);
      new_positions.push(c.z);

      let vec_ab: Vec3 = new Vec3();
      b.subtract(a, vec_ab);
      let vec_ac: Vec3 = new Vec3();
      c.subtract(a, vec_ac);

      let normal: Vec3 = new Vec3();
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

function catmullclark_compute_facepoints(face_points: Vec3[], faces: string[][], verts: Map<string, Vec3>, 
                                          new_verts: Map<string, Vec3>): void {
  for(let f = 0; f < faces.length; f++) {
    let sum: Vec3 = new Vec3();
    const face_verts = faces[f];
    const v1 = verts.get(face_verts[0]);
    const v2 = verts.get(face_verts[1]);
    const v3 = verts.get(face_verts[2]);
    const v4 = verts.get(face_verts[3]);

    if(v1 != undefined && v2 != undefined && v3 != undefined && v4 != undefined) {
      v1.add(v2, sum);
      sum.add(v3);
      sum.add(v4);
      sum.scale(0.25);
      face_points[f] = sum;
      new_verts.set(`${sum.x},${sum.y},${sum.z}`, sum);
    }
  }
}

function catmullclark_compute_edgepoints(edgeFaceMap: Map<string, number[]>, face_points: Vec3[], 
                                          verts: Map<string, Vec3>, oldedge_edgepoint: Map<string, Vec3>, 
                                          new_verts: Map<string, Vec3>): void {
  edgeFaceMap.forEach((faces: number[], edge: string) => {
    const temp = edge.split('=>');
    const v1_str = temp[0];
    const v2_str = temp[1];
    const v1 = verts.get(v1_str);
    const v2 = verts.get(v2_str);
    let new_edgepoint: Vec3 = new Vec3();

    if(v1 != undefined && v2 != undefined) {
      if(faces.length == 2) { // interior edge
        const facepoint1 = face_points[faces[0]];
        const facepoint2 = face_points[faces[1]];
        v1.add(v2, new_edgepoint);
        new_edgepoint.add(facepoint1);
        new_edgepoint.add(facepoint2);
        new_edgepoint.scale(0.25);
      } else { // boundary edge
        const facepoint = face_points[faces[0]];
        v1.add(v2, new_edgepoint);
        new_edgepoint.add(facepoint);
        new_edgepoint.scale(1.0/3.0);
      }

      oldedge_edgepoint.set(edge, new_edgepoint);
      new_verts.set(`${new_edgepoint.x},${new_edgepoint.y},${new_edgepoint.z}`, new_edgepoint);
    }
  });
}

function catmullclark_compute_new_verts(verts: Map<string, Vec3>, vertexFaceMap: Map<string, number[]>, face_points: Vec3[], 
                                          oldedge_edgepoint: Map<string, Vec3>, vertexEdgeMap: Map<string, string[]>,
                                          oldvert_newvert: Map<string, Vec3>, new_verts: Map<string, Vec3>): void {
  verts.forEach((vec: Vec3, str: string) => {
    // average all face points on adjacent faces
    const adj_faces = vertexFaceMap.get(str);
    let F: Vec3 = new Vec3();
    let n: number = 0;
    if(adj_faces != undefined) {
      n = adj_faces.length;
      for(let f = 0; f < n; f++) {
        F.add(face_points[adj_faces[f]]);
      }
      F.scale(1.0/n);
    }
    
    // average of edgepoints of all edges this vertex is on
    const edges = vertexEdgeMap.get(str);
    let R: Vec3 = new Vec3();
    if(edges != undefined) {
      for(let e = 0; e < edges.length; e++) {
        const curr_edge = oldedge_edgepoint.get(edges[e]);
        if(curr_edge != undefined)
          R.add(curr_edge);
      }
      R.scale(1.0/edges.length);
    }
    
    let new_vert: Vec3 = new Vec3();
    vec.scale(n - 3, new_vert);
    R.scale(2);
    new_vert.add(R);
    new_vert.add(F);
    new_vert.scale(1.0/n);
    oldvert_newvert.set(str, new_vert);
    new_verts.set(`${new_vert.x},${new_vert.y},${new_vert.z}`, new_vert);
  });
}

function catmullclark_make_newface(v1: string, v2: string, v3: string, v4: string, curr_face_index,
                                      new_edgeFaceMap: Map<string, number[]>, new_vertexFaceMap: Map<string, number[]>,
                                      new_faceEdgeMap: Map <number, string[]>, new_vertexEdgeMap: Map<string, string[]>): void {
  let edge_v1v2: string = v1 + '=>' + v2;
  let edge_v2v3: string = v2 + '=>' + v3;
  let edge_v3v4: string = v3 + '=>' + v4;
  let edge_v4v1: string = v4 + '=>' + v1;

  // add to new_edgeFaceMap
  let tempedgeface: number[] | undefined = new_edgeFaceMap.get(edge_v1v2);
  if(tempedgeface == undefined) {
    edge_v1v2 = v2 + '=>' + v1;
    tempedgeface = new_edgeFaceMap.get(edge_v1v2);
    if(tempedgeface == undefined)
      new_edgeFaceMap.set(edge_v1v2, [curr_face_index]);
    else
      tempedgeface.push(curr_face_index);
  }
  else
    tempedgeface.push(curr_face_index);

  tempedgeface = new_edgeFaceMap.get(edge_v2v3);
  if(tempedgeface == undefined) {
    edge_v2v3 = v3 + '=>' + v2;
    tempedgeface = new_edgeFaceMap.get(edge_v2v3);
    if(tempedgeface == undefined)
      new_edgeFaceMap.set(edge_v2v3, [curr_face_index]);
    else
      tempedgeface.push(curr_face_index);
  }
  else
    tempedgeface.push(curr_face_index);

  tempedgeface = new_edgeFaceMap.get(edge_v3v4);
  if(tempedgeface == undefined) {
    edge_v3v4 = v4 + '=>' + v3;
    tempedgeface = new_edgeFaceMap.get(edge_v3v4);
    if(tempedgeface == undefined)
      new_edgeFaceMap.set(edge_v3v4, [curr_face_index]);
    else
      tempedgeface.push(curr_face_index);
  }
  else
    tempedgeface.push(curr_face_index);

  tempedgeface = new_edgeFaceMap.get(edge_v4v1);
  if(tempedgeface == undefined) {
    edge_v4v1 = v1 + '=>' + v4;
    tempedgeface = new_edgeFaceMap.get(edge_v4v1);
    if(tempedgeface == undefined)
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

function catmullclark_add_vertexFaceMap(new_vertexFaceMap: Map<string, number[]>, curr_face_index: number, v1: string,
                                          v2: string, v3: string, v4: string): void {
  let tempvertexface: number[] | undefined = new_vertexFaceMap.get(v1);
  if(tempvertexface == undefined) 
    new_vertexFaceMap.set(v1, [curr_face_index]);
  else
    tempvertexface.push(curr_face_index);

  tempvertexface = new_vertexFaceMap.get(v2);
  if(tempvertexface == undefined) 
    new_vertexFaceMap.set(v2, [curr_face_index]);
  else
    tempvertexface.push(curr_face_index);

  tempvertexface = new_vertexFaceMap.get(v3);
  if(tempvertexface == undefined) 
    new_vertexFaceMap.set(v3, [curr_face_index]);
  else
    tempvertexface?.push(curr_face_index);

  tempvertexface = new_vertexFaceMap.get(v4);
  if(tempvertexface == undefined) 
    new_vertexFaceMap.set(v4, [curr_face_index]);
  else
    tempvertexface?.push(curr_face_index);
}

function catmullclark_add_vertexEdgeMap(v1: string, v2: string, v3: string, v4: string, ev1v2: string, ev2v3: string,
                                          ev3v4: string, ev4v1: string, new_vertexEdgeMap: Map<string, string[]>): void {
  let tempedges: string[] | undefined = new_vertexEdgeMap.get(v1);
  if(tempedges == undefined)
    new_vertexEdgeMap.set(v1, [ev1v2, ev4v1]);
  else
    tempedges.push(ev1v2, ev4v1);

  tempedges = new_vertexEdgeMap.get(v2);
  if(tempedges == undefined)
    new_vertexEdgeMap.set(v2, [ev1v2, ev2v3]);
  else
    tempedges.push(ev1v2, ev2v3);

  tempedges = new_vertexEdgeMap.get(v3);
  if(tempedges == undefined)
    new_vertexEdgeMap.set(v3, [ev2v3, ev3v4]);
  else
    tempedges.push(ev2v3, ev3v4);

  tempedges = new_vertexEdgeMap.get(v4)
  if(tempedges == undefined)
    new_vertexEdgeMap.set(v4, [ev3v4, ev4v1]);
  else
    tempedges.push(ev3v4, ev4v1);
}

export function catmullClarkSubdivision(mesh: Mesh, iterations: number, adj: catmullclark_adjacency_data): void {
  for(let iter = 0; iter < iterations; iter++) {
    let new_faces: string[][] = [];
    let new_verts: Map<string, Vec3> = new Map<string, Vec3>();
    let new_edgeFaceMap: Map<string, number[]> = new Map<string, number[]>();
    let new_vertexFaceMap: Map<string, number[]> = new Map<string, number[]>();
    let new_faceEdgeMap: Map<number, string[]> = new Map<number, string[]>();
    let new_vertexEdgeMap: Map<string, string[]> = new Map<string, string[]>();

    let face_points: Vec3[] = [];
    catmullclark_compute_facepoints(face_points, adj.faces, adj.verts, new_verts);

    let oldedge_edgepoint: Map<string, Vec3> = new Map<string, Vec3>();
    catmullclark_compute_edgepoints(adj.edgeFaceMap, face_points, adj.verts, oldedge_edgepoint, new_verts);

    let oldvert_newvert: Map<string, Vec3> = new Map<string, Vec3>();
    catmullclark_compute_new_verts(adj.verts, adj.vertexFaceMap, face_points, oldedge_edgepoint, adj.vertexEdgeMap,
                                    oldvert_newvert, new_verts);

    let curr_face_index: number = 0;
    for(let f = 0; f < adj.faces.length; f++) {
      const curr_facepoint = face_points[f];
      const v1_str = adj.faces[f][0];
      const v2_str = adj.faces[f][1];
      const v3_str = adj.faces[f][2];
      const v4_str = adj.faces[f][3];
      const edges = adj.faceEdgeMap.get(f);
      let e12: string = '';
      let e23: string = '';
      let e34: string = '';
      let e41: string = '';
      if(edges != undefined) {
        // find which edge is edge between v1 and v2
        if(edges[0] == v1_str + '=>' + v2_str || edges[0] == v2_str + '=>' + v1_str)
          e12 = edges[0];
        else if(edges[1] == v1_str + '=>' + v2_str || edges[1] == v2_str + '=>' + v1_str)
          e12 = edges[1];
        else if(edges[2] == v1_str + '=>' + v2_str || edges[2] == v2_str + '=>' + v1_str)
          e12 = edges[2];
        else if(edges[3] == v1_str + '=>' + v2_str || edges[3] == v2_str + '=>' + v1_str)
          e12 = edges[3];

        // find which edge is edge between v2 and v3
        if(edges[0] == v2_str + '=>' + v3_str || edges[0] == v3_str + '=>' + v2_str)
          e23 = edges[0];
        else if(edges[1] == v2_str + '=>' + v3_str || edges[1] == v3_str + '=>' + v2_str)
          e23 = edges[1];
        else if(edges[2] == v2_str + '=>' + v3_str || edges[2] == v3_str + '=>' + v2_str)
          e23 = edges[2];
        else if(edges[3] == v2_str + '=>' + v3_str || edges[3] == v3_str + '=>' + v2_str)
          e23 = edges[3];

        // find which edge is edge between v3 and v4
        if(edges[0] == v3_str + '=>' + v4_str || edges[0] == v4_str + '=>' + v3_str)
          e34 = edges[0];
        else if(edges[1] == v3_str + '=>' + v4_str || edges[1] == v4_str + '=>' + v3_str)
          e34 = edges[1];
        else if(edges[2] == v3_str + '=>' + v4_str || edges[2] == v4_str + '=>' + v3_str)
          e34 = edges[2];
        else if(edges[3] == v3_str + '=>' + v4_str || edges[3] == v4_str + '=>' + v3_str)
          e34 = edges[3];

        // find which edge is edge between v1 and v2
        if(edges[0] == v1_str + '=>' + v4_str || edges[0] == v4_str + '=>' + v1_str)
          e41 = edges[0];
        else if(edges[1] == v1_str + '=>' + v4_str || edges[1] == v4_str + '=>' + v1_str)
          e41 = edges[1];
        else if(edges[2] == v1_str + '=>' + v4_str || edges[2] == v4_str + '=>' + v1_str)
          e41 = edges[2];
        else if(edges[3] == v1_str + '=>' + v4_str || edges[3] == v4_str + '=>' + v1_str)
          e41 = edges[3];
      }

      // make new face 1 (using v1, e12, curr_facepoint, and e41)
      const curr_facepoint_str = `${curr_facepoint.x},${curr_facepoint.y},${curr_facepoint.z}`;
      const edgepoint12 = oldedge_edgepoint.get(e12);
      const edgepoint23 = oldedge_edgepoint.get(e23);
      const edgepoint34 = oldedge_edgepoint.get(e34);
      const edgepoint41 = oldedge_edgepoint.get(e41);
      const new_v1 = oldvert_newvert.get(v1_str);
      const new_v2 = oldvert_newvert.get(v2_str);
      const new_v3 = oldvert_newvert.get(v3_str);
      const new_v4 = oldvert_newvert.get(v4_str);
      
      if(edgepoint12 != undefined && edgepoint23 != undefined && edgepoint34 != undefined && edgepoint41 != undefined &&
          new_v1 != undefined && new_v2 != undefined && new_v3 != undefined && new_v4 != undefined) {
        const edgepoint12_str = `${edgepoint12.x},${edgepoint12.y},${edgepoint12.z}`;
        const edgepoint23_str = `${edgepoint23.x},${edgepoint23.y},${edgepoint23.z}`;
        const edgepoint34_str = `${edgepoint34.x},${edgepoint34.y},${edgepoint34.z}`;
        const edgepoint41_str = `${edgepoint41.x},${edgepoint41.y},${edgepoint41.z}`;
        const new_v1_str = `${new_v1.x},${new_v1.y},${new_v1.z}`;
        const new_v2_str = `${new_v2.x},${new_v2.y},${new_v2.z}`;
        const new_v3_str = `${new_v3.x},${new_v3.y},${new_v3.z}`;
        const new_v4_str = `${new_v4.x},${new_v4.y},${new_v4.z}`;
        
        // make new face 1 (using new_v1, e12, curr_facepoint, e41)
        new_faces.push([new_v1_str, edgepoint12_str, curr_facepoint_str, edgepoint41_str]);
        catmullclark_make_newface(new_v1_str, edgepoint12_str, curr_facepoint_str, edgepoint41_str, curr_face_index, 
                                    new_edgeFaceMap, new_vertexFaceMap, new_faceEdgeMap, new_vertexEdgeMap);
        curr_face_index++;

        // make new face 2 (using e12, curr_facepoint, e23, and new_v2)
        new_faces.push([edgepoint12_str, new_v2_str, edgepoint23_str, curr_facepoint_str]);
        catmullclark_make_newface(edgepoint12_str, new_v2_str, edgepoint23_str, curr_facepoint_str, curr_face_index, 
                                    new_edgeFaceMap, new_vertexFaceMap, new_faceEdgeMap, new_vertexEdgeMap);
        curr_face_index++;

        // make new face 3 (using e41, new_v4, e34, and curr_facepoint)
        new_faces.push([edgepoint41_str, curr_facepoint_str, edgepoint34_str, new_v4_str]);
        catmullclark_make_newface(edgepoint41_str, curr_facepoint_str, edgepoint34_str, new_v4_str, curr_face_index, 
                                    new_edgeFaceMap, new_vertexFaceMap, new_faceEdgeMap, new_vertexEdgeMap);
        curr_face_index++;

        // make new face 4 (using curr_facepoint, e34, new_v3, and e23)
        new_faces.push([curr_facepoint_str, edgepoint23_str, new_v3_str, edgepoint34_str]);
        catmullclark_make_newface(curr_facepoint_str, edgepoint23_str, new_v3_str, edgepoint34_str, curr_face_index, 
                                    new_edgeFaceMap, new_vertexFaceMap, new_faceEdgeMap, new_vertexEdgeMap);
        curr_face_index++;
      }
    }
    adj.edgeFaceMap = new_edgeFaceMap;
    adj.faceEdgeMap = new_faceEdgeMap;
    adj.faces = new_faces;
    adj.vertexEdgeMap = new_vertexEdgeMap;
    adj.vertexFaceMap = new_vertexFaceMap;
    adj.verts = new_verts;
    removeDuplicatesFromMap(adj.edgeFaceMap);
    removeDuplicatesFromMap(adj.faceEdgeMap);
    removeDuplicatesFromMap(adj.vertexEdgeMap);
    removeDuplicatesFromMap(adj.vertexFaceMap);
  }

  catmullclark_remake_mesh_positions(adj, mesh);
}

function catmullclark_remake_mesh_positions(adj: catmullclark_adjacency_data, mesh: Mesh): void {
  let new_positions: number[] = [];
  let new_normals: number[] = [];
  for(let f = 0; f < adj.faces.length; f++) {
    const a = adj.verts.get(adj.faces[f][0]);
    const b = adj.verts.get(adj.faces[f][1]);
    const c = adj.verts.get(adj.faces[f][2]);
    const d = adj.verts.get(adj.faces[f][3]);

    if(a != undefined && b != undefined && c != undefined && d != undefined) {
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

      let vec_ab: Vec3 = new Vec3();
      b.subtract(a, vec_ab);
      let vec_ac: Vec3 = new Vec3();
      c.subtract(a, vec_ac);

      let normal: Vec3 = new Vec3();
      Vec3.cross(vec_ab, vec_ac, normal);
      normal.normalize();
      for (let i = 0; i < 6; i++) {
        new_normals.push(normal.x, normal.y, normal.z);
      }
    }
  }
  mesh.geometry.position.values = new Float32Array(new_positions);
  mesh.geometry.position.count = new_positions.length / 3;

  mesh.geometry.normal.values = new Float32Array(new_normals);
  mesh.geometry.normal.count = new_normals.length / 3;
}