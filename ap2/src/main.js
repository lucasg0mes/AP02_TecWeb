// !Cada segundo fora pista reduz em 15% a velocidade do carro.

const DEBUG = false;
const FPS = 120;
const TICK_RATE = 60;
const CAR_DIMENSIONS = {
  width: 56,
  height: 100,
};
const TERRAIN_COLORS = {
  grass: "#323f13",
  snow: "#f5f5f5",
  desert: "#c29519",
};
const TERRAINS = Object.keys(TERRAIN_COLORS);
const SCENARIOS = ["day", "night", "fog"];
const TRACKS = {
  types: ["up", "right", "left"],
  changeRate: 0.5,
};

const OBSTACLES = {
  maxQtd: 15, // 15
  spawnRate: 0.015, // 0.015
  types: [
    "car",
    "car",
    "car",
    "car",
    "car",
    "car",
    "car",
    "car",
    "car",
    "car",
    "car",
    "car",
    "car",
    "car",
    "car",
    "fuel",
    "rock",
    "rock",
    "rock",
    "rock",
    "rock",
    "rock",
    "rock",
    "turbo",
    "turbo",
    "turbo",
  ],
  props: {
    car: {
      width: CAR_DIMENSIONS.width,
      height: CAR_DIMENSIONS.height,
      color: "red",
    },
    fuel: {
      width: CAR_DIMENSIONS.width,
      height: CAR_DIMENSIONS.height,
      color: "yellow",
    },
    rock: {
      width: 50,
      height: 50,
      color: "gray",
    },
    turbo: {
      width: 50,
      height: 50,
      color: "orange",
    },
  },
};
const DECORATIONS = {
  spawnRate: 0.05,
  props: {
    grass: {
      width: 50,
      height: 50,
      color: "green",
    },
  },
};

let calculateInterval;
let renderInterval;
let fuelLostInterval;
let trackInterval;

const globals = {
  player: {
    distance: 0,
    x: window.innerWidth / 2,
    speed: -100,
    fuel: 100,
    score: 0,
    y: window.innerHeight * 0.6,
    width: CAR_DIMENSIONS.width,
    height: CAR_DIMENSIONS.height,
    timesRefueled: 0,
    speedDelta: 20,
    sprite: Math.floor(Math.random() * 10),
  },
  track: "up",
  limits: {
    up: [0.15, 0.85], // [0.15, 0.85],
    right: [0.25, 0.95], // [0.25, 0.95],
    left: [0.5, 0.75], // [0.5, 0.75],
  },
  pressedKeys: new Set(),
  obstacles: [],
  decorations: [],
  currentScenario: {
    terrain: "grass",
    scenario: "day",
  },
  screen: {
    width: window.innerWidth,
    height: window.innerHeight,
  },
  softDarkness: false,
};

// ====================
// DOM Helpers
// ====================

function $(id) {
  return document.getElementById(id);
}

// ====================
// Main
// ====================

function game() {
  resetGame();
  setListeners();
  update();
}

function resetGame() {
  globals.player = {
    distance: 0,
    x: window.innerWidth / 2,
    speed: -100,
    fuel: 100,
    score: 0,
    y: window.innerHeight * 0.6,
    width: CAR_DIMENSIONS.width,
    height: CAR_DIMENSIONS.height,
    timesRefueled: 0,
    speedDelta: 20,
    sprite: Math.floor(Math.random() * 10),
  };
  globals.track = "up";
  globals.pressedKeys = new Set();
  globals.obstacles = [];
  globals.decorations = [];
}

function setListeners() {
  window.addEventListener("keydown", (e) => {
    globals.pressedKeys.add(e.key);
  });

  window.addEventListener("keyup", (e) => {
    globals.pressedKeys.delete(e.key);
  });
}

function update() {
  renderInterval = setInterval(render, 1000 / FPS);
  calculateInterval = setInterval(calculate, 1000 / TICK_RATE);
  fuelLostInterval = setInterval(
    () => globals.player.fuel > 0 && globals.player.fuel--,
    1000
  );
  trackInterval = setInterval(() => {
    if (globals.player.speed > 0 && Math.random() < TRACKS.changeRate) {
      globals.track =
        TRACKS.types[Math.floor(Math.random() * TRACKS.types.length)];
    }
  }, 5000);
}

function render() {
  resetDOM();
  renderFrames();
  renderObstacles();
  renderDecorations();
  renderPlayer();
}

function calculate() {
  if (globals.player.fuel === 0) {
    freezeFrame();
    renderScore();
    return;
  }
  calculateInput();
  calculateCollisions();
  calculateMovement();
  calculateObstacles();
  calculateDecorations();
}

function calculateInput() {
  // Keys
  const actions = {
    ArrowLeft() {
      if (globals.player.x - globals.player.width / 2 > 0) {
        globals.player.x -=
          (115 + globals.player.speed) / globals.player.speedDelta;
      }
    },
    ArrowRight() {
      if (globals.player.x + globals.player.width / 2 < globals.screen.width) {
        globals.player.x +=
          (115 + globals.player.speed) / globals.player.speedDelta;
      }
    },
  };

  globals.pressedKeys.forEach((key) => {
    actions[key]?.();
  });
}

function calculateCollisions() {
  const { speed, x } = globals.player;

  // Fora da pista
  if (x < globals.screen.width * 0.15 || x > globals.screen.width * 0.85) {
    speed > -100 && globals.player.speed--;
  } else {
    speed < 100 && globals.player.speed++;
  }

  // Colisão com obstáculos
  globals.obstacles = globals.obstacles.filter((obstacle) => {
    const actions = {
      car() {
        globals.player.speed = -100;
        debounce(() => {
          globals.player.score -= 2;
        }, 50)();
        return true;
      },
      fuel() {
        globals.player.fuel = 100;
        globals.player.timesRefueled++;
        return false;
      },
      rock() {
        globals.player.speed = -50;
        globals.player.score--;
        return false;
      },
      turbo() {
        globals.player.speed = 200;
        globals.player.score += 5;
        debounce(() => {
          const lowerSpeed = () => {
            setTimeout(() => {
              globals.player.speed--;
              if (globals.player.speed > 100) {
                lowerSpeed();
              }
            }, 1000 / TICK_RATE);
          };
          lowerSpeed();
        }, 5000)();
        return false;
      },
    };

    const playerRect = $`player`.getBoundingClientRect();
    const obstacleRect = $(obstacle.id).getBoundingClientRect();

    if (
      obstacleRect.bottom > playerRect.top &&
      obstacleRect.right > playerRect.left &&
      obstacleRect.top < playerRect.bottom &&
      obstacleRect.left < playerRect.right
    ) {
      return actions[obstacle.type]?.() ?? true;
    }
    return true;
  });
}

function calculateMovement() {
  globals.player.distance += (globals.player.speed + 100) / TICK_RATE;

  // Update player
  if (
    globals.player.x - globals.player.width / 2 > 0 &&
    globals.player.x + globals.player.width / 2 < globals.screen.width
  ) {
    if (globals.track === "right") {
      globals.player.x -= (100 + globals.player.speed) / 45;
    } else if (globals.track === "left") {
      globals.player.x += (100 + globals.player.speed) / 45;
    }
  }

  // Update obstacles
  globals.obstacles = globals.obstacles.map((obstacle) => {
    const yDelta = 15;
    const xDelta = 60;
    const expressions = {
      car: {
        y: globals.player.speed / yDelta,
        x: globals.player.speed / xDelta,
      },
      fuel: {
        y: globals.player.speed / yDelta,
        x: globals.player.speed / xDelta,
      },
      rock: {
        y: (100 + globals.player.speed) / yDelta,
        x: (100 + globals.player.speed) / xDelta,
      },
      turbo: {
        y: (100 + globals.player.speed) / yDelta,
        x: (100 + globals.player.speed) / xDelta,
      },
    };

    const obstacleExpressions = expressions[obstacle.type];
    const obstacleProps = OBSTACLES.props[obstacle.type];

    obstacle.y += obstacleExpressions.y;

    const currentLimit =
      obstacle.y < globals.screen.height / 2 - 30
        ? globals.limits[globals.track]
        : [0.15, 0.85];

    if (
      obstacle.x - obstacleProps.width / 2 >
        globals.screen.width * currentLimit[0] &&
      obstacle.x + obstacleProps.width / 2 <
        globals.screen.width * currentLimit[1]
    ) {
      if (globals.track === "right") {
        obstacle.x -= obstacleExpressions.x;
      } else if (globals.track === "left") {
        obstacle.x += obstacleExpressions.x;
      }
    }
    return obstacle;
  });

  // Update decorations
  globals.decorations = globals.decorations.map((decoration) => {
    const yDelta = 15;
    const expressions = {
      grass: {
        y: (100 + globals.player.speed) / yDelta,
      },
    };

    const decorationExpressions = expressions[decoration.type];

    decoration.y += decorationExpressions.y;

    return decoration;
  });
}

function calculateObstacles() {
  // Update score
  globals.obstacles = globals.obstacles.map((obstacle) => {
    if (obstacle.y > globals.player.y && !obstacle.alreadyPassed) {
      obstacle.type === "car" && globals.player.score++;
      obstacle.alreadyPassed = true;
    }
    return obstacle;
  });

  // Remove distant obstacles
  globals.obstacles = globals.obstacles.filter((obstacle) => {
    return obstacle.y < globals.screen.height + 1000;
  });

  // Randomly add obstacles
  if (
    globals.obstacles.length < OBSTACLES.maxQtd &&
    Math.random() > 1 - OBSTACLES.spawnRate
  ) {
    const type =
      OBSTACLES.types[Math.floor(Math.random() * OBSTACLES.types.length)];

    const id = `${type}-${globals.obstacles.length}`;

    const currentLimit = globals.limits[globals.track];

    const leftLimit =
      globals.screen.width * currentLimit[0] + OBSTACLES.props[type].width / 2;
    const rightLimit =
      globals.screen.width * currentLimit[1] - OBSTACLES.props[type].width / 2;

    let x = 0;
    let y = 0;
    const TRY_LIMIT = 50;
    let tries = 0;

    do {
      x = Math.random() * (rightLimit - leftLimit) + leftLimit;
      y = -100 - Math.random() * 200;
      tries++;
    } while (
      tries < TRY_LIMIT &&
      globals.obstacles.some(
        (obstacle) =>
          Math.abs(x - obstacle.x) <
            OBSTACLES.props[obstacle.type].width +
              OBSTACLES.props[type].width &&
          Math.abs(y - obstacle.y) <
            OBSTACLES.props[obstacle.type].height + OBSTACLES.props[type].height
      )
    );

    const sprite = Math.floor(Math.random() * 10);

    tries < TRY_LIMIT &&
      globals.obstacles.push({ id, x, y, type, sprite, alreadyPassed: false });
  }
}

function calculateDecorations() {
  // Remove distant decorations
  globals.decorations = globals.decorations.filter((obstacle) => {
    return obstacle.y < globals.screen.height + 1000;
  });

  // Randomly add decoration
  if (Math.random() > 1 - DECORATIONS.spawnRate) {
    const type = "grass";
    // DECORATIONS.types[Math.floor(Math.random() * DECORATIONS.types.length)];

    const id = `${type}-${globals.decorations.length}`;

    const leftLimits = [
      DECORATIONS.props[type].width / 2,
      globals.screen.width * 0.05 - DECORATIONS.props[type].width / 2,
    ];
    const rightLimits = [
      globals.screen.width * 0.95 + DECORATIONS.props[type].width / 2,
      globals.screen.width - DECORATIONS.props[type].width / 2,
    ];

    let x = 0;
    let y = 0;
    const TRY_LIMIT = 50;
    let tries = 0;

    do {
      x = [
        Math.random() * (leftLimits[1] - leftLimits[0]) + leftLimits[0],
        Math.random() * (rightLimits[1] - rightLimits[0]) + rightLimits[0],
      ][Math.floor(Math.random() * 2)];
      y = -100 - Math.random() * 200;
      tries++;
    } while (
      tries < TRY_LIMIT &&
      globals.decorations.some(
        (decoration) =>
          Math.abs(x - decoration.x) <
            DECORATIONS.props[decoration.type].width +
              DECORATIONS.props[type].width &&
          Math.abs(y - decoration.y) <
            DECORATIONS.props[decoration.type].height +
              DECORATIONS.props[type].height
      )
    );

    const sprite = Math.floor(Math.random() * 4);

    tries < TRY_LIMIT && globals.decorations.push({ id, x, y, type, sprite });
  }
}

function resetDOM() {
  $`root`.innerHTML = "";
}

function renderFrames() {
  const $filters = document.createElement("div");
  $filters.id = "filters";
  $filters.style.width = `${globals.screen.width}px`;
  $filters.style.height = `${globals.screen.height}px`;
  $filters.style.position = "absolute";
  if (["night", "fog"].includes(globals.currentScenario.scenario)) {
    $filters.style.background = globals.softDarkness
      ? "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 100%)"
      : "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.565) 100%)"; // rgba(0,0,0,0.565)
  }
  if (globals.currentScenario.scenario === "fog") {
    $filters.style.filter = "contrast(0.1)";
  }
  $filters.style.zIndex = 10;
  $`root`.appendChild($filters);

  const $textureSide = document.createElement("div");
  $textureSide.id = "textureSide";
  $textureSide.style.width = `${globals.screen.width}px`;
  $textureSide.style.height = `${globals.screen.height}px`;
  $textureSide.style.position = "absolute";
  $textureSide.style.zIndex = 1;
  $textureSide.style.backgroundImage = `linear-gradient(transparent 50%, rgba(${
    globals.currentScenario.terrain === "snow" ? "0,0,0" : "255,255,255"
  },.05) 50%)`;
  $textureSide.style.backgroundSize = "100px 100px";
  $textureSide.style.backgroundPositionY = `${globals.player.distance * 5}px`;
  $`root`.appendChild($textureSide);

  const $textureTrackStatic = document.createElement("div");
  $textureTrackStatic.id = "textureTrackStatic";
  $textureTrackStatic.style.width = `${globals.screen.width * 0.7}px`;
  $textureTrackStatic.style.height = `${globals.screen.height * 0.4}px`;
  $textureTrackStatic.style.position = "absolute";
  $textureTrackStatic.style.left = "15%";
  $textureTrackStatic.style.top = "40%";
  $textureTrackStatic.style.zIndex = 1;
  $textureTrackStatic.style.background = `
    linear-gradient(27deg, #151515 5px, transparent 5px) 0 5px,
    linear-gradient(207deg, #151515 5px, transparent 5px) 10px 0px,
    linear-gradient(27deg, #222 5px, transparent 5px) 0px 10px,
    linear-gradient(207deg, #222 5px, transparent 5px) 10px 5px,
    linear-gradient(90deg, #1b1b1b 10px, transparent 10px),
    linear-gradient(#1d1d1d 25%, #1a1a1a 25%, #1a1a1a 50%, transparent 50%, transparent 75%, #242424 75%, #242424)`;
  $textureTrackStatic.style.backgroundColor = "#131313";
  $textureTrackStatic.style.backgroundSize = "20px 20px";
  $textureTrackStatic.style.backgroundPositionY = `${
    globals.player.distance * 5
  }px`;
  $`root`.appendChild($textureTrackStatic);

  const $textureTrackDynamic = document.createElement("div");
  $textureTrackDynamic.id = "textureTrackDynamic";
  $textureTrackDynamic.style.width = `${globals.screen.width}px`;
  $textureTrackDynamic.style.height = `${globals.screen.height * 0.4}px`;
  $textureTrackDynamic.style.position = "absolute";
  $textureTrackDynamic.style.zIndex = 1;
  $textureTrackDynamic.style.background = `
    linear-gradient(27deg, #151515 5px, transparent 5px) 0 5px,
    linear-gradient(207deg, #151515 5px, transparent 5px) 10px 0px,
    linear-gradient(27deg, #222 5px, transparent 5px) 0px 10px,
    linear-gradient(207deg, #222 5px, transparent 5px) 10px 5px,
    linear-gradient(90deg, #1b1b1b 10px, transparent 10px),
    linear-gradient(#1d1d1d 25%, #1a1a1a 25%, #1a1a1a 50%, transparent 50%, transparent 75%, #242424 75%, #242424)`;
  $textureTrackDynamic.style.backgroundColor = "#131313";
  $textureTrackDynamic.style.backgroundSize = "20px 20px";
  $textureTrackDynamic.style.backgroundPositionY = `${
    globals.player.distance * 5
  }px`;
  $textureTrackDynamic.style.webkitMaskImage = `url(./assets/track-${globals.track}.png)`;
  $textureTrackDynamic.style.maskImage = `url(./assets/track-${globals.track}.png)`;
  $textureTrackDynamic.style.webkitMaskSize = "100% 100%";
  $textureTrackDynamic.style.maskSize = "100% 100%";
  $textureTrackDynamic.style.webkitMaskPosition = "center";
  $textureTrackDynamic.style.maskPosition = "center";

  $`root`.appendChild($textureTrackDynamic);

  const $main = document.createElement("div");
  $main.id = "main";
  $main.style.width = `${globals.screen.width}px`;
  $main.style.height = `${globals.screen.height}px`;
  $main.style.display = "flex";
  $main.style.flexDirection = "column";
  $main.style.alignItems = "center";
  $main.style.justifyContent = "center";
  $main.style.backgroundColor = TERRAIN_COLORS[globals.currentScenario.terrain];
  // $main.style.border = DEBUG ? "5px solid black" : "";
  $`root`.appendChild($main);

  const $dynamic = document.createElement("div");
  $dynamic.id = "dynamic";
  $dynamic.style.width = "100%";
  $dynamic.style.height = "40%";
  $dynamic.style.border = DEBUG ? "5px solid red" : "";
  $main.appendChild($dynamic);

  const $dynamicImage = document.createElement("img");
  $dynamicImage.id = "dynamicImage";
  $dynamicImage.style.width = `${globals.screen.width}px`;
  $dynamicImage.style.height = `${globals.screen.height * 0.4}px`;
  $dynamicImage.style.position = "absolute";
  $dynamicImage.src = `./assets/track-${globals.track}.png`;
  $dynamic.appendChild($dynamicImage);

  const $static = document.createElement("div");
  $static.id = "static";
  $static.style.width = "100%";
  $static.style.height = "40%";
  $static.style.display = "flex";
  $static.style.flexDirection = "row";
  $static.style.alignItems = "center";
  $static.style.justifyContent = "space-between";
  $static.style.border = DEBUG ? "5px solid blue" : "";
  $main.appendChild($static);

  const $staticImage = document.createElement("img");
  $staticImage.id = "staticImage";
  $staticImage.style.width = `${globals.screen.width}px`;
  $staticImage.style.height = `${globals.screen.height * 0.4}px`;
  $staticImage.style.top = `${globals.screen.height * 0.4}px`;
  $staticImage.style.position = "absolute";
  $staticImage.src = "./assets/track-up.png";
  $static.appendChild($staticImage);

  const $margemEsquerda = document.createElement("div");
  $margemEsquerda.id = "margemEsquerda";
  $margemEsquerda.style.width = "15%";
  $margemEsquerda.style.height = "100%";
  $margemEsquerda.style.border = DEBUG ? "5px solid orange" : "";
  $static.appendChild($margemEsquerda);

  const $margemDireita = document.createElement("div");
  $margemDireita.id = "margemDireita";
  $margemDireita.style.width = "15%";
  $margemDireita.style.height = "100%";
  $margemDireita.style.border = DEBUG ? "5px solid orange" : "";
  $margemDireita.style.order = 3;
  $static.appendChild($margemDireita);

  const $ui = document.createElement("div");
  $ui.id = "ui";
  $ui.style.width = "100%";
  $ui.style.height = "20%";
  $ui.style.display = "flex";
  $ui.style.gap = "5px";
  $ui.style.flexDirection = "column";
  $ui.style.alignItems = "center";
  $ui.style.justifyContent = "center";
  $ui.style.border = DEBUG ? "5px solid black" : "";
  $ui.style.backgroundColor = "black";
  $ui.style.zIndex = 50;
  $ui.textContent = DEBUG
    ? `speed: ${globals.player.speed} | fuel: ${globals.player.fuel} | score: ${
        globals.player.score
      } | timesRefueled: ${globals.player.timesRefueled} | velocidadeReal: ${
        globals.player.speed + 100
      } | x: ${globals.player.x} | y: ${globals.player.y} | obstacles: ${
        globals.obstacles.length
      }`
    : "";
  $ui.style.color = "white";
  $ui.innerHTML = `<div class="ui container"><h3>Score: ${String(
    globals.player.score
  ).padStart(5, "0")}</h3><h3>Speed: ${String(
    globals.player.speed + 100
  ).padStart(3, "0")}Km/h</h3><h3>Fuel: ${globals.player.fuel}%</h3></div>`;
  $main.appendChild($ui);
}

function renderObstacles() {
  globals.obstacles.forEach((obstacle) => {
    const obstacleProps = OBSTACLES.props[obstacle.type];

    const $obstacle = document.createElement("div");
    $obstacle.id = obstacle.id;
    $obstacle.style.width = `${obstacleProps.width}px`;
    $obstacle.style.height = `${obstacleProps.height}px`;
    $obstacle.style.backgroundColor = DEBUG ? obstacleProps.color : "unset";
    $obstacle.style.border = DEBUG ? "5px solid red" : "";
    $obstacle.style.position = "absolute";
    $obstacle.style.transition = "transform 0.2s ease-in-out";
    $obstacle.style.zIndex = ["car", "fuel"].includes(obstacle.type) ? 5 : 4;
    $obstacle.style.boxShadow = ["car", "fuel"].includes(obstacle.type)
      ? "0px 10px 10px -10px rgba(255,0,0,1)"
      : "unset";
    $obstacle.style.transform = `translate(${
      obstacle.x - obstacleProps.width / 2
    }px, ${obstacle.y - obstacleProps.height}px)`;

    const sprites = {
      car: `url("./assets/car-${obstacle.sprite}.png")`,
      rock: "url('./assets/rock.png')",
      fuel: "url('./assets/fuel.png')",
      turbo: "url('./assets/turbo.png')",
    };

    $obstacle.style.backgroundImage = sprites[obstacle.type];

    $`dynamic`.appendChild($obstacle);
  });
}

function renderDecorations() {
  globals.decorations.forEach((decoration) => {
    const decorationProps = DECORATIONS.props[decoration.type];

    const $decoration = document.createElement("div");
    $decoration.id = decoration.id;
    $decoration.style.width = `${decorationProps.width}px`;
    $decoration.style.height = `${decorationProps.height}px`;
    $decoration.style.backgroundColor = DEBUG ? decorationProps.color : "unset";
    $decoration.style.border = DEBUG ? "5px solid blue" : "";
    $decoration.style.position = "absolute";
    $decoration.style.zIndex = 3;
    $decoration.style.transition = "transform 0.2s ease-in-out";
    $decoration.style.transform = `translate(${
      decoration.x - decorationProps.width / 2
    }px, ${decoration.y - decorationProps.height}px)`;

    const sprites = {
      grass: `url('./assets/${globals.currentScenario.terrain}-${
        decoration.type
      }-${
        globals.currentScenario.terrain === "desert" ? 0 : decoration.sprite
      }.png')`,
    };

    $decoration.style.backgroundImage = sprites[decoration.type];

    $`dynamic`.appendChild($decoration);
  });
}

function renderPlayer() {
  const $player = document.createElement("div");
  $player.id = "player";
  $player.style.width = `${globals.player.width}px`;
  $player.style.height = `${globals.player.height}px`;
  $player.style.backgroundColor = DEBUG ? "green" : "unset";
  $player.style.border = DEBUG ? "5px solid lime" : "";
  $player.style.transition = "transform 0.2s ease-in-out";
  $player.style.zIndex = 5;
  $player.style.transform = `translateX(${
    globals.player.x - globals.screen.width / 2
  }px)`;
  $player.style.backgroundImage = `url("./assets/car-${globals.player.sprite}.png")`;
  $player.style.boxShadow = "0px 10px 10px -10px rgba(255,0,0,1)";

  $`static`.appendChild($player);
}

// ====================
// Menus
// ====================

function renderMenu() {
  const $menu = document.createElement("div");
  $menu.id = "menu";
  $menu.style.width = `${globals.screen.width}px`;
  $menu.style.height = `${globals.screen.height}px`;
  $menu.style.display = "flex";
  $menu.style.gap = "5px";
  $menu.style.flexDirection = "column";
  $menu.style.alignItems = "center";
  $menu.style.justifyContent = "center";
  $menu.style.backgroundColor = "black";
  $menu.style.color = "white";
  $menu.innerHTML = `<h1>Enduro WEB</h1><br/><h2>Menu</h2><br/><button id="start">Start</button><br/>`;
  $`root`.appendChild($menu);
  setMenuListeners();
}

function setMenuListeners() {
  $`start`.addEventListener("click", () => {
    resetDOM();
    renderScenarios();
  });
}

function onOff(state) {
  return state ? "on" : "off";
}

function renderScenarios() {
  const $scenarios = document.createElement("div");
  $scenarios.id = "scenarios";
  $scenarios.style.width = `${globals.screen.width}px`;
  $scenarios.style.height = `${globals.screen.height}px`;
  $scenarios.style.display = "flex";
  $scenarios.style.gap = "10px";
  $scenarios.style.flexDirection = "column";
  $scenarios.style.alignItems = "center";
  $scenarios.style.justifyContent = "center";
  $scenarios.style.backgroundColor = "black";
  $scenarios.style.color = "white";
  $scenarios.innerHTML = `
    <h1>Enduro WEB</h1><br/>
    <h2>Terrain</h2>
    <button id="grass" class="${onOff(
      globals.currentScenario.terrain === "grass"
    )}">Grass</button>
    <button id="snow" class="${onOff(
      globals.currentScenario.terrain === "snow"
    )}">Snow</button>
    <button id="desert" class="${onOff(
      globals.currentScenario.terrain === "desert"
    )}">Desert</button><br/>
    <h2>Scenarios</h2>
    <button id="day" class="${onOff(
      globals.currentScenario.scenario === "day"
    )}">Day</button>
    <button id="night" class="${onOff(
      globals.currentScenario.scenario === "night"
    )}">Night</button>
    <button id="fog" class="${onOff(
      globals.currentScenario.scenario === "fog"
    )}">Fog</button><br/>
    <h2>Extra</h2>
    <button id="softDarkness" class="${onOff(
      globals.softDarkness
    )}">Soft Darkness</button><br/>
    <button id="start">Start</button>`;
  $`root`.appendChild($scenarios);
  setScenariosListeners();
}

function setScenariosListeners() {
  function selectScenario(button) {
    globals.currentScenario.scenario = button.id;
    SCENARIOS.forEach((scenario) => {
      if (scenario === button.id) {
        $(scenario).classList.remove("off");
        $(scenario).classList.add("on");
      } else {
        $(scenario).classList.remove("on");
        $(scenario).classList.add("off");
      }
    });
  }

  function selectTerrain(button) {
    globals.currentScenario.terrain = button.id;
    TERRAINS.forEach((terrain) => {
      if (terrain === button.id) {
        $(terrain).classList.remove("off");
        $(terrain).classList.add("on");
      } else {
        $(terrain).classList.remove("on");
        $(terrain).classList.add("off");
      }
    });
  }

  $`start`.addEventListener("click", () => {
    resetDOM();
    game();
  });

  SCENARIOS.forEach((scenario) => {
    $(scenario).addEventListener("click", function () {
      selectScenario(this);
    });
  });
  TERRAINS.forEach((terrain) => {
    $(terrain).addEventListener("click", function () {
      selectTerrain(this);
    });
  });
  $`softDarkness`.addEventListener("click", function () {
    globals.softDarkness = !globals.softDarkness;
    this.classList.toggle("on");
    this.classList.toggle("off");
  });
}

function renderScore() {
  const $score = document.createElement("div");
  $score.id = "score";
  $score.style.width = "35%";
  $score.style.height = "35%";
  $score.style.position = "absolute";
  $score.style.top = "50%";
  $score.style.left = "50%";
  $score.style.transform = "translate(-50%, -50%)";
  $score.style.color = "white";
  $score.style.backgroundColor = "black";
  $score.style.display = "flex";
  $score.style.flexDirection = "column";
  $score.style.alignItems = "center";
  $score.style.justifyContent = "center";
  $score.style.zIndex = 15;
  $score.innerHTML = `<h2
  >Score: ${globals.player.score}</h2></br><h2>Times Refueled: ${globals.player.timesRefueled}</h2></br><button id="menu"><h3>Menu</h3></button>`;
  $`root`.appendChild($score);
  setScoreListeners();
}

function setScoreListeners() {
  $`menu`.addEventListener("click", () => {
    resetDOM();
    renderMenu();
  });
}

renderMenu();

// ====================
// Helpers
// ====================

let debounceTimeout;
function debounce(func, wait) {
  return () => {
    debounceTimeout && clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(func, wait);
  };
}

function freezeFrame() {
  calculateInterval && clearInterval(calculateInterval);
  renderInterval && clearInterval(renderInterval);
  fuelLostInterval && clearInterval(fuelLostInterval);
  trackInterval && clearInterval(trackInterval);
}
