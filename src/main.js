import { CANVAS, COLOR, PHYSARUM } from "./settings";
import { vs_1, fs_1, vs_2, fs_2 } from "./shader";

/*-----------------------------------------------------------------------*/

let shader1, shader2;
let buffer1, buffer2;

let physarum;

/*-----------------------------------------------------------------------*/

export const sketch = (p) => {
    p.setup = () => {
        p.createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT, p.WEBGL);
        p.frameRate(CANVAS.FRAME_RATE);
        p.noStroke();

        init();
    };

    /*--------------------*/

    const init = () => {
        shader1 = p.createShader(vs_1, fs_1);
        shader2 = p.createShader(vs_2, fs_2);

        buffer1 = createBuffer(CANVAS.WIDTH, CANVAS.HEIGHT);
        buffer2 = createBuffer(CANVAS.WIDTH, CANVAS.HEIGHT);
    };

    const createBuffer = (width, height) => {
        const buffer = p.createGraphics(width, height, p.WEBGL);
        buffer.noStroke();
        buffer.pixelDensity(1);

        return buffer;
    };

    /*--------------------*/

    p.draw = () => {
        applyShader1();
        applyShader2();

        p.image(buffer1, 0, 0);
        p.image(buffer2, CANVAS.WIDTH / 2, CANVAS.WIDTH / 2);
    };

    /*--------------------*/

    const applyShader1 = () => {
        shader1.setUniform("uTexture0", buffer1);
        shader1.setUniform("uTexture1", buffer2);

        shader1.setUniform("speedMultiplier", 1.0);
        shader1.setUniform("randomSteerFactor", 0.2);
        shader1.setUniform("constantSteerFactor", 0.4);
        shader1.setUniform("searchRadius", 0.01);
        shader1.setUniform("senseAngle", 0.2);
        shader1.setUniform("trailStrength", 0.2);
        shader1.setUniform("vertexRadius", 1.0);
        shader1.setUniform("wallStrategy", PHYSARUM.WALL_STRATEGY.BOUNCE);
        shader1.setUniform("colorStrategy", PHYSARUM.COLOR_STRATEGY.GRAY);

        // Bind textures and draw with Shader 1
        buffer1.shader(shader1);
        buffer1.rect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    };

    /*--------------------*/

    const applyShader2 = () => {
        shader2.setUniform("uTexture0", buffer1);
        shader2.setUniform("uTexture1", buffer2);

        shader2.setUniform("uTime", p.millis() / 1000.0);
        shader2.setUniform("uFadeSpeed", PHYSARUM.FADE_SPEED);
        shader2.setUniform("uBlurFraction", PHYSARUM.BLUR_FRACTION);

        // Draw with Shader 2
        buffer2.shader(shader2);
        buffer2.rect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    };
};

/*-----------------------------------------------------------------------*/
/*-----------------------------------------------------------------------*/
/*-----------------------------------------------------------------------*/

class Physarum {
    constructor() {
        this.initAgents();
    }

    /*--------------------*/

    initAgents() {
        this.agents = [];

        for (let i = 0; i < PHYSARUM.NUM_AGENTS; i++) {}
    }
}

/*-----------------------------------------------------------------------*/

class Agent {
    constructor(x, y) {
        this.pos = { x: x, y: y };
        this;
    }
}
