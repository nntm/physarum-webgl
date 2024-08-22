precision mediump float;

uniform vec2 uResolution;
uniform sampler2D uAgents;   // Channel for Physarum agents
uniform sampler2D uPheromones; // Channel for pheromones
uniform int uFrame;

out vec4 fragColor;

#define dt 0.25
#define agentRadius 1.4
#define pheromoneDecay 0.15
#define gridSize uResolution.xy
#define getTexel(a, p) texelFetch(a, ivec2(p), 0)

float gaussian(vec2 x, float r) {
    return exp(-pow(length(x) / r, 2.0));
}

vec4 laplace(sampler2D tex, vec2 pos) {
    vec3 offset = vec3(-1, 0.0, 1);
    return getTexel(tex, pos + offset.xy) + getTexel(tex, pos + offset.yx) +
           getTexel(tex, pos + offset.zy) + getTexel(tex, pos + offset.yz) -
           4.0 * getTexel(tex, pos);
}

void main() {
    vec2 pos = gl_FragCoord.xy;
    vec4 pheromone = getTexel(uPheromones, pos);

    pheromone += dt * laplace(uPheromones, pos);

    vec4 agent = getTexel(uAgents, pos);
    float deposit = gaussian(pos - agent.xy, agentRadius);

    pheromone += dt * deposit;

    pheromone += -dt * pheromoneDecay * pheromone;

    if (uFrame < 1) pheromone = vec4(0);

    fragColor = pheromone;
}
