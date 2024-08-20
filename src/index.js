import { CANVAS, COLOR } from "./settings";

new p5((p) => {
    p.setup = () => {
        p.createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT);
        p.background(COLOR.BLACK);
    };

    p.draw = () => {};
});
