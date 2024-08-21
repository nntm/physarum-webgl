export const CANVAS = {
    WIDTH: window.innerWidth,
    HEIGHT: window.innerHeight,
    FRAME_RATE: 60,
};

export const COLOR = {
    BLACK: 0,
    WHITE: 255,
};

export const SHADER = {
    PATH: "shader/physarum",

    UNIFORM: {
        DECAY_RATE: 0.02,
        DIFFUSE_RATE: 0.8,
        SENSE_ANGLE: Math.PI / 4,
        STEER_STRENGTH: 0.05,
        SENSE_DISTANCE_RATIO: 0.0032,
        SPEED_RATIO: 0.00032,
        MAX_TRAIL_DENSITY: 1,
        DENSITY_SPEED: 0.5,
        SENSOR_SIZE: 1,
        SPEED_AFFECTED_BY_TRAIL_DENSITY: true,
        DELTA_TIME: 0.01,
    },
};
