import { createEngine } from "../_shared/engine.js";
import { createSpringSettings, Spring } from "../_shared/spring.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;
run(update);

const stars = [];
const starCount = 5;
const starSize = canvas.height * 0.25; // 10% of canvas height
const starY = canvas.height / 2; // Center vertical position

// Create 5 stars equally spaced horizontally
for (let i = 0; i < starCount; i++) {
  const spacing = canvas.width / (starCount + 1);
  const star = {
    x: spacing * (i + 1),
    y: starY,
    size: starSize,
    velocity: 0,
    acceleration: 0,
    clicked: false,
    rotation: 0,
    alpha: (2 * Math.PI) / 10,
    radius: starSize / 2,
    starXY: [spacing * (i + 1), starY],
  };
  stars.push(star);
}

function drawStar(star) {
  console.log("Drawing star at:", star.x, star.y);
  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.rotate(star.rotation);

  ctx.beginPath();
  for (let i = 11; i != 0; i--) {
    const r = (star.radius * ((i % 2) + 1)) / 2;
    const omega = star.alpha * i;
    ctx.lineTo(r * Math.sin(omega), r * Math.cos(omega));
  }
  ctx.closePath();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  //ctx.fill();

  ctx.restore();
}

function update(dt) {
  console.log("mouse pos :", input.getX(), input.getY());
  // Draw all stars
  stars.forEach((star) => {
    drawStar(star);
  });

  if (stars.length <= 0) {
    finish();
  }
}
