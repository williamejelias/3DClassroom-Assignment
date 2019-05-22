// Classroom.js


// Vertex shader program
const VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'attribute vec4 a_Normal;\n' +

    'uniform mat4 u_ModelMatrix;\n' +
    'uniform mat4 u_NormalMatrix;\n' +
    'uniform mat4 u_ViewMatrix;\n' +
    'uniform mat4 u_ProjectionMatrix;\n' +

    'varying vec4 v_Color;\n' +
    'varying vec3 v_Normal;\n' +
    'varying vec3 v_Position;\n' +

    'void main() {\n' +
    '   gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
    //  calculate world coordinate of the vertex
    '   v_Position = vec3(u_ModelMatrix * a_Position);\n' +
    //  recalculate the normal with normal matrix and make it 1.0 in length
    '   v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '   v_Color = a_Color;\n' +
    '}\n';


// Fragment shader program
const FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +

    'uniform mat3 u_ModelMatrix3;\n' +

    'uniform vec3 u_LightColor[4];\n' +         // light colour
    'uniform vec3 u_LightPosition[4];\n' +      // position of light source (world coordinate)
    'uniform vec3 u_AmbientLight;\n' +          // color of ambient light

    'varying vec3 v_Normal;\n' +
    'varying vec3 v_Position;\n' +
    'varying vec4 v_Color;\n' +

    'void main() {\n' +
    '   vec3 finalColor = vec3(0.0, 0.0, 0.0);\n' +
    '   for (int i = 0; i < 4; i ++) {\n' +
    //      Normalize normal because its interpolated and not 1.0 in length
    '       vec3 normal = normalize(v_Normal);\n' +

    '       vec3 lightpos = u_ModelMatrix3 * u_LightPosition[i];\n' +

    //      calculate the light direction and make it 1.0 in length
    '       vec3 lightDirection = normalize(lightpos - v_Position);\n' +

    //      dot product of the light direction and the normal
    '       float nDotL = max(dot( lightDirection, normal), 0.0);\n' +

    //      Calculate the color due to diffuse reflection
    '       finalColor += u_LightColor[i] * v_Color.rgb * nDotL;\n' +
    '   }\n' +
    //  Calculate the color due to ambient reflection
    '   vec3 ambient = u_AmbientLight * v_Color.rgb;\n' +
    '   gl_FragColor = vec4(finalColor + ambient, v_Color.a);\n' + // Set the color

    '}\n';

// color of room is vec4(0.9, 0.9, 0.8, 1.0)

let modelMatrix = new Matrix4();
let viewMatrix = new Matrix4();
let projectMatrix = new Matrix4();
let g_normalMatrix = new Matrix4();  // Coordinate transformation matrix for normals

let lightColors;
let lightPositions;

let light1 = true;
let light2 = true;
let light3 = true;
let light4 = true;

let l1r = 0.3;
let l1g = 0.3;
let l1b = 0.3;

let l2r = 0.3;
let l2g = 0.3;
let l2b = 0.3;

let l3r = 0.3;
let l3g = 0.3;
let l3b = 0.3;

let l4r = 0.3;
let l4g = 0.3;
let l4b = 0.3;

let colors;

// classroom half-dimensions
let xDim = 5;
let yDim = 2.6;
let zDim = 5;

// chair dynamic movement x and z changes
let xDelta = 0.0;
let zDelta = 0.0;

let chairHeight = 0.95;
let chairWidth = 1;
let chairDepth = 1;
let chairBackHeight = 1;
let teacherChairBackHeight = 1.3;
let wallThickness = 0.18;
let studentDeskWidth = 3.5;
let whiteboardWidth = 5;
let whiteboardHeight = 2;
let doorWidth = 1.65;
let doorHeight = 3.5;

// Rotation angle (degrees/second)
let ANGLE_STEP = 0.0;

function main() {
    // Retrieve <canvas> element
    const canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    const gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return;
    }

    const u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    const u_ModelMatrix3 = gl.getUniformLocation(gl.program, 'u_ModelMatrix3');

    const u_ViewMatrix = gl.getUniformLocation(gl.program,'u_ViewMatrix');
    const u_ProjectionMatrix = gl.getUniformLocation(gl.program,'u_ProjectionMatrix');
    const u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');


    const u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
    const u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');

    const u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');

    if (!u_ModelMatrix || !u_ViewMatrix || !u_NormalMatrix ||
        !u_ProjectionMatrix || !u_LightColor ||
        !u_AmbientLight  ) {
        console.log('Failed to Get the storage locations of u_ModelMatrix, u_ViewMatrix, and/or u_ProjMatrix');
        return;
    }

    lightColors = [
        l1r, l1g, l1b,      // light 1
        l2r, l2g, l2b,      // light 2
        l3r, l3g, l3b,      // light 3
        l4r, l4g, l4b,      // light 4
    ];

    // set the light color of the lights (white)
    // set to 0,0,0 to turn off light
    gl.uniform3fv(u_LightColor, lightColors);

    // set the ambient light color
    gl.uniform3f(u_AmbientLight, 0.2 , 0.2, 0.2);

    lightPositions = [
        -2.5, yDim - (wallThickness/2) - 0.2, -2.5,         // light 1
        -2.5, yDim - (wallThickness/2) - 0.2, 2.5,          // light 2
        2.5, yDim - (wallThickness/2) - 0.2, -2.5,          // light 3
        2.5, yDim - (wallThickness/2) - 0.2, 2.5,           // light 4
    ];

    // set the position of the point light
    gl.uniform3fv(u_LightPosition, lightPositions);

    // Set the eye point, look-at point, and up direction
    viewMatrix.setLookAt(0, 0, 27, 0, 0, -27, 0, 1, 0);

    // set the perspective
    projectMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);

    // Current rotation angle of a triangle
    let currentAngle = 0.0;

    // handle when keys are pressed down or are up
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    // update the frame with new rotated view
    let tick = function() {
        handleKeyUpDown();
        currentAngle = animate(currentAngle);// Update the rotation angle
        draw(gl, currentAngle, u_ProjectionMatrix, u_ViewMatrix, u_ModelMatrix, u_NormalMatrix, u_LightColor, u_ModelMatrix3);
        requestAnimationFrame(tick);// Request that the browser calls tick
    };
    tick();
}

function initVertexBuffers(gl) {
    //------------------------------------------------------------------------
    // Cube array Code adapted from practical 3
    //------------------------------------------------------------------------
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-v4
    //  |/      |/
    //  v2------v3

     let vertices = new Float32Array([   // Coordinates
        0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   // v0-v1-v2-v3 front
        0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5,   // v0-v3-v4-v5 right
        0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5,   // v0-v5-v6-v1 up
        -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5,  // v1-v6-v7-v2 left
        -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5,  // v7-v4-v3-v2 down
        0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5    // v4-v7-v6-v5 back
    ]);

    colors = new Float32Array([    // Colors
        1.0, 1.0, 1.0,   1.0, 1.0, 1.0,   1.0, 1.0, 1.0,  1.0, 1.0, 1.0,    // v0-v1-v2-v3 front
        1.0, 1.0, 1.0,   1.0, 1.0, 1.0,   1.0, 1.0, 1.0,  1.0, 1.0, 1.0,    // v0-v3-v4-v5 right
        1.0, 1.0, 1.0,   1.0, 1.0, 1.0,   1.0, 1.0, 1.0,  1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
        1.0, 1.0, 1.0,   1.0, 1.0, 1.0,   1.0, 1.0, 1.0,  1.0, 1.0, 1.0,    // v1-v6-v7-v2 left
        1.0, 1.0, 1.0,   1.0, 1.0, 1.0,   1.0, 1.0, 1.0,  1.0, 1.0, 1.0,    // v7-v4-v3-v2 down
        1.0, 1.0, 1.0,   1.0, 1.0, 1.0,   1.0, 1.0, 1.0,  1.0, 1.0, 1.0,　  // v4-v7-v6-v5 back
    ]);


    let normals = new Float32Array([    // Normal
        0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   // v0-v1-v2-v3 front
        1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   // v0-v3-v4-v5 right
        0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   // v0-v5-v6-v1 up
        -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
        0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   // v7-v4-v3-v2 down
        0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0    // v4-v7-v6-v5 back
    ]);


    // Indices of the vertices
    let indices = new Uint8Array([
        0, 1, 2,   0, 2, 3,     // front
        4, 5, 6,   4, 6, 7,     // right
        8, 9,10,   8,10,11,     // up
        12,13,14,  12,14,15,    // left
        16,17,18,  16,18,19,    // down
        20,21,22,  20,22,23     // back
    ]);
    //------------------------------------------------------------------------
    // End of Cube array Code adapted from practical 3
    //------------------------------------------------------------------------


    if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;

    let indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log('Failed to create the buffer object');
        return false;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return indices.length;
}

function initArrayBuffer (gl, attribute, data, num, type) {
    // Create a buffer object
    let buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return false;
    }

    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // Assign the buffer object to the attribute variable
    let a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
        console.log('Failed to get the storage location of ' + attribute);
        return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return true;
}

function draw(gl, currentAngle, u_ProjectionMatrix, u_ViewMatrix,  u_ModelMatrix, u_NormalMatrix, u_LightColor, u_ModelMatrix3){
    // Set the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);


    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set the positions of vertices
    let n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to set the positions of the vertices');
        return;
    }

    // Set up rotation matrix about y axis
    modelMatrix.setRotate(currentAngle, 0, 1, 0);


    let modelMatrix3 = new Float32Array([
        modelMatrix.elements[0], modelMatrix.elements[1], modelMatrix.elements[2],
        modelMatrix.elements[4], modelMatrix.elements[5], modelMatrix.elements[6],
        modelMatrix.elements[8], modelMatrix.elements[9], modelMatrix.elements[10],
    ]);


    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projectMatrix.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.uniformMatrix3fv(u_ModelMatrix3, false, modelMatrix3);


    // set lights on off
    gl.uniform3fv(u_LightColor, lightColors);

    // change classroom colour to
    changeColor(0.79, 0.85, 0.88);
    if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;

    // left wall upper
    pushMatrix(modelMatrix);
    modelMatrix.translate(-xDim , 5*yDim/6, 0);             // Translation
    modelMatrix.scale(wallThickness, 2*yDim/6, 2*zDim);     // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // left wall lower
    pushMatrix(modelMatrix);
    modelMatrix.translate(-xDim , -5*yDim/6, 0);            // Translation
    modelMatrix.scale(wallThickness, 2*yDim/6, 2*zDim);     // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // left wall far
    pushMatrix(modelMatrix);
    modelMatrix.translate(-xDim , 0, -5*zDim/6);            // Translation
    modelMatrix.scale(wallThickness, 4*yDim/3, 2*zDim/6);   // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // left wall middle
    pushMatrix(modelMatrix);
    modelMatrix.translate(-xDim , 0, 0);                    // Translation
    modelMatrix.scale(wallThickness, 4*yDim/3, 2*zDim/6);   // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // left wall front
    pushMatrix(modelMatrix);
    modelMatrix.translate(-xDim , 0, 5*zDim/6);             // Translation
    modelMatrix.scale(wallThickness, 4*yDim/3, 2*zDim/6);   // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();



    // right wall upper
    pushMatrix(modelMatrix);
    modelMatrix.translate(xDim , 5*yDim/6, 0);              // Translation
    modelMatrix.scale(wallThickness, 2*yDim/6, 2*zDim);     // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // right wall lower
    pushMatrix(modelMatrix);
    modelMatrix.translate(xDim , -5*yDim/6, 0);             // Translation
    modelMatrix.scale(wallThickness, 2*yDim/6, 2*zDim);     // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // right wall far
    pushMatrix(modelMatrix);
    modelMatrix.translate(xDim , 0, -5*zDim/6);             // Translation
    modelMatrix.scale(wallThickness, 4*yDim/3, 2*zDim/6);   // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // right wall middle
    pushMatrix(modelMatrix);
    modelMatrix.translate(xDim , 0, 0);                     // Translation
    modelMatrix.scale(wallThickness, 4*yDim/3, 2*zDim/6);   // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // right wall front
    pushMatrix(modelMatrix);
    modelMatrix.translate(xDim , 0, 5*zDim/6);              // Translation
    modelMatrix.scale(wallThickness, 4*yDim/3, 2*zDim/6);   // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // rear wall
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 0, -zDim + (wallThickness/2)); // Translation
    modelMatrix.scale(2*xDim, 2*yDim, wallThickness);       // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // ceiling
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, +yDim - (wallThickness/2), 0); // Translation
    modelMatrix.scale(2*xDim, wallThickness, 2*zDim);       // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // change floor colour to brown
    changeColor(0.55, 0.55, 0.7);
    if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;

    // bottom floor
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, -yDim + (wallThickness/2), 0);         // Translation
    modelMatrix.scale(2*xDim-0.001, wallThickness, 2*zDim-0.001);   // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // change desk/ door colour to dark brown
    changeColor(0.87, 0.72, 0.53);
    if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;

    // back left desk
    drawDesk(-xDim/2, - 1.2, -zDim/2+2, gl, u_ModelMatrix, u_NormalMatrix, n);
    // back right desk
    drawDesk(xDim/2, - 1.2, -zDim/2+2, gl, u_ModelMatrix, u_NormalMatrix, n);
    // front left desk
    drawDesk(-xDim/2, - 1.2, zDim/2, gl, u_ModelMatrix, u_NormalMatrix, n);
    // front right desk
    drawDesk(xDim/2, - 1.2, zDim/2, gl, u_ModelMatrix, u_NormalMatrix, n);

    // teachers desk
    drawTeachersDesk(xDim/2, - 1.2, -zDim/2-0.7, gl, u_ModelMatrix, u_NormalMatrix, n);

    // door
    drawDoor(-3, -(yDim-doorHeight)-doorHeight/2, -zDim+(wallThickness/2)+0.05, gl, u_ModelMatrix, u_NormalMatrix, n);


    // change teachers chair to dark grey
    changeColor(0.29, 0.29, 0.29);
    if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;

    // teachers desk
    drawTeachersChair(xDim/2, -(yDim - chairHeight), -zDim/2-1.3, gl, u_ModelMatrix, u_NormalMatrix, n);

    // whiteboard boarder
    drawWhiteboardBoarder(2, 0, -zDim+(wallThickness/2)+0.05, gl, u_ModelMatrix, u_NormalMatrix, n);



    // change student chairs to coral red
    changeColor(1.0, 0.09, 0.09);
    if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;

    // back left desk left chair
    drawChair(-xDim/2-studentDeskWidth/4 + xDelta, -(yDim - chairHeight), -zDim/2 + 2.55 + zDelta, gl, u_ModelMatrix, u_NormalMatrix, n);
    // back left desk right chair
    drawChair(-xDim/2+studentDeskWidth/4 + xDelta, -(yDim - chairHeight), -zDim/2 + 2.55 + zDelta, gl, u_ModelMatrix, u_NormalMatrix, n);

    // back right desk left chair
    drawChair(xDim/2-studentDeskWidth/4 + xDelta, -(yDim - chairHeight), -zDim/2 + 2.55 + zDelta, gl, u_ModelMatrix, u_NormalMatrix, n);
    // back right desk right chair
    drawChair(xDim/2+studentDeskWidth/4 + xDelta, -(yDim - chairHeight), -zDim/2 + 2.55 + zDelta, gl, u_ModelMatrix, u_NormalMatrix, n);

    // front left desk left chair
    drawChair(-xDim/2-studentDeskWidth/4 + xDelta, -(yDim - chairHeight), zDim/2 + 0.55 + zDelta, gl, u_ModelMatrix, u_NormalMatrix, n);
    // front left desk right chair
    drawChair(-xDim/2+studentDeskWidth/4 + xDelta, -(yDim - chairHeight), zDim/2 + 0.55 + zDelta, gl, u_ModelMatrix, u_NormalMatrix, n);

    // front right desk left chair
    drawChair(xDim/2-studentDeskWidth/4 + xDelta, -(yDim - chairHeight), zDim/2 + 0.55 + zDelta, gl, u_ModelMatrix, u_NormalMatrix, n);
    // front right desk right chair
    drawChair(xDim/2+studentDeskWidth/4 + xDelta, -(yDim - chairHeight), zDim/2 + 0.55 + zDelta, gl, u_ModelMatrix, u_NormalMatrix, n);


    // change whiteboard to white
    changeColor(1.0, 1.0, 1.0);
    if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;

    drawWhiteboard(2, 0, -zDim+(wallThickness/2)+0.05, gl, u_ModelMatrix, u_NormalMatrix, n);

    drawWindow(-xDim, 0, 5*zDim/12, gl, u_ModelMatrix, u_NormalMatrix, n);
    drawWindow(-xDim, 0, -5*zDim/12, gl, u_ModelMatrix, u_NormalMatrix, n);
    drawWindow(xDim, 0, 5*zDim/12, gl, u_ModelMatrix, u_NormalMatrix, n);
    drawWindow(xDim, 0, -5*zDim/12, gl, u_ModelMatrix, u_NormalMatrix, n);

    drawLightBox (-2.5, yDim - (wallThickness/2)-0.1, -2.5, gl, u_ModelMatrix, u_NormalMatrix, n);
    drawLightBox (-2.5, yDim - (wallThickness/2)-0.1, 2.5, gl, u_ModelMatrix, u_NormalMatrix, n);
    drawLightBox (2.5, yDim - (wallThickness/2)-0.1, -2.5, gl, u_ModelMatrix, u_NormalMatrix, n);
    drawLightBox (2.5, yDim - (wallThickness/2)-0.1, 2.5, gl, u_ModelMatrix, u_NormalMatrix, n);

    // left wall bottom skirting board
    pushMatrix(modelMatrix);
    modelMatrix.translate(-xDim + wallThickness/2 + 0.03, -yDim + wallThickness/2 + 0.225, 0);  // Translation
    modelMatrix.scale(0.06, 0.45, 2*zDim-0.01); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // left wall upper skirting board
    pushMatrix(modelMatrix);
    modelMatrix.translate(-xDim + wallThickness/2 + 0.03, yDim - wallThickness/2 - 0.225, 0);  // Translation
    modelMatrix.scale(0.06, 0.45, 2*zDim-0.01); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // right wall skirting board
    pushMatrix(modelMatrix);
    modelMatrix.translate(xDim - wallThickness/2 - 0.03, -yDim + wallThickness/2 + 0.225, 0);  // Translation
    modelMatrix.scale(0.06, 0.45, 2*zDim-0.01); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // right wall upper skirting board
    pushMatrix(modelMatrix);
    modelMatrix.translate(xDim - wallThickness/2 - 0.03, yDim - wallThickness/2 - 0.225, 0);  // Translation
    modelMatrix.scale(0.06, 0.45, 2*zDim-0.01); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // rear wall upper skirting board
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, yDim - wallThickness/2 - 0.225, -zDim + wallThickness/2 + 0.1);  // Translation
    modelMatrix.scale(2*xDim-0.01, 0.45, 0.06); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // rear wall bottom skirting board left
    pushMatrix(modelMatrix);
    modelMatrix.translate(-4.4125, -yDim + wallThickness/2 + 0.225, -zDim + wallThickness/2 + 0.1);  // Translation
    modelMatrix.scale(1.175, 0.45, 0.06); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // rear wall bottom skirting board right
    pushMatrix(modelMatrix);
    modelMatrix.translate(1.4125, -yDim + wallThickness/2 + 0.225, -zDim + wallThickness/2 + 0.1);  // Translation
    modelMatrix.scale(7.175, 0.45, 0.06); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // change doorknob to yellow
    changeColor(1.0, 0.93, 0.0);
    if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;

    drawDoorknob(-3, -(yDim-doorHeight)-doorHeight/2, -zDim+(wallThickness/2)+0.05, gl, u_ModelMatrix, u_NormalMatrix, n);

}

// Last time when this function was called
let g_last = Date.now();

function animate(angle)  {
    let now = Date.now();
    let elapsed = now - g_last; // milliseconds
    g_last = now;
    // Update the current rotation angle (adjusted by the elapsed time)
    let newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle %= 360;
}



//------------------------------------------------------------------------
// Code adapted from practical 3
//------------------------------------------------------------------------
let g_matrixStack = []; // Array for storing a matrix
function pushMatrix(m) { // Store the specified matrix to the array
    let m2 = new Matrix4(m);
    g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array
    return g_matrixStack.pop();
}

function drawbox(gl, u_ModelMatrix, u_NormalMatrix, n) {
    pushMatrix(modelMatrix);

    // Pass the model matrix to the uniform variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // Calculate the normal transformation matrix and pass it to u_NormalMatrix
    g_normalMatrix.setInverseOf(modelMatrix);
    g_normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);

    // Draw the cube
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

    modelMatrix = popMatrix();
}
//------------------------------------------------------------------------
// End of Code adapted from practical 3
//------------------------------------------------------------------------



let currentlyPressedKeys = {};

function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
    ANGLE_STEP = 0.0;
}

window.onkeypress = function(event) {
    console.log(event.keyCode);
    switch (event.keyCode) {
        case 49:
            // 1 key - light 1 on/off
            if (light1) {
                lightColors[0] = 0.0;
                lightColors[1] = 0.0;
                lightColors[2] = 0.0;
                console.log('light 1 turned off');
                light1 = false;
            } else {
                lightColors[0] = l1r;
                lightColors[1] = l2g;
                lightColors[2] = l1b;
                console.log('light 1 turned on');
                light1 = true;
            }
            break;
        case 50:
            // 2 key - light 2 on/off
            if (light2) {
                lightColors[3] = 0.0;
                lightColors[4] = 0.0;
                lightColors[5] = 0.0;
                console.log('light 2 turned off');
                light2 = false;
            } else {
                lightColors[3] = l2r;
                lightColors[4] = l2g;
                lightColors[5] = l2b;
                console.log('light 2 turned on');
                light2 = true;
            }
            break;
        case 51:
            // 3 key - light 3 on/off
            if (light3) {
                lightColors[6] = 0.0;
                lightColors[7] = 0.0;
                lightColors[8] = 0.0;
                console.log('light 3 turned off');
                light3 = false;
            } else {
                lightColors[6] = l3r;
                lightColors[7] = l3g;
                lightColors[8] = l3b;
                console.log('light 3 turned on');
                light3 = true;
            }
            break;
        case 52:
            // 4 key - light 4 on/off
            if (light4) {
                lightColors[9] = 0.0;
                lightColors[10] = 0.0;
                lightColors[11] = 0.0;
                console.log('light 4 turned off');
                light4 = false;
            } else {
                lightColors[9] = l4r;
                lightColors[10] = l4g;
                lightColors[11] = l4b;
                console.log('light 4 turned on');
                light4 = true;
            }
            break;
        case 97:
            // a key, move left
            xDelta -= 0.1;
            break;
        case 100:
            // d key, move right
            xDelta += 0.1;
            break;
        case 115:
            // s key, move out of screen
            zDelta += 0.1;
            break;
        case 119:
            // w key, move into screen
            zDelta -= 0.1;
            break;
    }
};

function handleKeyUpDown() {
    if (currentlyPressedKeys[37]) {
        // rotate left
        ANGLE_STEP = 30.0;
    }
    if (currentlyPressedKeys[39]) {
        // rotate right
        ANGLE_STEP = -30.0;
    }
}

function changeColor(r,g,b) {
    colors = new Float32Array([    // Colors
        r, g, b,  r, g, b,   r, g, b,  r, g, b,     // v0-v1-v2-v3 front
        r, g, b,  r, g, b,   r, g, b,  r, g, b,     // v0-v3-v4-v5 right
        r, g, b,  r, g, b,   r, g, b,  r, g, b,     // v0-v5-v6-v1 up
        r, g, b,  r, g, b,   r, g, b,  r, g, b,     // v1-v6-v7-v2 left
        r, g, b,  r, g, b,   r, g, b,  r, g, b,     // v7-v4-v3-v2 down
        r, g, b,  r, g, b,   r, g, b,  r, g, b,　   // v4-v7-v6-v5 back
    ]);
}

function drawDesk(x, y, z, gl, u_ModelMatrix, u_NormalMatrix, n) {
    // desk1 in classroom
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y, z);  // Translation
    modelMatrix.scale(studentDeskWidth, 0.1, 1.5); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // desk1 left leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(x-1.72, y -0.61, z);  // Translation
    modelMatrix.scale(0.05, 1.22, 1.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // desk1 right leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(x+1.72, y -0.61, z);  // Translation
    modelMatrix.scale(0.05, 1.22, 1.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function drawTeachersDesk(x, y, z, gl, u_ModelMatrix, u_NormalMatrix, n) {
    // teachers desk top
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y, z);  // Translation
    modelMatrix.scale(4.8, 0.1, 1.5); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // teachers desk left leg in classroom
    pushMatrix(modelMatrix);
    modelMatrix.translate(x-2.2, y-0.66, z);  // Translation
    modelMatrix.scale(0.05, 1.22, 1.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // teachers desk right leg in classroom
    pushMatrix(modelMatrix);
    modelMatrix.translate(x+2.2, y-0.66, z);  // Translation
    modelMatrix.scale(0.05, 1.22, 1.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // teachers desk drawers
    pushMatrix(modelMatrix);
    modelMatrix.translate(x+1.7, y-0.66, z);  // Translation
    modelMatrix.scale(1.18, 1.22, 1.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // teachers desk drawers
    pushMatrix(modelMatrix);
    modelMatrix.translate(x-1.7, y-0.66, z);  // Translation
    modelMatrix.scale(1.18, 1.22, 1.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

}

function drawTeachersChair(x, y, z, gl, u_ModelMatrix, u_NormalMatrix, n) {
    // seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y, z);  // Translation
    modelMatrix.scale(chairWidth, 0.1, chairDepth); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // back
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y+teacherChairBackHeight/2-0.05, z-0.45);  // Translation
    modelMatrix.scale(chairWidth, teacherChairBackHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // front left leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(x - chairWidth/2 + 0.05, y-chairHeight/2, z + chairDepth/2 - 0.05);  // Translation
    modelMatrix.scale(0.1, chairHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // front right leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(x + chairWidth/2 - 0.05, y-chairHeight/2, z + chairDepth/2 - 0.05);  // Translation
    modelMatrix.scale(0.1, chairHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // back left leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(x - chairWidth/2 + 0.05, y-chairHeight/2, z - chairDepth/2 + 0.05);  // Translation
    modelMatrix.scale(0.1, chairHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // back right leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(x + chairWidth/2 - 0.05, y-chairHeight/2, z - chairDepth/2 + 0.05);  // Translation
    modelMatrix.scale(0.1, chairHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function drawDoor(x, y, z, gl, u_ModelMatrix, u_NormalMatrix, n) {
    // door
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y, z);  // Translation
    modelMatrix.scale(doorWidth, doorHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function drawDoorknob(x, y, z, gl, u_ModelMatrix, u_NormalMatrix, n) {
    // doorknob
    pushMatrix(modelMatrix);
    modelMatrix.translate(x+doorWidth/3, y, z+0.1);  // Translation
    modelMatrix.scale(0.15, 0.15, 0.15); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function drawWhiteboard(x, y, z, gl, u_ModelMatrix, u_NormalMatrix, n) {
    // whiteboard
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y, z);  // Translation
    modelMatrix.scale(whiteboardWidth, whiteboardHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function drawWhiteboardBoarder(x, y, z, gl, u_ModelMatrix, u_NormalMatrix, n) {
    // left boarder
    pushMatrix(modelMatrix);
    modelMatrix.translate(x-whiteboardWidth/2, y, z);  // Translation
    modelMatrix.scale(0.1, whiteboardHeight+ 0.1, 0.11); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // right boarder
    pushMatrix(modelMatrix);
    modelMatrix.translate(x+whiteboardWidth/2, y, z);  // Translation
    modelMatrix.scale(0.1, whiteboardHeight+ 0.1, 0.11); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // top boarder
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y+whiteboardHeight/2, z);  // Translation
    modelMatrix.scale(whiteboardWidth+ 0.1, 0.1, 0.11); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // bottom boarder
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y-whiteboardHeight/2, z);  // Translation
    modelMatrix.scale(whiteboardWidth+ 0.1, 0.1, 0.11); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function drawLightBox (x, y, z, gl, u_ModelMatrix, u_NormalMatrix, n) {
    // light white square
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y, z);  // Translation
    modelMatrix.scale(1.5, 0.05, 1.5); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function drawChair (x, y, z, gl, u_ModelMatrix, u_NormalMatrix, n) {
    // seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y, z);  // Translation
    modelMatrix.scale(chairWidth, 0.1, chairDepth); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // back
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y+chairBackHeight/2-0.05, z+0.45);  // Translation
    modelMatrix.scale(chairWidth, chairBackHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // front left leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(x - chairWidth/2 + 0.05, y-chairHeight/2, z + chairDepth/2 - 0.05);  // Translation
    modelMatrix.scale(0.1, chairHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // front right leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(x + chairWidth/2 - 0.05, y-chairHeight/2, z + chairDepth/2 - 0.05);  // Translation
    modelMatrix.scale(0.1, chairHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // back left leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(x - chairWidth/2 + 0.05, y-chairHeight/2, z - chairDepth/2 + 0.05);  // Translation
    modelMatrix.scale(0.1, chairHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // back right leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(x + chairWidth/2 - 0.05, y-chairHeight/2, z - chairDepth/2 + 0.05);  // Translation
    modelMatrix.scale(0.1, chairHeight, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

function drawWindow(x, y, z, gl, u_ModelMatrix, u_NormalMatrix, n) {
    // centre slat
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y, z);  // Translation
    modelMatrix.scale(0.1, 0.1, zDim/2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // closest side frame
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y, z-zDim/4);  // Translation
    modelMatrix.scale(wallThickness+0.1, 4*yDim/3+0.075, 0.3); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // far side frame
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, y, z+zDim/4);  // Translation
    modelMatrix.scale(wallThickness+0.1, 4*yDim/3+0.075, 0.3); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // bottom side frame
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, 2*yDim/3, z);  // Translation
    modelMatrix.scale(wallThickness+0.1, 0.3, zDim/2+0.3); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // top side frame
    pushMatrix(modelMatrix);
    modelMatrix.translate(x, -2*yDim/3, z);  // Translation
    modelMatrix.scale(wallThickness+0.1, 0.3, zDim/2+0.3); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}