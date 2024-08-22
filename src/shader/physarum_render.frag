precision mediump float;

uniform vec2 uResolution;
uniform sampler2D uAgents;   // Channel for Physarum agents
uniform sampler2D uPheromones; // Channel for pheromones
uniform int uFrame;

out vec4 fragColor;

#define agentRadius 1.4
#define getTexel(a, p) texelFetch(a, ivec2(p), 0)

float gaussian(vec2 x, float r) {
    return exp(-pow(length(x) / r, 2.0));
}

void main() {
    vec2 pos = gl_FragCoord.xy;
    vec4 agent = getTexel(uAgents, pos);
    float deposit = gaussian(pos - agent.xy, agentRadius);
    vec4 pheromone = 2.5 * getTexel(uPheromones, pos);
    fragColor = vec4(sin(pheromone.xyz * vec3(1.0, 1.2, 1.5)), 1.0);
}
