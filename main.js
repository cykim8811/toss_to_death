const robot = require("robotjs");
const Jimp = require("jimp");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


const threshold = 128;
function processTile(pic) {
    let left = pic.width, right = 0, top = pic.height, bottom = 0;
    const buffer_width = Math.ceil(pic.width / 16) * 16;
    for (let i = 0; i < pic.image.length; i += 4) {
        if (i % (buffer_width * 4) >= pic.width * 4) continue;  // Skip empty pixels
        const x = (i / 4) % buffer_width;
        const y = Math.floor((i / 4) / buffer_width);

        const pixel = readPixel(pic, x, y);
        if (pixel.r < threshold && pixel.g < threshold && pixel.b < threshold) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
        }
    }
    return { left, right, top, bottom };
}

function readPixel(pic, x, y) {
    const buffer_width = Math.ceil(pic.width / 16) * 16;
    const i = (y * buffer_width + x) * 4;
    return {
        r: pic.image.readUInt8(i),
        g: pic.image.readUInt8(i + 1),
        b: pic.image.readUInt8(i + 2),
        a: pic.image.readUInt8(i + 3)
    };
}


const rect = {
    left: 20,
    top: 480,
    width: 570,
    height: 680
};

async function run(side) {
    const length = Math.floor(rect.width / side * 0.8);
    console.log(length);
    const data = [];
    let avg_width = 0;
    let avg_height = 0;
    for (let i = 0; i < side; i++) {
        for (let j = 0; j < side; j++) {
            const x = Math.floor(rect.left + (i + 0.5) * rect.width / side);
            const y = Math.floor(rect.top + (j + 0.5) * rect.height / side);
            const screen = robot.screen.capture(x - length / 2, y - length / 2, length, length);
            const { left, right, top, bottom } = processTile(screen);
            data.push({ x, y, left, right, top, bottom, screen });
            avg_width += right - left;
            avg_height += bottom - top;
        }
    }
    avg_width /= data.length;
    avg_height /= data.length;
    avg_width = Math.floor(avg_width);
    avg_height = Math.floor(avg_height);

    const correlation = [];
    for (let i = 0; i < data.length; i++) {
        const j = (i + 1 * side) % data.length;
        const k = (i + 2 * side) % data.length;

        let sum = 0;
        for (let ix = 0; ix < avg_width; ix++) {
            for (let iy = 0; iy < avg_height; iy++) {
                const pixel_i = readPixel(data[i].screen, data[i].left + ix, data[i].top + iy);
                const pixel_j = readPixel(data[j].screen, data[j].left + ix, data[j].top + iy);
                sum += Math.abs(pixel_i.r - pixel_j.r) + Math.abs(pixel_i.g - pixel_j.g) + Math.abs(pixel_i.b - pixel_j.b);
            }
        }
        for (let ix = 0; ix < avg_width; ix++) {
            for (let iy = 0; iy < avg_height; iy++) {
                const pixel_i = readPixel(data[i].screen, data[i].left + ix, data[i].top + iy);
                const pixel_k = readPixel(data[k].screen, data[k].left + ix, data[k].top + iy);
                sum += Math.abs(pixel_i.r - pixel_k.r) + Math.abs(pixel_i.g - pixel_k.g) + Math.abs(pixel_i.b - pixel_k.b);
            }
        }
        correlation.push(sum);
    }
    console.log(correlation);
    const max_index = correlation.indexOf(Math.max(...correlation));
    console.log(max_index);
    const x = data[max_index].x;
    const y = data[max_index].y;
    robot.moveMouse(x, y);
    await sleep(200);
    robot.mouseClick();

}


(async () => {
    await run(3);
    await sleep(2000);
    await run(4);
})();


/*
58368
114 * 114 = 12996
12996 * 4 = 51984
58368 - 51984 = 6384
6384 / 114 = 56
*/
