import { createEngine } from "../_shared/engine.js";
import { Spring } from "../_shared/spring.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;
run(update);

const State = {
  WaitingForInput: "waitingForInput",
  Interactive: "interactive",
  Falling: "falling",
  Finished: "finished",
};
let currentState = State.WaitingForInput;
let startInputX = 0;

/* ------------------------------ load SVG --------------------------------*/

// load back svg
const backSVG = new Image();
backSVG.src = "/Assets/SVG/back.svg";
let backLoaded = false;
backSVG.onload = () => {
  backLoaded = true;
  checkIfReady();
}

//load paper svg
const paperSVG = new Image();
paperSVG.src = "/Assets/SVG/paper.svg";
let paperLoaded = false;
paperSVG.onload = () => {
  paperLoaded = true;
  checkIfReady();
}

//load 2 svg
const twoSVG = new Image();
twoSVG.src = "/Assets/SVG/2.svg";
let twoLoaded = false;
twoSVG.onload = () => {
  twoLoaded = true;
  checkIfReady();
}

/* ------------------------------ check if ready SVG --------------------------------*/

function checkIfReady() {
  if (backLoaded && paperLoaded && twoLoaded) {
    console.log("All SVGs loaded:");
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
      const xOffset = input.getX() - startInputX;
      rotationSpring.target = math.map(xOffset, 0, canvas.width, 0, 360) + 180;
      rotationSpring.step(dt);
      nextState = State.Falling;
      break;
    }

    case State.Falling: {
      const drag = 0.1;
      const gravity = canvas.height * 3;
      const rotationForce = 200 * Math.sign(rotationSpring.velocity); //TODO should i include rotation when falling down?
      fallVel += gravity * dt;
      fallPos += fallVel * dt;
      if (fallPos > canvas.height) nextState = State.Finished;
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
      case State.Falling:
        
        break;
    }
    // change state
  }


  const x;
  const y;
  const rot;
  const scale;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

}
