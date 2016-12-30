var tube = {
    N: 80,
    M: 8,
    a: 6.0,
    b: 2.0,
    R: 1,
    p: 1,
    q: 8,
    spine: null,
    createSpine: function() {
        var N = this.N;
        var a = this.a;
        var b = this.b;
        var p = this.p;
        var q = this.q;
        var TUBE_N = (N + 1) * 3;
        this.spine = new Float32Array(3 * TUBE_N);
        var idx = 0;
        var dt = 2 * Math.PI / N;
        for (var i = 0, t = 0.0; i <= N; i++, t += dt) {
            if (i == N) {
                t == 0.0;
            };
            var sin_qt = Math.sin(q * t);
            var cos_qt = Math.cos(q * t);
            var sin_pt = Math.sin(p * t);
            var cos_pt = Math.cos(p * t);
            var sumabcos = a + b * cos_qt;
            var c = [sumabcos * cos_pt, sumabcos * sin_pt, b * sin_qt];
            this.spine[idx++] = c[0];
            this.spine[idx++] = c[1];
            this.spine[idx++] = c[2];
        };
    },
    verts: null,
    normals: null,


    createGeometry: function() {
        var N = this.N, M = this.M;
        var a = this.a, b = this.b;
        var p = this.p, q = this.q;
        var R = this.R;
        var sz = (N + 1) * (M + 1) * 3;
        this.verts = new Float32Array(sz);
        this.normals = new Float32Array(sz);
        var n = 0;
        var dt = 2 * Math.PI / N;
        var du = 2 * Math.PI / M;
        for (var i = 0, t = 0.0; i <= N; i++, t += dt) {
            if (i == N) {
                t == 0.0;
            };
            var sinqt = Math.sin(q * t), cosqt = Math.cos(q * t);
            var sinpt = Math.sin(p * t), cospt = Math.cos(p * t);
            var abcos = a + b * cosqt;
            var C = [abcos * cospt, abcos * sinpt, b * sinqt];
            var T = [-p * C[1] - b * q * sinqt * cospt, p * C[0] - b * q * sinqt * sinpt, q * b * cosqt];
            var A = [-p * T[1] + b * q * (p * sinqt * sinpt - q * cosqt * cospt), 
                      p * T[0] - b * q * (p * sinqt * cospt + q * cosqt * sinpt),
                    -q * q * b * sinqt];
            var B = cross3(T, A);
            norm3(T);
            norm3(B);
            var N_ = cross3(B, T);
            for (var j = 0, u = 0.0; j <= M; j++, u += du) {
                if (j == M) {
                    u = 0.0;
                };
                var cosu = Math.cos(u), sinu = Math.sin(u);
                for (var k = 0; k < 3; k++) {
                    this.normals[n] = cosu * N_[k] + sinu * B[k];
                    this.verts[n] = C[k] + R * this.normals[n];
                    n++;
                };
            };
        };
    },


    triangleStrip: null,
    createTriangleStrip: function() {
        var N = this.N, M = this.M;
        var nm = 2 * (M + 2) * this.N - 2;
        this.triangleStrip = new Uint16Array(nm);
        var index = function(i, j) {
            return i * (M + 1) + j;
        };
        n = 0;
        for (var i = 0; i < this.N; i++) {
            if (i > 0) {
                this.triangleStrip[n++] = index(i, 0);
            };
            for (var j = 0; j <= M; j++) {
                this.triangleStrip[n++] = index(i, j);
                this.triangleStrip[n++] = index(i + 1, j);
            };
            if (i < this.N - 1) {
                this.triangleStrip[n++] = index(i + 1, M);
            };
        };
    },


    wireframe: null,
    createWireFrame: function() {
        var strip = this.triangleStrip;
        var lines = [];
        lines.push(strip[0], strip[1]);
        var stripIndices = strip.length;
        for (var i = 2; i < stripIndices; i++) {
            var a = strip[i - 2];
            var b = strip[i - 1];
            var c = strip[i];
            if (a != b && b != c && a != c) {
                lines.push(a, c, b, c);
            };
        };
        this.wireframe = new Uint16Array(lines);
    },
};



var gl;
var canvas;
var program;
var camera;
var Model, View, Projection;

function getMousePos(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
};
var mouseDrag;

function mouseDown(event) {
    mouseDrag = getMousePos(canvas, event);
};
var radiansPerPixel = 0.01;
var phiMin = -Math.PI / 2 + 0.001;
var phiMax = +Math.PI / 2 - 0.001;
var frame;

function mouseMove(event) {
    if (mouseDrag) {
        var mousePos = getMousePos(canvas, event);
        var dx = mousePos.x - mouseDrag.x;
        var dy = mousePos.y - mouseDrag.y;
        camera.theta += dx * radiansPerPixel;
        camera.phi += dy * radiansPerPixel;
        if (camera.phi < phiMin) {
            camera.phi = phiMin;
        } else {
            if (camera.phi > phiMax) {
                camera.phi = phiMax;
            };
        };
        mouseDrag = mousePos;
        if (!frame) {
            frame = requestAnimationFrame(display);
        };
    };
};

function mouseUp(event) {
    mouseDrag = null;
};

function init() {
    canvas = document.getElementById('myCanvas');
    gl = canvas.getContext('experimental-webgl');
    canvas.addEventListener('mousedown', mouseDown, false);
    canvas.addEventListener('mousemove', mouseMove, false);
    document.body.addEventListener('mouseup', mouseUp, false);
    var v = document.getElementById('vertex').firstChild.nodeValue;
    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, v);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(vs));
        return false;
    };
    var f = document.getElementById('fragment').firstChild.nodeValue;
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, f);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(fs));
        return false;
    };
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    tube.N = 300;
    tube.M = 128;
    tube.p = 2;
    tube.q = 5;
    tube.createGeometry();
    tube.createTriangleStrip();
    tube.vertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tube.vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tube.verts, gl.STATIC_DRAW);
    tube.normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tube.normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tube.normals, gl.STATIC_DRAW);
    tube.triangleStripBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tube.triangleStripBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tube.triangleStrip, gl.STATIC_DRAW);
    program.vertexPosition = gl.getAttribLocation(program, 'vertexPosition');
    program.vertexNormal = gl.getAttribLocation(program, 'vertexNormal');
    program.ModelViewProjection = gl.getUniformLocation(program, 'ModelViewProjection');
    program.ModelViewMatrix = gl.getUniformLocation(program, 'ModelViewMatrix');
    program.NormalMatrix = gl.getUniformLocation(program, 'NormalMatrix');
    program.ambientLight = gl.getUniformLocation(program, 'ambientLight');
    program.light0Color = gl.getUniformLocation(program, 'light0Color');
    program.light0Position = gl.getUniformLocation(program, 'light0Position');
    program.materialAmbient = gl.getUniformLocation(program, 'materialAmbient');
    program.materialDiffuse = gl.getUniformLocation(program, 'materialDiffuse');
    program.materialSpecular = gl.getUniformLocation(program, 'materialSpecular');
    program.materialShininess = gl.getUniformLocation(program, 'materialShininess');
    gl.uniform3fv(program.materialAmbient, [0.1, 0.1, 0.1]);
    gl.uniform3fv(program.materialDiffuse, [0.1, 0.6, 0.6]);
    gl.uniform3fv(program.materialSpecular, [0.3, 0.3, 0.3]);
    gl.uniform1f(program.materialShininess, 10.0);
    gl.uniform3fv(program.ambientLight, [0.3, 0.3, 0.3]);
    gl.uniform3fv(program.light0Color, [1.0, 1.0, 1.0]);
    gl.uniform3fv(program.light0Position, [10.0, 10.0, 30.0]);
    gl.clearColor(0, 0, 0.3, 1);
    gl.uniform3fv(program.fragColor, [1.0, 1.0, 0.0]);
    Projection = new Matrix4x4;
    Projection.perspective(40, 1, 0.1, 100);
    View = new Matrix4x4;
    Model = new Matrix4x4;
    camera = {};
    camera.lookat = {
        x: 0,
        y: 0,
        z: 0
    };
    camera.distance = 25;
    camera.phi = Math.PI / 6;
    camera.theta = Math.PI / 4;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CW);
    gl.enable(gl.CULL_FACE);
    gl.lineWidth(2.0);
};

function getCameraPosition() {
    var d_cos_phi = camera.distance * Math.cos(camera.phi);
    camera.x = d_cos_phi * Math.sin(camera.theta) + camera.lookat.x;
    camera.y = d_cos_phi * Math.cos(camera.theta) + camera.lookat.y;
    camera.z = camera.distance * Math.sin(camera.phi) + camera.lookat.z;
};

function display() {
    frame = undefined;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    getCameraPosition();
    View.identity();
    View.lookat(camera.x, camera.y, camera.z, camera.lookat.x, camera.lookat.y, camera.lookat.z, 0, 0, 1);
    var ModelView = View.mult(Model);
    var NormalMatrix = ModelView.normal();
    var ModelViewProjection = Projection.mult(ModelView);
    gl.uniformMatrix4fv(program.ModelViewProjection, false, ModelViewProjection.array);
    gl.uniformMatrix4fv(program.ModelViewMatrix, false, ModelView.array);
    gl.uniformMatrix3fv(program.NormalMatrix, false, NormalMatrix);
    gl.uniform3fv(program.fragColor, [1, 1, 0.3]);
    gl.bindBuffer(gl.ARRAY_BUFFER, tube.vertBuffer);
    gl.enableVertexAttribArray(program.vertexPosition);
    gl.vertexAttribPointer(program.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, tube.normBuffer);
    gl.enableVertexAttribArray(program.vertexNormal);
    gl.vertexAttribPointer(program.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tube.triangleStripBuffer);
    gl.drawElements(gl.TRIANGLE_STRIP, tube.triangleStrip.length, gl.UNSIGNED_SHORT, 0);
    gl.flush();
};