import { createEngine } from "../_shared/engine.js";
import { createSpringSettings, Spring } from "../_shared/spring.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;

/* ------------- SETUP ------------- */
// Hair parameters
const hairNumber = 3000;
const maxAttempts = 20000;
const maxHairLength = 50;
const minHairLength = 30;
const hairPaths = [];

// load threeSVG as image
let threeMaskScale = 0.35;
let threeMaskAspect;
let threeMaskXFrac = 0.55;
let threeMaskYFrac = 0.15;
let threeMaskRect = { x: 0, y: 0, w: 0, h: 0 };

const threeMaskSVG = new Image();
threeMaskSVG.src = "/Assets/SVG/3-mask.svg";
let maskLoaded = false;
let showMaskDebug = true; //DEBUG

threeMaskSVG.onload = () => {
  maskLoaded = true;
  checkIfReady();
};

// load legSVG as image
const legSVG = new Image();
legSVG.height = canvas.height;
legSVG.src = "/Assets/SVG/Leg-corner.svg";
let svgLoaded = false;

legSVG.onload = () => {
  svgLoaded = true;
  threeMaskAspect = threeMaskSVG.naturalWidth / threeMaskSVG.naturalHeight;
  updateThreeMaskLayout();
  checkIfReady();
};

function checkIfReady() {
  if (svgLoaded && maskLoaded) {
    createisPointInLegFunction();
    createIsPointInThreeFunction();
    generateRandomHair(hairNumber);
    console.log("Hairs generated:", hairPaths.length);
    run(update);
  }
}

// Rebuild when canvas size or scale changes
function updateThreeMaskLayout() {
  const w = canvas.width * threeMaskScale;
  const h = w / threeMaskAspect;
  const x = canvas.width * threeMaskXFrac - w * 0.5;
  const y = canvas.height * threeMaskYFrac; // top aligned
  threeMaskRect.x = x;
  threeMaskRect.y = y;
  threeMaskRect.w = w;
  threeMaskRect.h = h;
  // Recreate point test after layout change
  if (maskLoaded) createIsPointInThreeFunction();
}

function createIsPointInThreeFunction() {
  const threeCanvas = document.createElement("canvas");
  threeCanvas.width = canvas.width;
  threeCanvas.height = canvas.height;
  const threeCtx = threeCanvas.getContext("2d");
  threeCtx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw scaled mask
  threeCtx.drawImage(
    threeMaskSVG,
    threeMaskRect.x,
    threeMaskRect.y,
    threeMaskRect.w,
    threeMaskRect.h
  );
  const imageData = threeCtx.getImageData(0, 0, canvas.width, canvas.height);

  // Check if point is inside the "3" shape
  window.isPointInThree = (x, y) => {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
    const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
    return imageData.data[index + 3] > 128;
  };
}
window.addEventListener("resize", () => {
  // If your engine resizes canvas elsewhere, ensure canvas dimensions are updated first.
  updateThreeMaskLayout();
});

function createisPointInLegFunction() {
  // Create a temporary canvas to get the filled shape
  const legCanvas = document.createElement("canvas");
  legCanvas.width = canvas.width;
  legCanvas.height = canvas.height;
  const legCtx = legCanvas.getContext("2d");

  // Draw the SVG image to extract the shape
  legCtx.drawImage(legSVG, 0, 0, canvas.width, canvas.height);

  // Store the image data for pixel-based collision detection
  const imageData = legCtx.getImageData(0, 0, canvas.width, canvas.height);

  // Helper function to check if a pixel is part of the leg (non-transparent)
  window.isPointInLeg = (x, y) => {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
    const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
    return imageData.data[index + 3] > 128; // Check alpha channel
  };
}

function generateRandomHair(numOfHair) {
  hairPaths.length = 0;

  let created = 0;
  for (let i = 0; i < maxAttempts; i++) {
    if (created >= numOfHair) break;
    const randomHairLength =
      Math.random() * (maxHairLength - minHairLength) + minHairLength;
    const angle = Math.random() * Math.PI * 0.33 + Math.PI * 0.33;
    const x1 = Math.random() * canvas.width;
    const y1 = Math.random() * canvas.height;

    if (window.isPointInLeg && window.isPointInLeg(x1, y1)) {
      const x2 = x1 + randomHairLength * Math.cos(angle);
      const y2 = y1 + randomHairLength * Math.sin(angle);
      const hairPath = { x1, y1, x2, y2 };
      hairPaths.push(hairPath);
      created++;
    }
  }
}

function update(dt) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(legSVG, 0, 0, canvas.width, canvas.height);
  drawThreeMaskDebug(); //DEBUG

  ctx.lineWidth = 5;
  ctx.strokeStyle = "black";

  hairPaths.forEach((e) => {
    if (window.isPointInThree && window.isPointInThree(e.x1, e.y1)) {
      if (math.dist(e.x1, e.y1, input.getX(), input.getY()) < 30) {
        e.isCut = true;
      }
    }
  });

  hairPaths.forEach((e) => {
    ctx.beginPath();
    ctx.arc(e.x1, e.y1, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();
    if (!e.isCut) {
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
    }
  });
}

/* ------------------- DEBUG ----------------*/

function drawThreeMaskDebug() {
  if (!showMaskDebug) return;
  ctx.save();
  ctx.drawImage(
    threeMaskSVG,
    threeMaskRect.x,
    threeMaskRect.y,
    threeMaskRect.w,
    threeMaskRect.h
  );
  ctx.restore();
}
