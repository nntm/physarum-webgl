import { GLSL1, GLSL3, WEBGL1, WEBGL2, isWebGL2Supported } from "gpu-io";

import { sketch } from "./src/main";
import { PARAMS } from "./src/settings";

/*-----------------------------------------------------------------------*/

const webGLSettings = {
    webGLVersion: isWebGL2Supported() ? "WebGL 2" : "WebGL 1",
    GLSLVersion: isWebGL2Supported() ? "GLSL 3" : "GLSL 1",
};

const contextID = webGLSettings.webGLVersion === "WebGL 2" ? WEBGL2 : WEBGL1;
const glslVersion = webGLSettings.GLSLVersion === "GLSL 3" ? GLSL3 : GLSL1;

/*-----------------------------------------------------------------------*/

const physarum = sketch(contextID, glslVersion, PARAMS);

physarum.init();
physarum.draw();
