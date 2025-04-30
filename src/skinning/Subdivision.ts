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

// for the sake of the demo and testing, we will say that the first edge in the edgeFaceMap is a sharp crease
export function loopSubdivision(mesh: Mesh, iterations: number): void {
  /* 
    - odd = new vertices; even = old vertices
    - n = # of neighboring vertices
    - n = 3, beta = 3/16; n > 3, beta = 3/8n
    - computing odd vertices: 
        - for each edge, check if # of faces for that edge == 2
        - if == 2 && not sharp crease, then interior vertex, otherwise boundary
        - if interior, new point on edge = 0.375 * (a+b) + 0.125 * (c+d) where 
            - a and b are endpoints of the edge, and c and d are opposing vertices of the two faces connected to the edge
        - else (is boundary or sharp edge)
            - new point on edge is midpoint 0.5 * (a+b)
        
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

export function catmullClarkSubdivision(mesh: Mesh, iterations: number): void {
  //
}