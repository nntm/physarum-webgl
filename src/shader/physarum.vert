#ifdef GL_ES
precision mediump float;
precision mediump int;
#endif

attribute vec4 position;
uniform mat4 uModelViewProjectionMatrix;

void main() {
    gl_Position = uModelViewProjectionMatrix * position;
}
