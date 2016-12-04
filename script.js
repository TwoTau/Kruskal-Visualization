let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let options = document.getElementById("options");

let dimensions = {
    numput: document.getElementById("dimensions"),
    text: document.getElementById("sizeText")
}

let bias = {
    numput: document.getElementById("biasNumput"),
    slider: document.getElementById("bias"),
    text: document.getElementById("biasText")
};

let speed = {
    numput: document.getElementById("speedNumput"),
    slider: document.getElementById("speed")
};

let generateButton = document.getElementById("gen");

let size;
let blockSize;
let width;

let horBias;

let map = [];

let colors = [];

let beginTime;
function getTime() {
    return Math.round((new Date()).getTime() - beginTime);
}

let lastDrawTime;
let timeDelay = 22;

let isDone = false;

let filledBlockColor = "#111";

function getColorType() {
    var radios = document.getElementsByName("colorType");
    for(radio of radios) {
        if(radio.checked) {
            return radio.value;
        }
    }
}

function getBias() {
    return +bias.numput.value / -100;
}

function getSizeValue() {
    return dimensions.numput.value;
}

(function setup() {
    bias.numput.oninput = function() {
        bias.slider.value = this.value;
        if(this.value === "0") {
            bias.text.className = "";
        } else {
            bias.text.className = (+this.value < 0) ? "hor" : "vert";
        }
    };

    bias.slider.oninput = function() {
        bias.numput.value = this.value;
        if(this.value === "0") {
            bias.text.className = "";
        } else {
            bias.text.className = (+this.value < 0) ? "hor" : "vert";
        }
    };

    speed.numput.oninput = function() {
        speed.slider.value = this.value;
        timeDelay = 1000 / (this.value * 11 - 10);
        if(this.value === "5") {
            options.className = "";
        } else {
            options.className = (+this.value < 5) ? "slow" : "fast";
        }
    };

    speed.slider.oninput = function() {
        speed.numput.value = this.value;
        timeDelay = 1000 / (this.value * 11 - 10);
        if(this.value === "5") {
            options.className = "";
        } else {
            options.className = (+this.value < 5) ? "slow" : "fast";
        }
    };

    dimensions.numput.oninput = function() {
        if(this.value < 34) {
            dimensions.text.innerHTML = "Small";
        } else if(this.value < 68) {
            dimensions.text.innerHTML = "Medium";
        } else {
            dimensions.text.innerHTML = "Large";
        }
    };

    generateButton.onclick = function() {
        isDone = true;
        let sizeValue = +getSizeValue();
        setupGeneration(sizeValue, getColorType());
    }

    setupGeneration(47);
})();

function setupGeneration(_size, colorType) {
    isDone = false;

    colors = [];

    size = _size;

    blockSize = Math.floor((window.innerHeight - 5) / _size);
    if(blockSize < 1) blockSize = 1;

    width = size*blockSize;

    canvas.width = width;
    canvas.height = width;

    if(colorType === "verticalGradient") {
        getColor = getVertGradientColor;
    } else if(colorType === "horizontalGradient") {
        getColor = getHorGradientColor;
    } else {
        getColor = getRandomColor;
    }

    horBias = getBias();

    map = makeGridArray(_size);

    beginTime = (new Date()).getTime();

    lastDrawTime = -1000;

    console.log("setup");

    loop();
}

function loop() {
    if(getTime() - lastDrawTime > timeDelay) {
        if(iterateKruskal()) {
            isDone = true;
        }
        lastDrawTime = getTime();
    }
    if(isDone) {
        window.cancelAnimationFrame(loop);
        return;
    }
    window.requestAnimationFrame(loop);
}

function drawSquare(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x*blockSize, y*blockSize, blockSize, blockSize);
}

function hueToColor(hue) {
    return "hsl(" + hue + ",86%,60%)";
}

function getVertGradientColor(i, j) {
    let hue = 360 * (i * size + j) / (size*size - 1);
    colors[hue] = 1;
    return hue;
}

function getHorGradientColor(i, j) {
    return getVertGradientColor(j, i);
}

function getRandomColor(i, j) {
    let randHue = 0;

    while(colors[randHue]) {
        randHue = Math.floor(Math.random() * size * size) * 360 / (size*size);
    }
    colors[randHue] = 1;
    return randHue;
}

function getColor(i, j) {
    return getRandomColor(i, j);
}

function makeGridArray(nSize) {
    let array = [];
    for (let i = 0; i < nSize; i++) {
        array[i] = [];
        for (let j = 0; j < nSize; j++) {
            let filled = i % 2 === 0 || j % 2 === 0;
            let randHue = getColor(i, j);
            array[i][j] = {
                filled: filled,
                hue: randHue
            };
            if(!filled) {
                drawSquare(i, j, hueToColor(randHue));
            }
        }
    }
    return array;
}

function iterateKruskal() {
    let randomLoc = getRandomLocation();
    let randX = randomLoc.x;
    let randY = randomLoc.y;

    let dir = getRandomMovement();

    let wallX = randX + dir.x;
    let wallY = randY + dir.y;

    let connX = wallX + dir.x;
    let connY = wallY + dir.y;

    if(connX < 0 || connX > size - 1 || connY < 0 || connY > size - 1) {
        return iterateKruskal();
    }
    let originalCellhue = getHue(randX, randY);

    if(!isOpen(wallX, wallY) && getHue(connX, connY) !== originalCellhue) {
        openCell(wallX, wallY);

        let abundantHue = renumber(getHue(connX, connY), originalCellhue);

        setHue(wallX, wallY, abundantHue);
        drawSquare(wallX, wallY, hueToColor(abundantHue));

        colors[abundantHue] += 1;

        return false;
    }

    if(!isPerfectMaze()) {
        return iterateKruskal();
    }
    
    return true;

}

function getRandomLocation() {
    return {
        x: Math.floor(Math.random()*Math.floor(size/2))*2+1,
        y: Math.floor(Math.random()*Math.floor(size/2))*2+1
    };
}

function getRandomMovement() {
    let rand = Math.random();
    let bias = 0.5 + horBias;
    if(rand < bias/2) {
        return {x: - 1, y: 0};
    } else if(rand < bias) {
        return {x: 1, y: 0};
    } else if(rand < (1 - bias) / 2 + bias) {
        return {x: 0, y: - 1};
    }
    return {x: 0, y: 1};
}

function renumber(hue1, hue2) {
    let abundantHue;
    let overridenHue;
    if(colors[hue1] > colors[hue2]) {
        abundantHue = hue1;
        overridenHue = hue2;
    } else {
        abundantHue = hue2;
        overridenHue = hue1;
    }
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if(getHue(i, j) === overridenHue) {
                setHue(i, j, abundantHue);
                drawSquare(i, j, hueToColor(abundantHue));
            }
        }
    }
    colors[abundantHue] += colors[overridenHue];
    return abundantHue;
}

function openCell(x, y) {
    if(x > 0 && x < size - 1 && y > 0 && y < size - 1) {
        map[x][y].filled = false;
        return true;
    }
    return false;
}

function setHue(x, y, newHue) {
    map[x][y].hue = newHue;
}

function isOpen(x, y) {
    return !map[x][y].filled;
}

function getHue(x, y) {
    return map[x][y].hue;
}

function isPerfectMaze() {
    let firstSetNum = getHue(3, 3);
    for(let i = 0; i < size; i++) {
        for(let j = 0; j < size; j++) {
            if(isOpen(i, j) && getHue(i, j) !== firstSetNum) {
                return false;
            }
        }
    }
    return true;
}
