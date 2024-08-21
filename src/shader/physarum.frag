#ifdef GL_ES
precision mediump float;
precision mediump int;
#endif

uniform int screenWidth;
uniform int screenHeight;
uniform float decayRate;
uniform float diffuseRate;
uniform float senseAngle;
uniform float steerStrength;
uniform float senseDistance;
uniform float speed;
uniform float maxTrailDensity;
uniform float densitySpeed;
uniform int sensorSize;
uniform bool speedAffectedByTrailDensity;
uniform float deltaTime;
uniform sampler2D oldTrailMap;
uniform sampler2D newTrailMap;

uniform vec4 teamColor1;
uniform vec4 teamColor2;
uniform vec4 teamColor3;
uniform vec4 teamColor4;
uniform vec4 baseColor;

struct Particle {
    vec4 pos;
    vec4 speciesMask;
};

struct Cell {
    vec4 val;
};

// Hash and utility functions
uint hash(uint state) {
    state ^= 2747636419u;
    state *= 2654435769u;
    state ^= state >> 16;
    state *= 2654435769u;
    state ^= state >> 16;
    state *= 2654435769u;
    return state;
}

float scaleToRange01(uint state) {
    return state / 4294967295.0;
}

float sense(Particle particle, float angleOffset) {
    float angle = mod(particle.pos.z + angleOffset + 360.0, 360.0);
    vec2 direction = vec2(cos(angle), sin(angle));
    vec2 senseLocation = senseDistance * direction + particle.pos.xy;
    float sum = 0.0;
    vec4 senseWeight = particle.speciesMask * 2.0 - 1.0;

    for (int modX = -sensorSize; modX <= sensorSize; modX++) {
        int targetX = int(senseLocation.x) + modX;
        if (targetX < 0 || targetX >= screenWidth) continue;

        for (int modY = -sensorSize; modY <= sensorSize; modY++) {
            int targetY = int(senseLocation.y) + modY;
            if (targetY < 0 || targetY >= screenHeight) continue;

            int index = targetX + (targetY * screenWidth);
            vec4 val = texture2D(oldTrailMap, vec2(targetX / float(screenWidth), targetY / float(screenHeight)));
            sum += dot(senseWeight, val);
        }
    }

    int sensorArea = sensorSize == 0 ? 1 : (sensorSize + 2) * (sensorSize + 2);
    return sum / (maxTrailDensity * densitySpeed);
}

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(screenWidth, screenHeight);
    vec4 trailVal = texture2D(oldTrailMap, uv);
    vec4 val = trailVal / maxTrailDensity;

    // Particle behavior (mimicking compute shader logic)
    float angle = mod(val.r * 360.0, 360.0);
    float localSpeed = speed;
    float left = sense(Particle(uv, val), -senseAngle);
    float right = sense(Particle(uv, val), senseAngle);
    float straight = sense(Particle(uv, val), 0.0);

    float randomness = scaleToRange01(hash(uint(uv.x + uv.y * screenWidth)));

    if (straight > left && straight > right) {
        if (speedAffectedByTrailDensity) {
            localSpeed = speed * (straight / (maxTrailDensity / 4.0));
        }
    } else if (straight < left && straight < right) {
        angle = mod(angle + (randomness - 0.5) * 2.0 * steerStrength * deltaTime + 360.0, 360.0);
        if (speedAffectedByTrailDensity) {
            localSpeed = speed * ((left + right) * 0.5 / (maxTrailDensity / 4.0));
        }
    } else if (left > straight && left > right) {
        angle = mod(angle - (randomness * steerStrength * deltaTime + 360.0), 360.0);
        if (speedAffectedByTrailDensity) {
            localSpeed = speed * (left / (maxTrailDensity / 4.0));
        }
    } else if (right > straight && right > left) {
        angle = mod(angle + (randomness * steerStrength * deltaTime + 360.0), 360.0);
        if (speedAffectedByTrailDensity) {
            localSpeed = speed * (right / (maxTrailDensity / 4.0));
        }
    } else {
        if (speedAffectedByTrailDensity) {
            localSpeed = speed * 0.1;
        }
    }

    vec2 direction = vec2(cos(angle), sin(angle));
    vec2 newPos = uv + direction * localSpeed * deltaTime;

    // Boundary check and adjust angle
    if (newPos.x < 0.0 || newPos.x >= 1.0 || newPos.y < 0.0 || newPos.y >= 1.0) {
        newPos = uv;
        angle = mod(angle + 60.0, 360.0);
    }

    // Trail diffusion and decay
    vec4 sum = vec4(0.0);
    for (int modX = -1; modX <= 1; modX++) {
        for (int modY = -1; modY <= 1; modY++) {
            vec2 offset = vec2(modX, modY) / vec2(screenWidth, screenHeight);
            vec4 neighborVal = texture2D(oldTrailMap, uv + offset);
            sum += neighborVal;
        }
    }

    vec4 to = sum / 9.0;
    vec4 from = trailVal;
    vec4 diffusedVal = mix(to, from, diffuseRate);
    diffusedVal = max(vec4(0.0), diffusedVal - decayRate);

    // Set the color based on teamColor and trailVal
    float modR = max(0.0, diffusedVal.r - diffusedVal.g - diffusedVal.b - diffusedVal.a);
    float modG = max(0.0, diffusedVal.g - diffusedVal.r - diffusedVal.b - diffusedVal.a);
    float modB = max(0.0, diffusedVal.b - diffusedVal.g - diffusedVal.r - diffusedVal.a);
    float modA = max(0.0, diffusedVal.a - diffusedVal.g - diffusedVal.b - diffusedVal.r);

    vec4 chosenColor = baseColor;
    float weight = 1.0;
    if (diffusedVal.r > diffusedVal.g && diffusedVal.r > diffusedVal.b && diffusedVal.r > diffusedVal.a) {
        chosenColor = teamColor1;
        weight = modR;
    } else if (diffusedVal.g > diffusedVal.r && diffusedVal.g > diffusedVal.b && diffusedVal.g > diffusedVal.a) {
        chosenColor = teamColor2;
        weight = modG;
    } else if (diffusedVal.b > diffusedVal.r && diffusedVal.b > diffusedVal.g && diffusedVal.b > diffusedVal.a) {
        chosenColor = teamColor3;
        weight = modB;
    } else if (diffusedVal.a > diffusedVal.g && diffusedVal.a > diffusedVal.b && diffusedVal.a > diffusedVal.r) {
        chosenColor = teamColor4;
        weight = modA;
    }

    gl_FragColor = mix(baseColor, chosenColor, weight + decayRate);
}
