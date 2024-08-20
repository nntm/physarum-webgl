import { CANVAS, COLOR } from "./settings";

export const sketch = (p) => {
    p.setup = () => {
        p.createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT);
        p.background(COLOR.BLACK);
    };

    p.draw = () => {};
};
