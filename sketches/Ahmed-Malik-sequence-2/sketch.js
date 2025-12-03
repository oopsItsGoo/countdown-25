import { createEngine } from "../_shared/engine.js";
import { Spring } from "../_shared/spring.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;

let DEBUG = true;

window.addEventListener("resize", () => {
  updateSizes();
});

function updateSizes() {
  //TODO
}

const State = {
  WaitingForInput: "waitingForInput",
  Interactive: "interactive",
  Falling: "falling",
  Finished: "finished",
};
let currentState = State.WaitingForInput;
let startInputX = 0;

/* ------------------------------ load SVG --------------------------------*/
const back = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

const paper = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  isHovered: false,
  isDragging: false,
  rect: {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  },
};

const two = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  width: 0,
  height: 0,
  opacity: 0.6,
  onSkin: false,
};

// load back svg
const backSVG = new Image();
backSVG.src = "/Assets/SVG/back.svg";
back.loaded = false;
backSVG.onload = () => {
  back.loaded = true;
  back.svg = backSVG;
  back.ratio = backSVG.naturalHeight / backSVG.naturalWidth;
  back.height = canvas.height * 1.1;
  back.width = (canvas.height * 1.1) / back.ratio;
  back.x = canvas.width / 2 - back.width / 2;
  back.y = canvas.height / 2 - back.height / 2;
  checkIfReady();
};

//load paper svg
const paperSVG = new Image();
paperSVG.src = "/Assets/SVG/paper.svg";
paper.loaded = false;
paperSVG.onload = () => {
  paper.loaded = true;
  paper.svg = paperSVG;
  paper.width = paperSVG.width;
  paper.height = paperSVG.height;
  (paper.ratio = paperSVG.naturalHeight / paperSVG.naturalWidth),
    console.log("paper loaded:", paper.width, paper.height, paper.x, paper.y);
  paper.x = canvas.width * 0.85;
  paper.y = canvas.height * 0.33;
  paper.rect = {
    x: paper.x - paper.width / 2,
    y: paper.y - paper.height / 2,
    w: paper.width,
    h: paper.height,
  };
  checkIfReady();
};

//load 2 svg
const twoSVG = new Image();
twoSVG.src = "/Assets/SVG/2.svg";
two.loaded = false;
twoSVG.onload = () => {
  //TODO
  checkIfReady();
};
twoSVG.onload = () => {
  two.loaded = true;
  two.svg = twoSVG;
  two.ratio = twoSVG.naturalHeight / twoSVG.naturalWidth;
  two.width = twoSVG.width;
  two.height = twoSVG.height;
  two.x = canvas.width / 2;
  two.y = canvas.height / 2;
  checkIfReady();
};

function checkIfReady() {
  if (back.loaded && paper.loaded && two.loaded) {
    console.log("All SVGs loaded:");
    two.height = paper.height * 0.5;
    two.width = two.height / two.ratio;
    run(update);
  }
}

function update(dt) {
  let nextState = undefined;
  switch (currentState) {
    case State.WaitingForInput: {
      if (input.hasStarted()) {
        startInputX = input.getX();
        nextState = State.Interactive;
      }
      break;
    }

    case State.Interactive: {
      nextState = State.Falling;
      break;
    }

    case State.Falling: {
      const drag = 0.1;
      const gravity = canvas.height * 3;
      break;
    }

    case State.Finished: {
      break;
    }
  }

  if (nextState !== undefined) {
    currentState = nextState;
    switch (currentState) {
      case State.Finished:
        finish();
        break;
      case State.Interactive:
        break;
      case State.Falling:
        break;
    }
    // change state
  }

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // draw back svg
  drawBack();

  DEBUGMODE();

  updatePaper();

  DEBUG_TwoRectangle();
  DEBUG_BackRectangle();

  updateTwo();
}

/**
 * function that updates two position and color depending if it's on the skin or on the paper
 */
function updateTwo() {
  two.height = paper.height * 0.5;
  two.width = two.height / two.ratio;

  if (two.onSkin) {
    two.opacity = 1;
  } else {
    two.opacity = 0.6;
    two.x = paper.x;
    two.y = paper.y;
  }

  drawTwo();
}

function drawBack() {
  ctx.save();
  ctx.drawImage(back.svg, back.x, back.y, back.width, back.height);
  ctx.restore();
}

function drawTwo() {
  ctx.save();

  ctx.globalAlpha = two.opacity; // Set opacity (0.0 to 1.0)

  ctx.drawImage(
    two.svg,
    two.x - two.width / 2,
    two.y - two.height / 2,
    two.width,
    two.height
  );

  ctx.restore(); // Restore to reset globalAlpha
}

function drawPaper() {
  ctx.save();

  ctx.drawImage(
    paper.svg,
    paper.x - paper.width / 2,
    paper.y - paper.height / 2,
    paper.width,
    paper.height
  );
  ctx.restore();
}
function updatePaper() {
  paper.rect = {
    x: paper.x - paper.width / 2,
    y: paper.y - paper.height / 2,
    w: paper.width,
    h: paper.height,
  };

  paper.isHovered = paperIsHovered();

  paper.height = back.height * 0.3;
  paper.width = paper.height / paper.ratio;

  if (input.isPressed()) {
    if (!paper.isDragging && paper.isHovered) {
      paper.isDragging = true;
    }
  } else if (paper.isDragging) {
    paper.isDragging = false;
  }

  if (paper.isDragging) {
    paper.x = input.getX();
    paper.y = input.getY();
  }

  drawPaper();
}

function paperIsHovered() {
  if (
    input.getX() >= paper.rect.x &&
    input.getX() < paper.rect.x + paper.rect.w &&
    input.getY() >= paper.rect.y &&
    input.getY() < paper.rect.y + paper.rect.h
  ) {
    return true;
  } else {
    return false;
  }
}
function findNextState() {}

/* TODO ---------------------- Make that when we leave the two over the body it stays. 
Then make the pixels that overlap between the 2 and and the body stay on the body and the rest make alpha = 0 ------------*/
function twoPixels() {
  const twoCanvas = document.createElement("canvas");
  twoCanvas.width = canvas.width;
  twoCanvas.height = canvas.height;
  const twoCtx = threeCanvas.getContext("2d");
  twoCtx.clearRect(0, 0, canvas.width, canvas.height);

  twoCtx.drawImage(two.svg, two.x, two.y, two.width, two.height);
  const imageData = twoCtx.getImageData(0, 0, canvas.width, canvas.height);

  //TODO check pixels the two is in
  window.twoPixelsIsActive = (x, y) => {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
    const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
    return imageData.data[index + 3] > 128;
  };
}

function backPixels() {
  const backCanvas = document.createElement("canvas");
  backCanvas.width = canvas.width;
  backCanvas.height = canvas.height;
  const backCtx = threeCanvas.getContext("2d");
  backCtx.clearRect(0, 0, canvas.width, canvas.height);

  backCtx.drawImage(back.svg, back.x, back.y, back.width, back.height);
  const imageData = backCtx.getImageData(0, 0, canvas.width, canvas.height);

  //TODO check pixels the back is in
  window.BackPixelsIsActive = (x, y) => {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
    const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
    return imageData.data[index + 3] > 128;
  };
}
/* finsih TODO */

/* --------------------------- DEBUG ----------------------------------- */
function DEBUGMODE() {
  if (!DEBUG) return;
  console.log("### DEBUG MODE ACTIVE");
  console.log("### DEBUG MOUSE X Y :", input.getX(), input.getY());

  drawPaperRectangleDebug();
}

function drawPaperRectangleDebug() {
  if (!DEBUG) return;
  console.log("### DEBUG RECTANGLE DRAW");

  ctx.beginPath();
  const debugRect = paper.rect;
  console.log("### DEBUG RECTANGLE:", debugRect);

  ctx.rect(debugRect.x, debugRect.y, debugRect.w, debugRect.h);
  ctx.fillStyle = paper.isHovered ? "green" : "red";
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.stroke();
}

function DEBUG_TwoRectangle() {
  if (!DEBUG) return;
  console.log("### DEBUG RECTANGLE TWO DRAW");

  ctx.beginPath();
  const debugRect = {
    x: two.x - two.width / 2,
    y: two.y - two.height / 2,
    w: two.width,
    h: two.height,
  };
  console.log("### DEBUG RECTANGLE TWO:", debugRect);
  ctx.rect(debugRect.x, debugRect.y, debugRect.w, debugRect.h);
  ctx.fillStyle = paper.isHovered ? "green" : "red";
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.stroke();
}

function DEBUG_BackRectangle() {
  if (!DEBUG) return;
  console.log("### DEBUG RECTANGLE BACK DRAW");

  ctx.beginPath();
  const debugRect = {
    x: back.x + 0.1 * back.width,
    y: back.y + 0.1 * back.height,
    w: back.width * 0.8,
    h: back.height * 0.8,
  };
  console.log("### DEBUG RECTANGLE TWO:", debugRect);

  ctx.rect(debugRect.x, debugRect.y, debugRect.w, debugRect.h);
  ctx.fillStyle = paper.isHovered ? "green" : "red";
  //ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = "blue";
  ctx.stroke();
}
