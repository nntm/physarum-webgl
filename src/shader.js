export const vs_1 = `
precision highp float;

// Attributes
attribute vec4 aPosition; // Vertex position

// Uniforms
uniform sampler2D uTexture0; // Texture input from shader 1
uniform sampler2D uTexture1; // Texture input from shader 2
uniform float speedMultiplier;
uniform float randomSteerFactor;
uniform float constantSteerFactor;
uniform float searchRadius;
uniform float senseAngle;
uniform float trailStrength;
uniform float vertexRadius;
uniform int wallStrategy;
uniform int colorStrategy;

// Varying
varying vec4 vColor; // Color passed to the fragment shader

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 texcoord = vec2((aPosition.x + 1.0) / 2.0, (aPosition.y + 1.0) / 2.0);
    vec4 texVal = texture2D(uTexture1, texcoord);

    float direction = (aPosition.w - 1.0) * 1000.0;
    float speedVar = aPosition.z * 1000.0;

    direction += randomSteerFactor * 3.0 * (rand(texcoord + texVal.xy) - 0.5);

    float speed = speedMultiplier * speedVar; 

    float senseLeft = texture2D(uTexture1, vec2(texcoord.x + cos(direction + senseAngle) * searchRadius, texcoord.y + sin(direction + senseAngle) * searchRadius)).b;
    float senseRight = texture2D(uTexture1, vec2(texcoord.x + cos(direction - senseAngle) * searchRadius, texcoord.y + sin(direction - senseAngle) * searchRadius)).b;
    float senseForward = texture2D(uTexture1, vec2(texcoord.x + cos(direction) * searchRadius, texcoord.y + sin(direction) * searchRadius)).b;

    float steerAmount = constantSteerFactor + randomSteerFactor * rand(texcoord + texVal.xy);
    
    if (senseForward > senseLeft && senseForward > senseRight) {
        direction += 0.0;
    } else if (senseForward < senseLeft && senseForward < senseRight) {
        direction += randomSteerFactor * (rand(texcoord + texVal.xy) - 0.5);
    } else if (senseRight > senseLeft) {
        direction -= steerAmount;
    } else if (senseRight < senseLeft) {
        direction += steerAmount;
    }

    float yNew = aPosition.y;
    float xNew = aPosition.x; 

    if (wallStrategy == 0) { // Wrap
        if (yNew > 0.99) { yNew = -0.99; }
        if (yNew < -0.99) { yNew = 0.99; }
        if (xNew > 0.99) { xNew = -0.99; }
        if (xNew < -0.99) { xNew = 0.99; }
    } else if (wallStrategy == 1) { // Bounce
        if (yNew + speed * sin(direction) > 0.90) {
            float d = atan(sin(direction), cos(direction));
            direction -= 2.0 * d;
        }
        if (yNew + speed * sin(direction) < -0.90) {
            float d = atan(sin(direction), cos(direction));
            direction -= 2.0 * d;
        }
        if (xNew + speed * cos(direction) > 0.90) {
            float d = atan(cos(direction), sin(direction));
            direction += 2.0 * d;
        }
        if (xNew + speed * cos(direction) < -0.90) {
            float d = atan(cos(direction), sin(direction));
            direction += 2.0 * d;
        }
    }

    yNew += speed * speedMultiplier * sin(direction);
    xNew += speed * speedMultiplier * cos(direction);

    float r = 0.0;
    float g = 0.0;

    if (colorStrategy == 0) { // Position
        r = abs(yNew) / 2.0 + 0.5;
        g = abs(xNew) / 2.0 + 0.5;
    } else if (colorStrategy == 1) { // Direction
        r = sin(direction);
        g = cos(direction);
    } else if (colorStrategy == 2) { // Grey
        r = trailStrength;
        g = r;
    } else if (colorStrategy == 3) { // Speed
        r = speedVar * 50.0;
        g = r;
    }

    vColor = vec4(r, g, trailStrength, 1.0);

    gl_Position = vec4(xNew, yNew, speedVar / 1000.0, 1.0 + direction / 1000.0);
    gl_PointSize = vertexRadius;
}
`;

export const fs_1 = `
precision highp float;

// Varying from vertex shader
varying vec4 vColor;

void main() {
    gl_FragColor = vColor;
}
`;

export const vs_2 = `
precision highp float;

// Attributes
attribute vec3 aPosition;
attribute vec2 aTexCoord;

// Varying
varying vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;

    vec4 positionVec4 = vec4(aPosition, 1.0);
    positionVec4.xy = positionVec4.xy * 2.0 - 1.0;

    gl_Position = positionVec4;
}
`;

export const fs_2 = `
precision highp float;

// Uniforms
uniform sampler2D uTexture0; // Output of shader 1
uniform sampler2D uTexture1; // Previous frame output from shader 2
uniform float uTime; // Time variable
uniform float uFadeSpeed; // Fade speed
uniform float uBlurFraction; // Blur fraction

// Varying from vertex shader
varying vec2 vTexCoord;

// For blurring
const float Directions = 8.0;
const float Quality = 1.0;
const float Radius = 1.0 / 1200.0;
float pixelCount = 1.0;

void main() {
    vec2 texcoord = vTexCoord; 
    
    vec4 blurred = texture2D(uTexture1, texcoord); 
    for (float d = 0.0; d < 6.3; d += 6.3 / Directions) {
        for (float i = 1.0 / Quality; i <= 1.0; i += 1.0 / Quality) {
            blurred += texture2D(uTexture1, texcoord + vec2(cos(d), sin(d)) * Radius * i); 
            pixelCount += 1.0;
        }
    }
    blurred /= pixelCount;      

    vec4 shader1Out = texture2D(uTexture0, texcoord); 
    vec4 prevFrame = texture2D(uTexture1, texcoord); 

    blurred = prevFrame * (1.0 - uBlurFraction) + blurred * uBlurFraction;
    
    gl_FragColor = shader1Out + blurred * (1.0 - uFadeSpeed) - 0.0001;
}
`;
