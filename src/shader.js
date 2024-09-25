export const updateAgents_frag = `
// Input variables
in vec2 v_uv;

// Constants
#define TWO_PI 6.28318530718

// Uniforms
uniform sampler2D u_agentsDirection;    // Texture for agents' directions
uniform sampler2D u_agentsPositions;     // Texture for agents' positions
uniform sampler2D u_trail;               // Trail texture for sensing
uniform vec2 u_dimensions;                // Dimensions of the canvas
uniform float u_sensorAngle;              // Angle for sensing
uniform float u_sensorDistance;           // Distance for sensing
uniform float u_rotationAngle;            // Rotation angle
uniform bool u_randomDir;                 // Random direction flag
uniform float u_stepSize;                 // Step size for movement

// Outputs
layout(location = 0) out float out_direction; // Output direction at index 0
layout(location = 1) out vec4 out_position;   // Output position at index 1

// Function to sense the environment
float sense(vec2 position, float angle) {
    vec2 sensePosition = position + u_sensorDistance * vec2(cos(angle), sin(angle));
    return texture(u_trail, sensePosition / u_dimensions).x; // Sample trail texture
}

void main() {
    // Read the current direction of the agent
    float direction = texture(u_agentsDirection, v_uv).r;

    // Read the position and displacement of the agent
    vec4 positionInfo = texture(u_agentsPositions, v_uv);
    vec2 absolute = positionInfo.xy; // Absolute position (x, y)
    vec2 displacement = positionInfo.zw; // Displacement (z, w)
    
    // Calculate the next position based on the current position and displacement
    vec2 position = absolute + displacement;

    // Sense the environment to determine the rotation
    float middleState = sense(position, direction);
    float leftState = sense(position, direction + u_sensorAngle);
    float rightState = sense(position, direction - u_sensorAngle);

    // Determine weights based on sensor states
    float rightWeight = step(middleState, rightState);
    float leftWeight = step(middleState, leftState);

    // Update direction based on sensor readings and random direction flag
    direction += mix(
        rightWeight * mix(u_rotationAngle, -u_rotationAngle, float(u_randomDir)),
        mix(u_rotationAngle, -u_rotationAngle, rightWeight),
        abs(leftWeight - rightWeight)
    );

    // Wrap the direction around 2π
    direction = mod(direction + TWO_PI, TWO_PI);
    out_direction = direction; // Output the updated direction

    // Calculate the movement in the direction of the agent
    vec2 move = u_stepSize * vec2(cos(direction), sin(direction));
    vec2 nextDisplacement = displacement + move;

    // If the displacement is large enough, merge with absolute position to avoid floating point errors
    float shouldMerge = step(30.0, dot(nextDisplacement, nextDisplacement));
    absolute = mod(absolute + shouldMerge * nextDisplacement + u_dimensions, u_dimensions);
    nextDisplacement *= (1.0 - shouldMerge); // Retain remaining displacement

    // Implement boundary checks (bouncing logic can be added here if needed)
    if (absolute.x < 0.0 || absolute.x > u_dimensions.x) {
        absolute.x = clamp(absolute.x, 0.0, u_dimensions.x);
        nextDisplacement.x = -nextDisplacement.x; // Bounce off the horizontal edges
    }
    if (absolute.y < 0.0 || absolute.y > u_dimensions.y) {
        absolute.y = clamp(absolute.y, 0.0, u_dimensions.y);
        nextDisplacement.y = -nextDisplacement.y; // Bounce off the vertical edges
    }

    // Set the output position with updated absolute position and displacement
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
