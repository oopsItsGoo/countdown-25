import { createEngine } from "../_shared/engine.js";
import { Spring } from "../_shared/spring.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;
run(update);

let slideInDuration = 2.0; // Duration of slide-in animations in seconds
let introProgress = 0;
let introComplete = false;

const State = {
  WaitingForInput: "waitingForInput",
  Intro: "intro",
  Drawing: "drawing",
  Outro: "outro",
  Finished: "finished",
};

const shoulderSVG = new Image();
shoulderSVG.src = "/Assets/SVG/shoulder.svg";
const shoulder = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  targetX: 0,
  targetY: 0,
  isAnimating: false,
};
shoulderSVG.onload = () => {
  shoulder.loaded = true;
  shoulder.svg = shoulderSVG;
  shoulder.ratio = shoulderSVG.naturalHeight / shoulderSVG.naturalWidth;
  shoulder.height = canvas.height;
  shoulder.width = shoulder.height / shoulder.ratio;
  shoulder.targetX = canvas.width / 2 - shoulder.width / 2;
  shoulder.targetY = canvas.height / 2 - shoulder.height / 2;
  // Start off-screen to the left
  shoulder.x = -shoulder.width;
  shoulder.y = shoulder.targetY;
};

const oneSVG = new Image();
oneSVG.src = "/Assets/SVG/1-mask.svg";
const one = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  targetX: 0,
  targetY: 0,
  isAnimating: false,
};
oneSVG.onload = () => {
  one.loaded = true;
  one.svg = oneSVG;
  one.ratio = oneSVG.naturalHeight / oneSVG.naturalWidth;
  one.height = shoulder.height * 0.3;
  one.width = one.height / one.ratio;
  one.targetX = canvas.width / 2 - one.width / 2;
  one.targetY = canvas.height / 2 - one.height / 2;
  one.x = one.targetX;
  one.y = one.targetY;
  createIsPointInOneFunction();
};

function createIsPointInOneFunction() {
  const oneCanvas = document.createElement("canvas");
  oneCanvas.width = canvas.width;
  oneCanvas.height = canvas.height;
  const oneCtx = oneCanvas.getContext("2d");
  oneCtx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the one mask
  oneCtx.drawImage(oneSVG, one.x, one.y, one.width, one.height);
  const imageData = oneCtx.getImageData(0, 0, canvas.width, canvas.height);

  // Check if point is inside the "1" shape
  window.isPointInOne = (x, y) => {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
    const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
    return imageData.data[index + 3] > 128;
  };
}

const gunSVG = new Image();
gunSVG.src = "/Assets/SVG/tattoo-gun.svg";
const gun = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  targetX: 0,
  targetY: 0,
  isAnimating: false,
  isPickedUp: false,
  isHovered: false,
  offsetX: 0,
  offsetY: 0,
  needlePosition: { x: 0, y: 0 },
  scale: 0.25, // Initial smaller size
};
gunSVG.onload = () => {
  gun.loaded = true;
  gun.svg = gunSVG;
  gun.ratio = gunSVG.naturalHeight / gunSVG.naturalWidth;
  gun.height = canvas.height * gun.scale;
  gun.width = gun.height / gun.ratio;
  gun.targetX = canvas.width * 0.85 - gun.width / 2;
  gun.targetY = canvas.height * 0.33 - gun.height / 2;
  // Start off-screen at the bottom
  gun.x = gun.targetX;
  gun.y = canvas.height + gun.height;
  gun.needlePosition = {
    x: gun.x + gun.width / 2,
    y: gun.y + gun.height,
  };
};

const points = [];
const tempPoints = [];

const point = {
  x: 0,
  y: 0,
  size: 5,
};

let currentState = State.WaitingForInput;
let lastPointTime = 0;
const pointInterval = 0.01; // Add a point every 0.05 seconds while dragging

function update(dt) {
  console.log(currentState);

  lastPointTime += dt;

  drawObject(shoulder);
  drawObject(one);
  drawPoints();
  drawObject(gun);
  DEBUGDrawGunRectangle();

  let nextState = undefined;

  switch (currentState) {
    case State.WaitingForInput:
      if (input.hasStarted()) {
        nextState = State.Intro;
      }
      nextState = State.Intro; // AUTO-START FOR TESTING
      break;
    case State.Intro:
      if (introComplete) {
        nextState = State.Drawing;
      }
      break;
    case State.Drawing:
      break;
    case State.Outro:
      break;
    case State.Finished:
      break;
  }

  if (nextState !== undefined) {
    currentState = nextState;
  }

  switch (currentState) {
    case State.WaitingForInput:
      break;
    case State.Intro:
      // Update intro animation
      if (!introComplete) {
        introProgress += dt / slideInDuration;
        if (introProgress >= 1) {
          introProgress = 1;
          introComplete = true;
        }

        // Easing function for smooth intro (smoothstep)
        const ease = introProgress * introProgress * (3 - 2 * introProgress);

        // Animate shoulder sliding in from left
        const shoulderStartX = -shoulder.width;
        shoulder.x =
          shoulderStartX + (shoulder.targetX - shoulderStartX) * ease;

        // Animate gun sliding in from bottom
        const gunStartY = canvas.height + gun.height;
        gun.x = gun.targetX; // Keep x at target position during slide-in
        gun.y = gunStartY + (gun.targetY - gunStartY) * ease;
      }
      break;
    case State.Drawing:
      handleGunPickup();
      
      if (gun.isPickedUp) {
        updateGun();
        
        // Only add points when clicking/holding after pickup
        if (input.isPressed() && lastPointTime >= pointInterval) {
          addPointAtNeedle();
          lastPointTime = 0;
        }
      }

      // Update temporary points (fade them out)
      updateTempPoints(dt);
      break;
    case State.Outro:
      break;
    case State.Finished:
      break;
  }
}

function handleGunPickup() {
  const mouseX = input.getX();
  const mouseY = input.getY();

  // Check if mouse is hovering over the gun
  gun.isHovered =
    mouseX >= gun.x &&
    mouseX <= gun.x + gun.width &&
    mouseY >= gun.y &&
    mouseY <= gun.y + gun.height;

  // Handle pickup - click on gun to pick it up
  if (input.isPressed() && !gun.isPickedUp && gun.isHovered && currentState === State.Drawing) {
    gun.isPickedUp = true;
    gun.scale = 0.3; // Increase size when picked up
    
    // Recalculate dimensions with new scale
    gun.height = canvas.height * gun.scale;
    gun.width = gun.height / gun.ratio;
    
    // Store offset from mouse to gun position
    gun.offsetX = mouseX - gun.x;
    gun.offsetY = mouseY - gun.y;
  }
}

function updateGun() {
  if (!gun.isPickedUp) return;
  
  const mouseX = input.getX();
  const mouseY = input.getY();

  // Update target position based on mouse position (accounting for offset)
  gun.targetX = mouseX - gun.offsetX;
  gun.targetY = mouseY - gun.offsetY;

  // Smoothly lerp gun position towards target
  gun.x = math.lerp(gun.x, gun.targetX, 0.2);
  gun.y = math.lerp(gun.y, gun.targetY, 0.2);

  // Update needle position to follow gun
  gun.needlePosition.x = gun.x + gun.width / 2;
  gun.needlePosition.y = gun.y + gun.height;
}

function addPointAtNeedle() {
  const needleX = gun.x;
  const needleY = gun.y + gun.height;

  // Check if the needle point is inside the "one" mask
  if (window.isPointInOne && window.isPointInOne(needleX, needleY)) {
    // Add to permanent points array
    points.push({
      x: needleX,
      y: needleY,
      size: 5,
    });
  } else {
    // Add to temporary points array with lifetime
    tempPoints.push({
      x: needleX,
      y: needleY,
      size: 5,
      lifetime: 0,
      maxLifetime: 3.0, // Disappear after 3 seconds
    });
  }
}

function updateTempPoints(dt) {
  // Update lifetime of temporary points and remove expired ones
  for (let i = tempPoints.length - 1; i >= 0; i--) {
    tempPoints[i].lifetime += dt;
    if (tempPoints[i].lifetime >= tempPoints[i].maxLifetime) {
      tempPoints.splice(i, 1);
    }
  }
}

function drawPoints() {
  ctx.save();

  // Draw permanent points
  ctx.fillStyle = "black";
  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw temporary points with fading opacity
  tempPoints.forEach((p) => {
    const fade = 1 - p.lifetime / p.maxLifetime;
    ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawObject(obj) {
  if (!obj.loaded) return;
  ctx.save();
  ctx.drawImage(obj.svg, obj.x, obj.y, obj.width, obj.height);
  ctx.restore();
}

function DEBUGDrawGunRectangle() {
  ctx.save();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.strokeRect(gun.x, gun.y, gun.width, gun.height);
  ctx.restore();
}
