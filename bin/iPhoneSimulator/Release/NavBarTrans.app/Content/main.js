window.onload = () => {
    'use strict';

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./sw.js');
    }
    camStart();
}

// Override the function with all the posibilities
navigator.getUserMedia ||
    (navigator.getUserMedia = navigator.mozGetUserMedia ||
        navigator.webkitGetUserMedia || navigator.msGetUserMedia);

var gl;
var canvas;
var Param1 = 1.0;
var Param2 = 2.0;
var Param3 = 2.0;
var mouseX = 0.5;
var mouseY = 0.5;
var keyState1 = 0;
var keyState2 = 0;
var keyState3 = 0;
var keyState4 = 0;
function initGL() {
    try {
        gl = canvas.getContext("experimental-webgl");
        //            gl = canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "f") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "v") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var programsArray = new Array();
var current_program;

function initShaders() {
    programsArray.push(createProgram("shader-vs", "shader-1-fs"));
    programsArray.push(createProgram("shader-vs", "shader-2-fs"));
    current_program = programsArray[0];
}

function createProgram(vertexShaderId, fragmentShaderId) {
    var shaderProgram;
    var fragmentShader = getShader(gl, fragmentShaderId);
    var vertexShader = getShader(gl, vertexShaderId);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.resolutionUniform = gl.getUniformLocation(shaderProgram, "resolution");
    shaderProgram.mouse = gl.getUniformLocation(shaderProgram, "mouse");
    shaderProgram.indexUniform = gl.getUniformLocation(shaderProgram, "index");
    shaderProgram.time = gl.getUniformLocation(shaderProgram, "time");
    shaderProgram.Param1 = gl.getUniformLocation(shaderProgram, "Param1");
    shaderProgram.Param2 = gl.getUniformLocation(shaderProgram, "Param2");
    shaderProgram.Param3 = gl.getUniformLocation(shaderProgram, "Param3");
    return shaderProgram;
}

var webcam;
var texture;

function initTexture() {
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

var ix = 0.0;
var end;
var st = new Date().getTime();
function setUniforms() {
    end = new Date().getTime();
    gl.uniformMatrix4fv(current_program.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(current_program.mvMatrixUniform, false, mvMatrix);
    gl.uniform2f(current_program.resolutionUniform, canvas.width, canvas.height);
    gl.uniform2f(current_program.mouse, mouseX, mouseY);
    gl.uniform1i(current_program.indexUniform, ix);
    //        gl.uniform1f(current_program.time, performance.now()/1000.0);
    gl.uniform1f(current_program.time, ((end - st) % 1000000) / 1000.0);
    gl.uniform1f(current_program.Param1, Param1);
    gl.uniform1f(current_program.Param2, Param2);
    gl.uniform1f(current_program.Param3, Math.pow(Param3, 1.5));
}

var cubeVertexPositionBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;
function initBuffers() {
    cubeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    vertices = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeVertexPositionBuffer.itemSize = 2;
    cubeVertexPositionBuffer.numItems = 4;

    cubeVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    var textureCoords = [0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    cubeVertexTextureCoordBuffer.itemSize = 2;
    cubeVertexTextureCoordBuffer.numItems = 4;

    cubeVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    var cubeVertexIndices = [0, 1, 2, 0, 2, 3];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    cubeVertexIndexBuffer.itemSize = 1;
    cubeVertexIndexBuffer.numItems = 6;
}

function drawScene() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.enable(gl.BLEND);

    mat4.ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0, pMatrix);

    gl.useProgram(current_program);
    mat4.identity(mvMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    gl.vertexAttribPointer(current_program.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    gl.vertexAttribPointer(current_program.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, webcam);
    gl.uniform1i(current_program.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    setUniforms();
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function tick() {
    requestAnimFrame(tick);
    drawScene();
}

function webGLStart() {
    canvas = document.getElementById("webgl-canvas");
    if (screen.width > 1500 || screen.height > 1500) {
        canvas.width = 1024;
        canvas.height = 1024;
    }
    else {
        canvas.width = 512;
        canvas.height = 512;
    }
    initGL();
    initShaders();
    initBuffers();
    initTexture();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    tick();
}

var index = 0;
var player;
var player1;
var player2;
function PlaySound(i) {
    switch (i) {
        case 1:
            if (player == undefined) {
                player = document.getElementById('audio');
                player.loop = false;
            }
            player.load();
            player.play();
            break;
        case 2:
            if (player1 == undefined) {
                player1 = document.getElementById('audio1');
            }
            player1.load();
            player1.play();
            break;
        case 3:
            if (player2 == undefined) {
                player2 = document.getElementById('audio2');
            }
            player2.load();
            player2.play();
            break;
    }
}
function Action(i) {
    switch (i) {
        case 1: // Colour (ish))
            Param1 = Param1 + 1;
            if (Param1 > 4)
                Param1 = 1;
            PlaySound(2);
            break;
        case 2: // size
            Param2 = Param2 + 1;
            if (Param2 > 4)
                Param2 = 1;
            PlaySound(1);
            break;
        case 3: // number
            Param3 = Param3 + 1;
            if (Param3 > 4)
                Param3 = 1;
            PlaySound(1);
            break;
        case 4: // Style
            index = index + 1;
            if (index > 1)
                index = 0;
            current_program = programsArray[index];
            PlaySound(3);
            break;
    }
}
function toggleButtons() {
    var button = document.querySelector('button');
    var button1 = document.querySelector('button1');
    var button2 = document.querySelector('button2');
    var button3 = document.querySelector('button3');
    var buttonl = document.querySelector('buttonl');
    var buttonr = document.querySelector('buttonr');
    button.hidden = !button.hidden;
    button1.hidden = !button1.hidden;
    button2.hidden = !button2.hidden;
    button3.hidden = !button3.hidden;
    buttonl.hidden = !buttonl.hidden;
    buttonr.hidden = !buttonr.hidden;
}

function MonitorKeyDown(e) { // stop autorepeat of keys with KeyState1-4 flags
    if (!e) e = window.event;
    if (e.keyCode == 32 || e.keyCode == 49) {
        if (keyState1 == 0)
            Action(4);
        keyState1 = 1;
    }
    else if (e.keyCode == 50) {
        if (keyState2 == 0)
            Action(3);
        keyState2 = 1;
    }
    else if (e.keyCode == 51 || e.keyCode == 13) {
        if (keyState3 == 0)
            Action(1);
        keyState3 = 1;
    }
    else if (e.keyCode == 52) {
        if (keyState4 == 0)
            Action(2);
        keyState4 = 1;
    }
    else if (e.keyCode == 53) {
        toggleButtons();
    }
    return false;
}

function MonitorKeyUp(e) {
    if (!e) e = window.event;
    if (e.keyCode == 32 || e.keyCode == 49) {
        keyState1 = 0;
    }
    else if (e.keyCode == 50) {
        keyState2 = 0;
    }
    else if (e.keyCode == 51 || e.keyCode == 13) {
        keyState3 = 0;
    }
    else if (e.keyCode == 52) {
        keyState4 = 0;
    }
    return false;
}

var mouseState = 0;
function MonitorMouseDown(e) {
    if (!e) e = window.event;
    if (e.button == 0) {
        mouseState = 1;
        mouseX = e.clientX / canvas.scrollWidth;
        mouseY = 1.0 - e.clientY / canvas.scrollHeight;
    }
    toggleButtons();
    return false;
}

function MonitorMouseUp(e) {
    if (!e) e = window.event;
    if (e.button == 0) {
        mouseState = 0;
    }
    return false;
}
/*Duplication of SW Code?
async function registerSW() { 
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
       console.log("Service worker has been registered");
    } catch (e) {
      alert('ServiceWorker registration failed. Sorry about that.'); 
    }
  } else {
    document.querySelector('.alert').removeAttribute('hidden'); 
  }
}*/

function camStart() {
    var splash = document.querySelector('splash');
    var button = document.querySelector('button');
    var button1 = document.querySelector('button1');
    var button2 = document.querySelector('button2');
    var button3 = document.querySelector('button3');
    webcam = document.createElement('canvas'); //getElementById('webcam');
    keyState1 = 0;
    keyState2 = 0;
    keyState3 = 0;
    keyState4 = 0;
    //splash.hidden = true;
    //Param1 = Math.random(); // for Electra
    //Param2 = Math.random();
    splash.onclick = function (e) {
        if (document.body.requestFullscreen) {
            document.body.requestFullscreen();
        } else if (document.body.msRequestFullscreen) {
            document.body.msRequestFullscreen();
        } else if (document.body.mozRequestFullScreen) {
            document.body.mozRequestFullScreen();
        } else if (document.body.webkitRequestFullscreen) {
            document.body.webkitRequestFullscreen();
        }
        splash.hidden = true;
    }
    webGLStart();
    document.onkeydown = MonitorKeyDown;
    document.onkeyup = MonitorKeyUp;
    canvas.onmousedown = MonitorMouseDown;
    canvas.onmouseup = MonitorMouseUp;
    canvas.onmousemove = function (e) {
        e = e || window.event;
        if (mouseState == 1) {
            mouseX = (mouseX + 7.0 * e.clientX / canvas.scrollWidth) / 8.0;
            mouseY = (mouseY + 7.0 * (1.0 - e.clientY / canvas.scrollHeight)) / 8.0;
        }
    }
    canvas.ontouchstart = function (e) {
        e.preventDefault();
        toggleButtons();
        var touchs = e.changedTouches;
        mouseX = touchs[0].clientX / canvas.scrollWidth;
        mouseY = 1.0 - touchs[0].clientY / canvas.scrollHeight;
    };
    canvas.ontouchend = function (e) {
        e.preventDefault();
    };
    canvas.ontouchmove = function (e) {
        e.preventDefault();
        var touches = e.changedTouches;
        mouseX = touches[0].clientX / canvas.scrollWidth; //] (mouseX + 7.0*touches/canvas.scrollWidth)/8.0;
        mouseY = 1.0 - touches[0].clientY / canvas.scrollHeight; //(mouseY + 7.0*(1.0 - e.clientY/canvas.scrollHeight))/8.0;
    };
    button.onmousedown = function (e) {
        Action(4);
    }
    button1.onmousedown = function (e) {
        Action(1);
    }
    button2.onmousedown = function (e) {
        Action(2);
    }
    button3.onmousedown = function (e) {
        Action(3);
    }

    button.ontouchstart = function (e) {
        e.preventDefault();
        Action(4);
    }
    button1.ontouchstart = function (e) {
        e.preventDefault();
        Action(1);
    }
    button2.ontouchstart = function (e) {
        e.preventDefault();
        Action(2);
    }
    button3.ontouchstart = function (e) {
        e.preventDefault();
        Action(3);
    }
    registerSW();
}
