export const updateAgents_frag = `
in vec2 v_uv;

#define TWO_PI 6.28318530718

uniform sampler2D u_agentsDirection;
uniform sampler2D u_agentsPositions;
uniform sampler2D u_trail;
uniform vec2 u_dimensions;
uniform float u_sensorAngle;
uniform float u_sensorDistance;
uniform float u_rotationAngle;
uniform bool u_randomDir;
uniform float u_stepSize;

layout (location = 0) out float out_direction; // Output at index 0.
layout (location = 1) out vec4 out_position; // Output at index 1.

float sense(vec2 position, float angle) {
    vec2 sensePosition = position + u_sensorDistance * vec2(cos(angle), sin(angle));
    return texture(u_trail, sensePosition / u_dimensions).x;
}

void main() {
    float direction = texture(u_agentsDirection, v_uv).r;

    // Add absolute position plus displacement to get position.
    vec4 positionInfo = texture(u_agentsPositions, v_uv);
    // Add absolute position plus displacement to get position.
    vec2 absolute = positionInfo.xy;
    vec2 displacement = positionInfo.zw;
    vec2 position = absolute + displacement;
    // Get location of particle in trail state (different that v_uv, which is UV coordinate in agents arrays).
    vec2 trailUV = position / u_dimensions;

    // Sense and rotate.
    float middleState = sense(position, direction);
    float leftState = sense(position, direction + u_sensorAngle);
    float rightState = sense(position, direction - u_sensorAngle);
    // Using some tricks here to remove conditionals (they cause significant slowdowns).
    // Leaving the old code here for clarity, replaced by the lines below.
        // if (middleState > rightState && middleState < leftState) {
        // 	// Rotate left.
        // 	direction += u_rotationAngle;
        // } else if (middleState < rightState && middleState > leftState) {
        // 	// Rotate right.
        // 	direction -= u_rotationAngle;
        // } else if (middleState < rightState && middleState < leftState) {
        // 	// Choose randomly.
        // 	direction += u_rotationAngle * (u_randomDir ? 1.0 : -1.0);
        // } // else do nothing.
    // The following lines give the same result without conditionals.
    float rightWeight = step(middleState, rightState);
    float leftWeight = step(middleState, leftState);
    direction += mix(
        rightWeight * mix(u_rotationAngle, -u_rotationAngle, float(u_randomDir)),
        mix(u_rotationAngle, -u_rotationAngle, rightWeight),
        abs(leftWeight - rightWeight)
    );

    // Wrap direction around 2PI.
    direction = mod(direction + TWO_PI, TWO_PI);
    out_direction = direction;

    // Move in direction of direction.
    vec2 move = u_stepSize * vec2(cos(direction), sin(direction));
    vec2 nextDisplacement = displacement + move;
    
    // If displacement is large enough, merge with abs position.
    // This method reduces floating point error in position.
    // Using some tricks here to remove conditionals (they cause significant slowdowns).
    // Leaving the old code here for clarity, replaced by the lines below.
        // if (dot(nextDisplacement, nextDisplacement) > 30.0) {
        // 	absolute += nextDisplacement;
        // 	nextDisplacement = vec2(0);
        // 	// Also check if we've wrapped.
        // 	if (absolute.x < 0.0) {
        // 		absolute.x = absolute.x + u_dimensions.x;
        // 	} else if (absolute.x >= u_dimensions.x) {
        // 		absolute.x = absolute.x - u_dimensions.x;
        // 	}
        // 	if (absolute.y < 0.0) {
        // 		absolute.y = absolute.y + u_dimensions.y;
        // 	} else if (absolute.y >= u_dimensions.y) {
        // 		absolute.y = absolute.y - u_dimensions.y;
        // 	}
        // }
    
    // The following lines give the same result without conditionals.
    float shouldMerge = step(30.0, dot(nextDisplacement, nextDisplacement));
    absolute = mod(absolute + shouldMerge * nextDisplacement + u_dimensions, u_dimensions);
    nextDisplacement *= (1.0 - shouldMerge);

    out_position = vec4(absolute, nextDisplacement);
}
    `;

export const diffuseAndDecay_frag = `
in vec2 v_uv;

uniform sampler2D u_trail;
uniform float u_decayFactor;
uniform vec2 u_pxSize;

out float out_state;

void main() {
    vec2 halfPx = u_pxSize / 2.0;
    // Use built-in linear interpolation to reduce 9 samples to 4.
    // This is not the same as the flat kernel described in Jones 2010.
    // This kernel has weighting:
    // 1/16 1/8 1/16
    // 1/8  1/4  1/8
    // 1/16 1/8 1/16
    float prevStateNE = texture(u_trail, v_uv + halfPx).x;
    float prevStateNW = texture(u_trail, v_uv + vec2(-halfPx.x, halfPx.y)).x;
    float prevStateSE = texture(u_trail, v_uv + vec2(halfPx.x, -halfPx.y)).x;
    float prevStateSW = texture(u_trail, v_uv - halfPx).x;
    float diffusedState = (prevStateNE + prevStateNW + prevStateSE + prevStateSW) / 4.0;
    out_state = u_decayFactor * diffusedState;
}
    `;
