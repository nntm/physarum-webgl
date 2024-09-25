import {
    GPUComposer,
    GPULayer,
    GPUProgram,
    INT,
    BOOL,
    FLOAT,
    REPEAT,
    LINEAR,
    NEAREST,
    addValueProgram,
    renderAmplitudeProgram,
    CLAMP_TO_EDGE,
} from "gpu-io";
import { CANVAS } from "./settings";
import { updateAgents_frag, diffuseAndDecay_frag } from "./shader";
import { randomBoolean } from "./utils";

/*-----------------------------------------------------------------------*/

/*-----------------------------------------------------------------------*/

export const sketch = (contextID, glslVersion, params) => {
    let canvas;

    let agents;

    let composer;
    let posLayer, dirLayer, updateAgentsProgram;
    let trailLayer, depositProgram, diffuseAndDecayProgram;
    let renderer;

    const NUM_AGENTS = params.NUM_AGENTS;
    const POS_COMPONENTS = params.POS_COMPONENTS;
    const STARTING_ARRANGEMENT = params.STARTING_ARRANGEMENT;
    const SENSOR_ANGLE = params.SENSOR_ANGLE;
    const SENSOR_DISTANCE_FACTOR = params.SENSOR_DISTANCE_FACTOR;
    const ROTATION_ANGLE = params.ROTATION_ANGLE;
    const RANDOM_DIR = params.RANDOM_DIR;
    const STEP_SIZE = params.STEP_SIZE;
    const POINT_SIZE = params.POINT_SIZE;

    const DEPOSIT_AMOUNT = params.DEPOSIT_AMOUNT;
    const DECAY_FACTOR = params.DECAY_FACTOR;

    const RENDER_AMPLITUDE = params.RENDER_AMPLITUDE;

    const init = () => {
        initCanvas();

        initAgents();
        initTrails();

        initRenderer();
    };

    const initCanvas = () => {
        canvas = document.createElement("canvas");
        document.body.appendChild(canvas);

        canvas.width = CANVAS.WIDTH;
        canvas.height = CANVAS.HEIGHT;
    };

    const initAgents = () => {
        agents = {
            posArray: new Float32Array(NUM_AGENTS * POS_COMPONENTS),
            dirArray: new Float32Array(NUM_AGENTS),
        };

        initArrangements_Random();

        // The composer orchestrates all of the GPU operations.
        initComposer();

        // Init agents position & direction data on GPU.
        initAgentData();

        // Fragment shader program for updating agents position and direction.
        initUpdateAgentsProgram();
    };

    const initArrangements_Random = () => {
        for (let i = 0; i < NUM_AGENTS; i++) {
            // Random absolute position
            agents.posArray[POS_COMPONENTS * i] = Math.random() * CANVAS.WIDTH; // x
            agents.posArray[POS_COMPONENTS * i + 1] =
                Math.random() * CANVAS.HEIGHT; // y

            // Initial displacement is zero
            agents.posArray[POS_COMPONENTS * i + 2] = 0; // z (displacement)
            agents.posArray[POS_COMPONENTS * i + 3] = 0; // w (displacement)

            const direction = Math.random() * Math.PI * 2;
            agents.dirArray[i] = direction;
        }
    };

    const initArrangements_Ring = () => {
        const centerX = CANVAS.WIDTH / 4;
        const centerY = CANVAS.HEIGHT / 2;
        const radius = Math.min(CANVAS.WIDTH, CANVAS.HEIGHT) * 0.3; // Ring radius

        for (let i = 0; i < NUM_AGENTS; i++) {
            const angle = (i / NUM_AGENTS) * Math.PI * 2; // Evenly distribute around the circle

            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            // Set absolute position on the ring
            agents.posArray[POS_COMPONENTS * i] = x; // x position
            agents.posArray[POS_COMPONENTS * i + 1] = y; // y position

            // Initial displacement is zero
            agents.posArray[POS_COMPONENTS * i + 2] = 0; // z (displacement)
            agents.posArray[POS_COMPONENTS * i + 3] = 0; // w (displacement)

            // Tangent direction to the circle
            agents.dirArray[i] = angle + Math.PI / 2;
        }
    };

    const initArrangements_Origin = () => {
        const centerX = CANVAS.WIDTH / 2;
        const centerY = CANVAS.HEIGHT / 2;

        for (let i = 0; i < NUM_AGENTS; i++) {
            const angle = Math.random() * Math.PI * 2; // Random direction

            // All agents start at the center
            agents.posArray[POS_COMPONENTS * i] = centerX; // x position
            agents.posArray[POS_COMPONENTS * i + 1] = centerY; // y position

            // Initial displacement is zero
            agents.posArray[POS_COMPONENTS * i + 2] = 0; // z (displacement)
            agents.posArray[POS_COMPONENTS * i + 3] = 0; // w (displacement)

            // Random direction
            agents.dirArray[i] = angle;
        }
    };

    const initComposer = () => {
        composer = new GPUComposer({ canvas, glslVersion, contextID });
    };

    const initAgentData = () => {
        posLayer = new GPULayer(composer, {
            name: "posLayer",
            dimensions: NUM_AGENTS,
            numComponents: POS_COMPONENTS,
            type: FLOAT,
            numBuffers: 2,
            array: agents.posArray,
        });

        dirLayer = new GPULayer(composer, {
            name: "dirLayer",
            dimensions: NUM_AGENTS,
            numComponents: 1,
            type: FLOAT,
            numBuffers: 2,
            array: agents.dirArray,
        });
    };

    const initUpdateAgentsProgram = () => {
        updateAgentsProgram = new GPUProgram(composer, {
            name: "updateAgents",
            fragmentShader: updateAgents_frag,
            uniforms: [
                {
                    // Index of agentsHeading GPULayer in "input" array.
                    name: "u_agentsDirection",
                    value: 0,
                    type: INT,
                },
                {
                    // Index of agentsPositions GPULayer in "input" array.
                    name: "u_agentsPositions",
                    value: 1,
                    type: INT,
                },
                {
                    // Index of trail GPULayer in "input" array.
                    name: "u_trail",
                    value: 2,
                    type: INT,
                },
                {
                    name: "u_dimensions",
                    value: [CANVAS.WIDTH, CANVAS.HEIGHT],
                    type: FLOAT,
                },
                {
                    name: "u_sensorAngle",
                    value: (SENSOR_ANGLE * Math.PI) / 180,
                    type: FLOAT,
                },
                {
                    name: "u_sensorDistance",
                    value:
                        SENSOR_DISTANCE_FACTOR * (CANVAS.WIDTH + CANVAS.HEIGHT),
                    type: FLOAT,
                },
                {
                    name: "u_rotationAngle",
                    value: (ROTATION_ANGLE * Math.PI) / 180,
                    type: FLOAT,
                },
                {
                    name: "u_randomDir",
                    value: RANDOM_DIR,
                    type: BOOL,
                },
                {
                    name: "u_stepSize",
                    value: STEP_SIZE,
                    type: FLOAT,
                },
            ],
        });
    };

    const initTrails = () => {
        // Init a GPULayer to contain trail data.
        initTrailData();

        // Fragment shader program for adding chemical attractant
        // from particles to trail layer.
        initDepositProgram();

        // Fragment shader program for diffusing trail state.
        initDiffuseAndDecayProgram();
    };

    const initTrailData = () => {
        trailLayer = new GPULayer(composer, {
            name: "trail",
            dimensions: [CANVAS.WIDTH, CANVAS.HEIGHT],
            numComponents: 1,
            type: FLOAT,
            filter: LINEAR,
            numBuffers: 2,
            wrapX: CLAMP_TO_EDGE,
            wrapY: CLAMP_TO_EDGE,
        });
    };

    const initDepositProgram = () => {
        depositProgram = addValueProgram(composer, {
            name: "deposit",
            type: trailLayer.type,
            value: DEPOSIT_AMOUNT,
        });
    };

    const initDiffuseAndDecayProgram = () => {
        diffuseAndDecayProgram = new GPUProgram(composer, {
            name: "diffuseAndDecay",
            fragmentShader: diffuseAndDecay_frag,
            uniforms: [
                {
                    // Index of trail GPULayer in "input" array.
                    name: "u_trail",
                    value: 0, // We don't even really need to set this uniform, bc all uniforms default to zero.
                    type: INT,
                },
                {
                    name: "u_decayFactor",
                    value: DECAY_FACTOR,
                    type: FLOAT,
                },
                {
                    name: "u_pxSize",
                    value: [1 / CANVAS.WIDTH, 1 / CANVAS.HEIGHT],
                    type: FLOAT,
                },
            ],
        });
    };

    const renderPalette = (
        composer,
        defaultAmplitude = 1,
        defaultPalette = 0,
        components = "x"
    ) => {
        return new GPUProgram(composer, {
            name: "renderPalette",
            fragmentShader: `
in vec2 v_uv;
uniform sampler2D u_state;
uniform float u_amplitude;
uniform int u_palette;
out vec4 out_color;

const vec3 table[4] = vec3[4](vec3(1,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.0,0.33,0.67));

vec3 pal(in float t,in int i) {
    vec3 a = table[i * 4];
    vec3 b = table[i * 4 + 1];
    vec3 c = table[i * 4 + 2];
    vec3 d = table[i * 4 + 3];

    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    float val = u_amplitude * texture(u_state, v_uv).x;
    vec3 col = pal(val, u_palette);
    out_color = vec4(col, 1);
}
		`,
            uniforms: [
                {
                    name: "u_amplitude",
                    value: defaultAmplitude,
                    type: FLOAT,
                },
                {
                    name: "u_palette",
                    value: defaultPalette,
                    type: INT,
                },
            ],
        });
    };

    const initRenderer = () => {
        renderer = renderAmplitudeProgram(composer, {
            name: "renderer",
            type: trailLayer.type,
            components: "x",
            scale: RENDER_AMPLITUDE,
        });

        renderer = renderPalette(
            composer,
            RENDER_AMPLITUDE,
            Math.floor(Math.random() * 1)
        );
    };

    /*-------------------*/

    const update = () => {
        window.requestAnimationFrame(update);

        if (RANDOM_DIR)
            updateAgentsProgram.setUniform("u_randomDir", randomBoolean());

        composer.step({
            program: updateAgentsProgram,
            input: [dirLayer, posLayer, trailLayer],
            output: [dirLayer, posLayer],
        });

        composer.drawLayerAsPoints({
            layer: posLayer,
            program: depositProgram,
            input: trailLayer,
            output: trailLayer,
            pointSize: POINT_SIZE,
            wrapX: CLAMP_TO_EDGE,
            wrapY: CLAMP_TO_EDGE,
        });

        composer.step({
            program: diffuseAndDecayProgram,
            input: trailLayer,
            output: trailLayer,
        });

        composer.step({
            program: renderer,
            input: trailLayer,
        });
    };

    return { init, update };
};
