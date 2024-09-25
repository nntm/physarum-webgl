import { random, randomBoolean } from "./utils";

export const CANVAS = {
    WIDTH: window.innerWidth,
    HEIGHT: window.innerHeight,
    FRAME_RATE: 60,
};

export const COLOR = {
    BLACK: 0,
    WHITE: 255,
};

export const PARAMS = {
    NUM_AGENTS: 2000000,
    POS_COMPONENTS: 4,
    STARTING_ARRANGEMENT: 0,
    SENSOR_ANGLE: 60,
    SENSOR_DISTANCE_FACTOR: 0.008,
    ROTATION_ANGLE: 60,
    RANDOM_DIR: true,
    STEP_SIZE: 8,
    POINT_SIZE: 1,

    DEPOSIT_AMOUNT: 2,
    DECAY_FACTOR: 0.88,

    RENDER_AMPLITUDE: 0.12,
};
