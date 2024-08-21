import { CANVAS, COLOR, SHADER } from "./settings";

/*-----------------------------------------------------------------------*/

let physarumShader;
let oldTrailMap, newTrailMap;

/*-----------------------------------------------------------------------*/

export const sketch = (p) => {
    p.preload = () => {
        physarumShader = p.loadShader(
            `${SHADER.PATH}.vert`,
            `${SHADER.PATH}.frag`,

            () => console.log("Shader loaded successfully"),
            (err) => console.error("Error loading shader:", err)
        );
    };

    /*--------------------*/

    p.setup = () => {
        p.createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT, p.WEBGL);
        p.frameRate(CANVAS.FRAME_RATE);

        init();
    };

    /*--------------------*/

    p.draw = () => {
        setShaderUniforms();

        physarumShader.setUniform("oldTrailMap", oldTrailMap);
        physarumShader.setUniform("newTrailMap", newTrailMap);

        newTrailMap.shader(physarumShader);
        newTrailMap.rect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

        p.translate(-CANVAS.WIDTH / 2, -CANVAS.HEIGHT / 2);
        p.image(newTrailMap, 0, 0);

        swap(newTrailMap, oldTrailMap);
    };

    /*--------------------*/

    const init = () => {
        oldTrailMap = createTrailMap(CANVAS.WIDTH, CANVAS.HEIGHT);
        newTrailMap = createTrailMap(CANVAS.WIDTH, CANVAS.HEIGHT);

        p.shader(physarumShader);
        p.textureMode(p.NORMAL);
    };

    const createTrailMap = (width, height) => {
        const map = p.createGraphics(width, height, p.WEBGL);
        map.pixelDensity(1);
        map.noStroke();

        return map;
    };

    /*--------------------*/

    const setShaderUniforms = () => {
        // Update uniforms for the shader
        physarumShader.setUniform("screenWidth", CANVAS.WIDTH);
        physarumShader.setUniform("screenHeight", CANVAS.HEIGHT);
        physarumShader.setUniform("decayRate", SHADER.UNIFORM.DECAY_RATE);
        physarumShader.setUniform("diffuseRate", SHADER.UNIFORM.DIFFUSE_RATE);
        physarumShader.setUniform("senseAngle", SHADER.UNIFORM.SENSE_ANGLE);
        physarumShader.setUniform(
            "steerStrength",
            SHADER.UNIFORM.STEER_STRENGTH
        );
        physarumShader.setUniform(
            "senseDistance",
            SHADER.UNIFORM.SENSE_DISTANCE_RATIO * (CANVAS.WIDTH + CANVAS.HEIGHT)
        );
        physarumShader.setUniform(
            "speed",
            SHADER.UNIFORM.SPEED_RATIO * (CANVAS.WIDTH + CANVAS.HEIGHT)
        );
        physarumShader.setUniform(
            "maxTrailDensity",
            SHADER.UNIFORM.MAX_TRAIL_DENSITY
        );
        physarumShader.setUniform("densitySpeed", SHADER.UNIFORM.DENSITY_SPEED);
        physarumShader.setUniform("sensorSize", SHADER.UNIFORM.SENSOR_SIZE);
        physarumShader.setUniform(
            "speedAffectedByTrailDensity",
            SHADER.UNIFORM.SPEED_AFFECTED_BY_TRAIL_DENSITY
        );
        physarumShader.setUniform("deltaTime", SHADER.UNIFORM.DELTA_TIME);

        // Apply colors
        physarumShader.setUniform("teamColor1", normalizeRGBA(COLOR.WHITE)); // Red
        physarumShader.setUniform("teamColor2", normalizeRGBA(COLOR.WHITE)); // Green
        physarumShader.setUniform("teamColor3", normalizeRGBA(COLOR.WHITE)); // Blue
        physarumShader.setUniform("teamColor4", normalizeRGBA(COLOR.WHITE)); // Yellow
        physarumShader.setUniform("baseColor", normalizeRGBA(COLOR.WHITE)); // Base gray

        // Set textures
        physarumShader.setUniform("oldTrailMap", oldTrailMap);
        physarumShader.setUniform("newTrailMap", newTrailMap);
    };

    const swap = (a, b) => {
        let temp = a;
        a = b;
        b = temp;

        return [a, b];
    };
};

const normalizeRGBA = (color) => {
    return color._array;
};
