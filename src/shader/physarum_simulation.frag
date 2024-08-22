precision mediump float;

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uAgents;  // Channel for Physarum agents
uniform sampler2D uPheromones; // Channel for pheromones
uniform vec2 uMouse;
uniform int uFrame;

out vec4 fragColor;

#define dt 0.25
#define agentRadius 1.4
#define pheromoneDecay 0.15
#define gridSize uResolution.xy
#define getTexture(a, p) texture(a, p / gridSize)
#define getTexel(a, p) texelFetch(a, ivec2(p), 0)
#define PI 3.14159265

float agentSpeed = 6.0;
float sensorDistance = 10.0;
float sensorStrength = 10.0;
float sensorAngle = 0.3;

vec2 wrapPosition(vec2 pos) {
    return mod(pos + gridSize * 0.5, gridSize) - gridSize * 0.5;
}

vec2 wrapAround(vec2 pos) {
    return mod(pos, gridSize);
}

float randomFloat(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 randomVec2(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

void evaluateNeighbor(inout vec4 agent, vec2 pos, vec2 offset) {
    vec4 neighbor = getTexel(uAgents, wrapAround(pos + offset));
    if (length(wrapPosition(neighbor.xy - pos)) < length(wrapPosition(agent.xy - pos))) {
        agent = neighbor;
    }
}

void evaluateNeighborhood(inout vec4 agent, vec2 pos, float radius) {
    evaluateNeighbor(agent, pos, vec2(-radius, 0));
    evaluateNeighbor(agent, pos, vec2(radius, 0));
    evaluateNeighbor(agent, pos, vec2(0, -radius));
    evaluateNeighbor(agent, pos, vec2(0, radius));
}

void main() {
    vec2 pos = gl_FragCoord.xy;
    vec2 mouseNorm = uMouse / gridSize;

    if (length(mouseNorm) > 0.0) {
        sensorDistance *= mouseNorm.x;
        sensorStrength *= mouseNorm.y;
    } else {
        sensorDistance *= 0.8;
        sensorStrength *= 0.05;
    }

    vec4 agent = getTexel(uAgents, pos);

    evaluateNeighborhood(agent, pos, 1.0);
    evaluateNeighborhood(agent, pos, 2.0);
    evaluateNeighborhood(agent, pos, 3.0);
    evaluateNeighborhood(agent, pos, 4.0);
    evaluateNeighborhood(agent, pos, 5.0);

    agent.xy = wrapAround(agent.xy);

    if (length(agent.xy - pos) > 10.0)
        agent.xy += 1.0 * (randomVec2(pos) - 0.5);

    vec2 sensorLeft = agent.xy + sensorDistance * vec2(cos(agent.z + sensorAngle), sin(agent.z + sensorAngle));
    vec2 sensorRight = agent.xy + sensorDistance * vec2(cos(agent.z - sensorAngle), sin(agent.z - sensorAngle));

    float angleChange = (getTexture(uPheromones, sensorLeft).x - getTexture(uPheromones, sensorRight).x);
    agent.z += dt * sensorStrength * tanh(3.0 * angleChange);

    vec2 velocity = agentSpeed * vec2(cos(agent.z), sin(agent.z)) + 0.1 * (randomVec2(agent.xy + uTime) - 0.5);
    agent.xy += dt * velocity;

    agent.xy = wrapAround(agent.xy);

    if (uFrame < 1) {
        agent.xy = vec2(round(pos.x), round(pos.y));
        agent.zw = randomVec2(agent.xy) - 0.5;
    }

    fragColor = agent;
}
