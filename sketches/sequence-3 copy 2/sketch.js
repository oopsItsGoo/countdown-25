import { createEngine } from "../_shared/engine.js";
import { createSpringSettings, Spring } from "../_shared/spring.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;

/* ------------- SETUP ------------- */
// Hair parameters
const hairNumber = 4000;
const maxAttempts = 20000;
const maxHairLength = 80;
const minHairLength = 50;
const minHairSpacing = 8; // Minimum distance between hair roots
const hairPaths = [];

// Interactive circle parameters
const circle = {
  x: 0,
  y: 0,
  radius: 80,
  isHovered: false,
};

// load threeSVG as image
let threeMaskScale = 0.5; // This will now be relative to canvas height like the leg
let threeMaskAspect;
let threeMaskXFrac = 0.5;
let threeMaskYFrac = 0.5;
let threeMaskRect = { x: 0, y: 0, w: 0, h: 0 };

const threeMaskSVG = new Image();
threeMaskSVG.src = "/Assets/SVG/3-mask.svg";
let maskLoaded = false;
let showMaskDebug = false; //DEBUG

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
    initCircle();
    generateRandomHair(hairNumber);
    console.log("Hairs generated:", hairPaths.length);
    run(update);
  }
}

// Rebuild when canvas size or scale changes
function updateThreeMaskLayout() {
  // Calculate height relative to canvas (same scaling approach as leg)
  const h = canvas.height * threeMaskScale;
  const w = h * threeMaskAspect;
  const x = canvas.width * threeMaskXFrac - w * 0.5;
  const y = canvas.height * threeMaskYFrac - h * 0.5;
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
  initCircle();
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

  // Create a grid to track occupied positions for better distribution
  const cellSize = minHairSpacing;
  const gridCols = Math.ceil(canvas.width / cellSize);
  const gridRows = Math.ceil(canvas.height / cellSize);
  const grid = new Map();

  const getGridKey = (x, y) => {
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    return `${col},${row}`;
  };

  const isTooClose = (x, y) => {
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    // Check surrounding cells
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${col + dx},${row + dy}`;
        const existing = grid.get(key);
        if (existing) {
          for (const pos of existing) {
            const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
            if (dist < minHairSpacing) return true;
          }
        }
      }
    }
    return false;
  };

  let created = 0;
  for (let i = 0; i < maxAttempts; i++) {
    if (created >= numOfHair) break;
    const randomHairLength =
      Math.random() * (maxHairLength - minHairLength) + minHairLength;

    // Randomly choose up or down direction
    const baseAngle = Math.random() * Math.PI * 0.33 + Math.PI * 0.33;
    const pointUp = Math.random() < 0.5;
    const angle = pointUp ? -baseAngle : baseAngle;

    const x1 = Math.random() * canvas.width;
    const y1 = Math.random() * canvas.height;

    if (
      window.isPointInLeg &&
      window.isPointInLeg(x1, y1) &&
      !isTooClose(x1, y1)
    ) {
      const x2 = x1 + randomHairLength * Math.cos(angle);
      const y2 = y1 + randomHairLength * Math.sin(angle);

      // Add curve control point for natural hair bend
      const curvature = (Math.random() - 0.5) * randomHairLength * 0.5;
      const perpAngle = angle + Math.PI / 2;
      const cx = (x1 + x2) / 2 + curvature * Math.cos(perpAngle);
      const cy = (y1 + y2) / 2 + curvature * Math.sin(perpAngle);

      const hairPath = { x1, y1, x2, y2, cx, cy };
      hairPaths.push(hairPath);

      // Add to grid
      const key = getGridKey(x1, y1);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push({ x: x1, y: y1 });

      created++;
    }
  }
}

function initCircle() {
  circle.x = canvas.width * 0.85;
  circle.y = canvas.height * 0.5;
}

function update(dt) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(legSVG, 0, 0, canvas.width, canvas.height);
  drawThreeMaskDebug(); //DEBUG

  // Check if mouse is hovering over circle
  const mouseX = input.getX();
  const mouseY = input.getY();
  const distToCircle = math.dist(mouseX, mouseY, circle.x, circle.y);
  circle.isHovered = distToCircle < circle.radius;

  ctx.lineWidth = 5;
  ctx.strokeStyle = "black";

  hairPaths.forEach((e) => {
    if (
      window.isPointInThree &&
      (window.isPointInThree(e.x1, e.y1) || window.isPointInThree(e.x2, e.y2))
    ) {
      if (
        math.dist(e.x1, e.y1, input.getX(), input.getY()) < 30 ||
        math.dist(e.x2, e.y2, input.getX(), input.getY()) < 30
      ) {
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
      ctx.quadraticCurveTo(e.cx, e.cy, e.x2, e.y2);
      ctx.stroke();
    }
  });

  // Draw interactive circle
  ctx.beginPath();
  ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
  ctx.fillStyle = circle.isHovered ? "#333" : "#666";
  ctx.fill();
  ctx.strokeStyle = circle.isHovered ? "white" : "#999";
  ctx.lineWidth = 3;
  ctx.stroke();
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
