export const floorVSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;
    
    attribute vec4 aVertPos;

    varying vec4 vClipPos;

    void main () {

        gl_Position = uProj * uView * uWorld * aVertPos;
        vClipPos = gl_Position;
    }
`;
export const floorFSText = `
    precision mediump float;

    uniform mat4 uViewInv;
    uniform mat4 uProjInv;
    uniform vec4 uLightPos;

    varying vec4 vClipPos;

    void main() {
        vec4 wsPos = uViewInv * uProjInv * vec4(vClipPos.xyz/vClipPos.w, 1.0);
        wsPos /= wsPos.w;
        /* Determine which color square the position is in */
        float checkerWidth = 5.0;
        float i = floor(wsPos.x / checkerWidth);
        float j = floor(wsPos.z / checkerWidth);
        vec3 color = mod(i + j, 2.0) * vec3(1.0, 1.0, 1.0);

        /* Compute light fall off */
        vec4 lightDirection = uLightPos - wsPos;
        float dot_nl = dot(normalize(lightDirection), vec4(0.0, 1.0, 0.0, 0.0));
	    dot_nl = clamp(dot_nl, 0.0, 1.0);
	
        gl_FragColor = vec4(clamp(dot_nl * color, 0.0, 1.0), 1.0);
    }
`;
export const sceneVSText = `
    precision mediump float;
	
    attribute vec2 aUV;
    attribute vec3 aNorm;
    attribute vec4 skinIndices;
    attribute vec4 skinWeights;
	
	//vertices used for bone weights (assumes up to four weights per vertex)
    attribute vec4 v0;
    attribute vec4 v1;
    attribute vec4 v2;
    attribute vec4 v3;
    
    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;
 
    uniform vec4 lightPosition;
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

	//Joint translations and rotations to determine weights (assumes up to 64 joints per rig)
    uniform vec3 jTrans[64];
    uniform vec4 jRots[64];

    void main () {
        int index0 = int(skinIndices[0]);
        int index1 = int(skinIndices[1]);
        int index2 = int(skinIndices[2]);
        int index3 = int(skinIndices[3]);
        vec3 vertex0 = vec3(v0[0], v0[1], v0[2]);
        vec3 vertex1 = vec3(v1[0], v1[1], v1[2]);
        vec3 vertex2 = vec3(v2[0], v2[1], v2[2]);
        vec3 vertex3 = vec3(v3[0], v3[1], v3[2]);
        vec3 quat0 = vertex0 + 2.0 * cross(cross(vertex0, jRots[index0].xyz) - jRots[index0].w*vertex0, jRots[index0].xyz);
        vec3 quat1 = vertex1 + 2.0 * cross(cross(vertex1, jRots[index1].xyz) - jRots[index1].w*vertex1, jRots[index1].xyz);
        vec3 quat2 = vertex2 + 2.0 * cross(cross(vertex2, jRots[index2].xyz) - jRots[index2].w*vertex2, jRots[index2].xyz);
        vec3 quat3 = vertex3 + 2.0 * cross(cross(vertex3, jRots[index3].xyz) - jRots[index3].w*vertex3, jRots[index3].xyz);
        vec3 trans = (skinWeights[0] * vec3(jTrans[index0] + quat0)) +
            (skinWeights[1] * vec3(jTrans[index1] + quat1)) +
            (skinWeights[2] * vec3(jTrans[index2] + quat2)) +
            (skinWeights[3] * vec3(jTrans[index3] + quat3));

        vec4 worldPosition = mWorld * vec4(trans, 1.0);
        gl_Position = mProj * mView * worldPosition;
        
        //  Compute light direction and transform to camera coordinates
        lightDir = lightPosition - worldPosition;

        vec3 norm_quat0 = aNorm + 2.0 * cross(cross(aNorm, jRots[index0].xyz) - jRots[index0].w*aNorm, jRots[index0].xyz);
        vec3 norm_quat1 = aNorm + 2.0 * cross(cross(aNorm, jRots[index1].xyz) - jRots[index1].w*aNorm, jRots[index1].xyz);
        vec3 norm_quat2 = aNorm + 2.0 * cross(cross(aNorm, jRots[index2].xyz) - jRots[index2].w*aNorm, jRots[index2].xyz);
        vec3 norm_quat3 = aNorm + 2.0 * cross(cross(aNorm, jRots[index3].xyz) - jRots[index3].w*aNorm, jRots[index3].xyz);

        vec3 skinned_normal = normalize(
            skinWeights[0] * norm_quat0 +
            skinWeights[1] * norm_quat1 +
            skinWeights[2] * norm_quat2 +
            skinWeights[3] * norm_quat3
        );

                
        // vec3 transNorm = (skinWeights[0] * quat0) +
        //     (skinWeights[1] * quat1) +
        //     (skinWeights[2] * quat2) +
        //     (skinWeights[3] * quat3);
        // vec3 skinned_normal = aNorm * trans;
        normal = normalize(mWorld * vec4(skinned_normal, 0.0));
	
        uv = aUV;
    }

`;
export const sceneFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;

    void main () {
        gl_FragColor = vec4((normal.x + 1.0)/2.0, (normal.y + 1.0)/2.0, (normal.z + 1.0)/2.0,1.0);
    }
`;
export const skeletonVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute float boneIndex;
  
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    uniform vec3 bTrans[64];
    uniform vec4 bRots[64];

    varying float currIndex;

    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    void main () {
        int index = int(boneIndex);
        currIndex = boneIndex;
        gl_Position = mProj * mView * mWorld * vec4(bTrans[index] + qtrans(bRots[index], vertPosition), 1.0);
    }
`;
export const skeletonFSText = `
    precision mediump float;
    varying float currIndex;
    uniform float selectedBone;

    void main () {
        if (int(currIndex) == int(selectedBone)) {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        } else {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
    }
`;
export const sBackVSText = `
    precision mediump float;

    attribute vec2 vertPosition;

    varying vec2 uv;

    void main() {
        gl_Position = vec4(vertPosition, 0.0, 1.0);
        uv = vertPosition;
        uv.x = (1.0 + uv.x) / 2.0;
        uv.y = (1.0 + uv.y) / 2.0;
    }
`;
export const sBackFSText = `
    precision mediump float;

    varying vec2 uv;

    void main () {
        gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0);
        if (abs(uv.y-.33) < .005 || abs(uv.y-.67) < .005) {
            gl_FragColor = vec4(1, 1, 1, 1);
        }
    }

`;
//# sourceMappingURL=Shaders.js.map