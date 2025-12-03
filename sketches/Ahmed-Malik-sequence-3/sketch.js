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

// rectangle parameters
const rect = {
  w: 110,
  h: 15,
  //isHovered: false,
  //isDragging: false,
  offsetX: 0,
  offsetY: 0,
};

// Razor position
const razor = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  width: 0,
  height: 0,
  isHovered: false,
  isDragging: false,
};

// Intro animation
let introProgress = 0;
const introDuration = 2.0;
let introComplete = false;

// load threeSVG as image
let threeMaskScale = 0.5;
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

// load razorSVG as image
const razorSVG = new Image();
razorSVG.src = "/Assets/SVG/razor.svg";
let razorLoaded = false;

razorSVG.onload = () => {
  razorLoaded = true;
  razor.width = razorSVG.naturalWidth;
  razor.height = razorSVG.naturalHeight;
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
  if (svgLoaded && maskLoaded && razorLoaded) {
    createisPointInLegFunction();
    createIsPointInThreeFunction();
    initRazor();
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
  initRazor();
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

    if (window.isPointInLeg && window.isPointInLeg(x1, y1)) {
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

function initRazor() {
  razor.x = canvas.width * 0.85;
  razor.y = canvas.height * 0.5;
  razor.targetX = razor.x;
  razor.targetY = razor.y;

  // Start intro animation
  introProgress = 0;
  introComplete = false;
}

function update(dt) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Update intro animation
  if (!introComplete) {
    introProgress += dt / introDuration;
    if (introProgress >= 1) {
      introProgress = 1;
      introComplete = true;
    }
  }

  // Easing function for smooth intro
  const ease =
    introProgress < 1
      ? introProgress * introProgress * (3 - 2 * introProgress)
      : 1;

  // Draw leg with intro offset - slide from left
  ctx.save();
  const legOffsetX = (1 - ease) * -canvas.width * 1;
  ctx.translate(legOffsetX, 0);
  ctx.drawImage(legSVG, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  drawThreeMaskDebug(); //DEBUG

  // Check if mouse is hovering over razor (bounds check)
  const mouseX = input.getX();
  const mouseY = input.getY();
  rect.isHovered =
    mouseX >= razor.x - razor.width / 2 &&
    mouseX <= razor.x + razor.width / 2 &&
    mouseY >= razor.y &&
    mouseY <= razor.y + razor.height;

  // Handle dragging (only when intro is complete)
  if (introComplete && input.isPressed()) {
    if (!rect.isDragging && rect.isHovered) {
      rect.isDragging = true;
      rect.offsetX = razor.x - mouseX;
      rect.offsetY = razor.y - mouseY;
    }
    if (rect.isDragging) {
      // Smooth lerp towards mouse position while dragging
      const dragEase = 0.25; // Higher value = more responsive dragging
      const targetX = mouseX + rect.offsetX;
      const targetY = mouseY + rect.offsetY;
      razor.x += (targetX - razor.x) * dragEase;
      razor.y += (targetY - razor.y) * dragEase;
    }
  } else {
    if (rect.isDragging) {
      rect.isDragging = false;
    }
  }

  // Animate back to target when not dragging using smooth lerp
  if (!rect.isDragging) {
    if (introComplete) {
      const ease = 0.08;
      razor.x += (razor.targetX - razor.x) * ease;
      razor.y += (razor.targetY - razor.y) * ease;
    } else {
      // During intro, animate from bottom
      const razorStartY = canvas.height * 1.2;
      razor.x = razor.targetX;
      razor.y = razorStartY + (razor.targetY - razorStartY) * ease;
    }
  }

  // Rectangle follows razor position
  const rectX = razor.x;
  const rectY = razor.y + rect.h / 2 + 10;

  ctx.lineWidth = 5;
  ctx.strokeStyle = "black";

  // Cut hair when rectangle hovers over them (only when intro complete)
  if (introComplete) {
    hairPaths.forEach((e) => {
      if (
        window.isPointInThree &&
        (window.isPointInThree(e.x1, e.y1) || window.isPointInThree(e.x2, e.y2))
      ) {
        // Check if hair root or tip is inside rectangle bounds
        const isRootInRect =
          e.x1 >= rectX - rect.w / 2 &&
          e.x1 <= rectX + rect.w / 2 &&
          e.y1 >= rectY - rect.h / 2 &&
          e.y1 <= rectY + rect.h / 2;

        const isTipInRect =
          e.x2 >= rectX - rect.w / 2 &&
          e.x2 <= rectX + rect.w / 2 &&
          e.y2 >= rectY - rect.h / 2 &&
          e.y2 <= rectY + rect.h / 2;

        if ((isRootInRect || isTipInRect) && !e.isCut) {
          e.isCut = true;
          e.cutProgress = 0;
          e.fallVelocity = 0;
        }
      }
    });
  }

  // Update falling hair
  hairPaths.forEach((e) => {
    if (e.isCut && e.cutProgress !== undefined) {
      e.fallVelocity += 0.5; // Gravity acceleration
      e.cutProgress += e.fallVelocity;
    }
  });

  // Remove hair that has fallen off screen
  for (let i = hairPaths.length - 1; i >= 0; i--) {
    const e = hairPaths[i];
    if (e.isCut && e.cutProgress > canvas.height + 100) {
      hairPaths.splice(i, 1);
    }
  }

  hairPaths.forEach((e) => {
    // Apply leg offset to hair positions during intro
    const hairX1 = e.x1 + legOffsetX;
    const hairX2 = e.x2 + legOffsetX;
    const hairCx = e.cx + legOffsetX;

    ctx.beginPath();
    ctx.arc(hairX1, e.y1, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();
    if (!e.isCut) {
      ctx.beginPath();
      ctx.moveTo(hairX1, e.y1);
      ctx.quadraticCurveTo(hairCx, e.cy, hairX2, e.y2);
      ctx.stroke();
    } else if (e.cutProgress !== undefined) {
      // Draw falling hair
      ctx.beginPath();
      ctx.moveTo(hairX1, e.y1 + e.cutProgress);
      ctx.quadraticCurveTo(
        hairCx,
        e.cy + e.cutProgress,
        hairX2,
        e.y2 + e.cutProgress
      );
      ctx.stroke();
    }
  });

  // Draw interactive rectangle (debug) - follows razor
  ctx.beginPath();
  ctx.rect(rectX - rect.w / 2, rectY - rect.h / 2, rect.w, rect.h);
  ctx.fillStyle = rect.isDragging
    ? "rgba(34,34,34,0.3)"
    : rect.isHovered
    ? "rgba(51,51,51,0.3)"
    : "rgba(102,102,102,0.3)";
  ctx.fill();
  ctx.strokeStyle = rect.isDragging
    ? "yellow"
    : rect.isHovered
    ? "white"
    : "#999";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw razor SVG at its position
  if (razorLoaded) {
    ctx.save();
    ctx.drawImage(
      razorSVG,
      razor.x - razor.width / 2,
      razor.y,
      razor.width,
      razor.height
    );
    ctx.restore();
  }
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
