import {
    GPUComposer,
    GPULayer,
    GPUProgram,
    INT,
    BOOL,
    FLOAT,
    REPEAT,
    LINEAR,
    addValueProgram,
    renderAmplitudeProgram,
} from "gpu-io";
import { CANVAS, RANDOM } from "./settings";
import { updateAgents_frag, diffuseAndDecay_frag } from "./shader";
import { randomBoolean } from "./utils";

/*-----------------------------------------------------------------------*/

let canvas;

let agents;

let composer;
let posLayer, dirLayer, updateAgentsProgram;
let trailLayer, depositProgram, diffuseAndDecayProgram;
let renderer;

/*-----------------------------------------------------------------------*/

export const sketch = (contextID, glslVersion, params) => {
    const NUM_AGENTS = params.NUM_AGENTS;
    const POS_COMPONENTS = params.POS_COMPONENTS;
    const STARTING_ARRANGEMENT = params.STARTING_ARRANGEMENT;
    const SENSOR_ANGLE = params.SENSOR_ANGLE;
    const SENSOR_DISTANCE = params.SENSOR_DISTANCE;
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

        initArrangements_Origin();

        // The composer orchestrates all of the GPU operations.
        initComposer();

        // Init agents position & direction data on GPU.
        initAgentData();

        // Fragment shader program for updating agents position and direction.
        initUpdateAgentsProgram();
    };

    const initArrangements_Random = () => {
        for (let i = 0; i < NUM_AGENTS; i++) {
            agents.posArray[POS_COMPONENTS * i] = Math.random() * CANVAS.WIDTH;
            agents.posArray[POS_COMPONENTS * i + 1] =
                Math.random() * CANVAS.HEIGHT;

            agents.dirArray[i] = Math.random() * Math.PI * 2;
        }
    };

    const initArrangements_Ring = () => {
        // var a = (index * Math.PI * 2) / (n * 4); // angle
        // var d = 0.7; //Math.random()*0.7; // dist to center
        // var x = Math.sin(a) * d;
        // var y = -Math.cos(a) * d;
        // if (index % 4 == 0) {
        //     return x;
        // } //x
        // if (index % 4 == 1) {
        //     return y;
        // }
        // if (index % 4 == 3) {
        //     return 1 + (a + Math.PI / 2) / 1000;
        // } // direction

        for (let i = 0; i < NUM_AGENTS; i++) {
            const angle = i * Math.PI * 2;

            agents.posArray[POS_COMPONENTS * i] = Math.random() * CANVAS.WIDTH;
            agents.posArray[POS_COMPONENTS * i + 1] =
                Math.random() * CANVAS.HEIGHT;

            agents.dirArray[i] = Math.random() * Math.PI * 2;
        }
    };

    const initArrangements_Origin = () => {
        // var a = (index * Math.PI * 2) / (n * 4); // angle
        // var x = 0;
        // var y = 0;
        // if (index % 4 == 0) {
        //     return x;
        // } //x
        // if (index % 4 == 1) {
        //     return y;
        // }
        // if (index % 4 == 3) {
        //     return 1 + (a + Math.PI / 2) / 1000;
        // } // direction

        for (let i = 0; i < NUM_AGENTS; i++) {
            const angle = Math.random() * Math.PI * 2;

            agents.posArray[POS_COMPONENTS * i] = CANVAS.WIDTH / 2;
            agents.posArray[POS_COMPONENTS * i + 1] = CANVAS.HEIGHT / 2;
            agents.posArray[POS_COMPONENTS * i + 2] = Math.random();
            agents.posArray[POS_COMPONENTS * i + 3] = Math.random();

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
                    name: "u_agentsHeading",
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
                    value: SENSOR_DISTANCE,
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
            wrapX: REPEAT,
            wrapY: REPEAT,
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

    const initRenderer = () => {
        renderer = renderAmplitudeProgram(composer, {
            name: "renderer",
            type: trailLayer.type,
            components: "x",
            scale: RENDER_AMPLITUDE,
        });
    };

    /*-------------------*/

    const draw = () => {
        window.requestAnimationFrame(draw);

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
            wrapX: true,
            wrapY: true,
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

    return { init, draw };
};
