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
  public edgeFaceMap: Map<string, Set<number>>; // holds the faces adjacent to each edge
  public vertexAdjMap: Map<string, Set<string>>; // holds each vertex's neighboring vertices

  constructor(mesh: Mesh) {
    const positions = mesh.geometry.position.values;
    this.vertexAdjMap = new Map<string, Set<string>>();
    this.verts = new Map<string, Vec3>();
    this.edgeFaceMap = new Map<string, Set<number>>();
    this.faces = [];
    // for the sake of the demo and testing, we will say that the first edge in the edgeFaceMap is a sharp crease

    for(let i = 0; i < positions.length; i += 9) {
      const v1 = `${positions[i]},${positions[i+1]},${positions[i+2]}`;
      const v2 = `${positions[i+3]},${positions[i+4]},${positions[i+5]}`;
      const v3 = `${positions[i+6]},${positions[i+7]},${positions[i+8]}`;
      this.verts.set(v1, new Vec3([positions[i], positions[i+1], positions[i+2]]));
      this.verts.set(v2, new Vec3([positions[i+3], positions[i+4], positions[i+5]]));
      this.verts.set(v3, new Vec3([positions[i+6], positions[i+7], positions[i+8]]));
      
      // vertex adjacency
      let val: Set<string> | undefined = this.vertexAdjMap.get(v1);
      if(val != undefined) {
        val.add(v2);
        val.add(v3);
      } else {
        const set = new Set<string>();
        set.add(v2);
        set.add(v3);
        this.vertexAdjMap.set(v1, set);
      }
      val = this.vertexAdjMap.get(v2);
      if(val != undefined) {
        val.add(v1);
        val.add(v3);
      } else {
        const set = new Set<string>();
        set.add(v1);
        set.add(v3);
        this.vertexAdjMap.set(v2, set);
      }
      val = this.vertexAdjMap.get(v3);
      if(val != undefined) {
        val.add(v1);
        val.add(v2);
      } else {
        const set = new Set<string>();
        set.add(v1);
        set.add(v2);
        this.vertexAdjMap.set(v3, set);
      }
      
      this.faces.push([v1, v2, v3]);

      // make edges and set map for edge-face relations
      let edge1: string = v1 + '=>' + v2;
      let edge2: string = v1 + '=>' + v3;
      let edge3: string = v2 + '=>' + v3;
      let edgeVal: Set<number> | undefined = this.edgeFaceMap.get(edge1);
      if(edgeVal == undefined) {
        edge1 = v2 + '=>' + v1;
        edgeVal = this.edgeFaceMap.get(edge1);
        if(edgeVal == undefined) {
          const set = new Set<number>();
          set.add(this.faces.length - 1);
          this.edgeFaceMap.set(edge1, set);
        }
        else
          edgeVal.add(this.faces.length - 1);
      }
      else
        edgeVal.add(this.faces.length - 1);

      edgeVal = this.edgeFaceMap.get(edge2);
      if(edgeVal == undefined) {
        edge2 = v3 + '=>' + v1;
        edgeVal = this.edgeFaceMap.get(edge2);
        if(edgeVal == undefined) {
          const set = new Set<number>();
          set.add(this.faces.length - 1);
          this.edgeFaceMap.set(edge2, set);
        }
        else
          edgeVal.add(this.faces.length - 1);
      }
      else
        edgeVal.add(this.faces.length - 1);

      edgeVal = this.edgeFaceMap.get(edge3);
      if(edgeVal == undefined) {
        edge3 = v3 + '=>' + v2;
        edgeVal = this.edgeFaceMap.get(edge3);
        if(edgeVal == undefined) {
          const set = new Set<number>();
          set.add(this.faces.length - 1);
          this.edgeFaceMap.set(edge3, set);
        }
        else
          edgeVal.add(this.faces.length - 1);
      }
      else
        edgeVal.add(this.faces.length - 1);
    }
  }
}

export function loopSubdivision(mesh: Mesh, iterations: number): void {
  // Make vertex neighbor map and edge-newVertexIndex map
  //
}

export function catmullClarkSubdivision(mesh: Mesh, iterations: number): void {
  // TODO: Implement Catmull-Clark Subdivision algorithm

  //
}