const TM_URL = "https://teachablemachine.withgoogle.com/models/erIuFZ971/";
let video;
let model;

let label = "nothing";
let poseData = null;

let gV = false;
let cEnabled = false;

let pTriggered = false;
let lHSawLeft = false;

const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;

let engine;

let font;
let bgLayer;

let mic = null;
let amp;

let snd_ch1_1, snd_ch1_2, snd_ch2, snd_ch3;
let currentSnd = null;
let allSounds = [];

let holdBoostMs = 0;

let sentences = [];

const gather_t = 2500;
const hold_t = 14000;
const display_t = 3000;
const st_gap = 4000;

let currentPage = 0;

const GROUP1_LINES = [
  "제 1장. 삶과 죽음",
  "죽느냐 사느냐, 그것이 문제로다",
  "포악한 운명의 화살을 맞더라도, 가슴에 담고 참아내는 것인가",
  "아니면 장칼을 들고 노도와 같이 밀려드는 재앙에 맞서 싸워야 하는 것인가",
  "죽는다, 잠을 잔다. 그뿐 아닌가",
  "잠을 자면 마음의 고통과 육체가 여과된 오만가지 고통도 끝이 난다",
  "그거야말로 바라는 바, 최상의 종말이 아닌가",
  "죽는다, 잠을 잔다",
];

const GROUP2_LINES = [
  "제 2장. 피 묻은 고해",
  "아, 나의 죄여, 온 천지에 악취가 진동하는구나",
  "제 동생 아벨을 죽인 카인처럼, 나는 피를 나눈 내 형을 죽였다",
  "저주 받은 이 두 손으로",
  "하늘이여, 내게 빗물을 내려다오",
  "피에 물든 이 두 손을 눈처럼 하얗게 씻어다오",
  "나에게 자비를, 부디 용서를",
];

const GROUP3_LINES = [
  "제 3장. 영혼의 양심과 순수함",
  "저는 미친 게 아닙니다, 방금 한 말을 되풀이할까요?",
  "어머니, 은총에 맹세코, 영혼에 고약을 바르지 마세요",
  "자신의 죄를 아들의 미친 탓으로 돌리지 마세요",
  "고약은 종기의 표피만 덮어줄 뿐, 독기는 점점 속으로 번져 전신을 썩힙니다.",
  "나쁜 쪽은 도려내고 나머지 깨끗한 쪽만 간직하세요",
];

const LETTERS = ["거짓", "위선", "괴리", "죄악", "불결"];
let letterBursts = [];
let lastLetterSpawnMs = 0;

let uiButtons = [];

let cTriggered = false;

////////////////////////
// preload
function preload() {
  font = loadFont("asset/HakgyoansimBareonbatangB.ttf");

  soundFormats("mp3");
  snd_ch1_1 = loadSound("asset/1장_1.mp3");
  snd_ch1_2 = loadSound("asset/1장_2.mp3");
  snd_ch2 = loadSound("asset/2장.mp3");
  snd_ch3 = loadSound("asset/3장.mp3");
}

////////////////////////
// setup
function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);

  engine = Engine.create();
  engine.world.gravity.y = 1;
  createWall(40);

  colorMode(HSL);
  background(120, 10, 10);
  Back();

  amp = new p5.Amplitude();

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  initiatePoseOnly();

  buildButtons();
  initGroup();

  allSounds = [snd_ch1_1, snd_ch1_2, snd_ch2, snd_ch3];
}

////////////////////////
// 버튼 생성
function buildButtons() {
  uiButtons = [];

  uiButtons.push(
    new nButton(60, 50, 38, 18, "몸짓", function () {
      cEnabled = !cEnabled;

      if (!cEnabled) {
        label = "nothing";
      }
    })
  );

  uiButtons.push(
    new nButton(60 + (38 * 2 + 22) * 1, 50, 38, 18, "배우 음성1", function () {
      if (currentPage === 0) {
        playTrack(snd_ch1_1);
      } else if (currentPage === 1) {
        playTrack(snd_ch2);
      } else {
        playTrack(snd_ch3);
      }
    })
  );

  uiButtons.push(
    new nButton(60 + (38 * 2 + 22) * 2, 50, 38, 18, "배우 음성2", function () {
      playTrack(snd_ch1_2);
    })
  );

  ButtonsForPage();
}

function ButtonsForPage() {
  if (currentPage === 0) {
    uiButtons[1].visible = true;
    uiButtons[2].visible = true;
  } else {
    uiButtons[1].visible = true;
    uiButtons[2].visible = false;
  }
}

////////////////////////
// 티처블 머신
async function initiatePoseOnly() {
  const modelURL = TM_URL + "model.json";
  const metadataURL = TM_URL + "metadata.json";

  model = await tmPose.load(modelURL, metadataURL);
  predict();
}

async function predict() {
  if (!model) return;

  const result = await model.estimatePose(video.elt);
  poseData = result.pose;

  if (cEnabled) {
    const prediction = await model.predict(result.posenetOutput);

    let topLabel = "nothing";
    let topProb = 0;

    for (let i = 0; i < prediction.length; i++) {
      if (prediction[i].probability > topProb) {
        topProb = prediction[i].probability;
        topLabel = prediction[i].className;
      }
    }

    if (topLabel === "Class 1") {
      label = "기도";
    } else if (topLabel === "Class 2") {
      label = "눈가리기";
    } else if (topLabel === "Class 4") {
      label = "nothing";
    }
  } else {
    label = "nothing";
  }

  window.requestAnimationFrame(predict);
}

////////////////////////
// draw함수
function draw() {
  Engine.update(engine);

  image(bgLayer, 0, 0);
  hlSwipe();

  const lw = getLeftWrist();
  if (lw) {
    push();
    translate(width, 0);
    scale(-1, 1);
    noFill();
    stroke(255);
    strokeWeight(1);
    ellipse(lw.x, lw.y, 28, 28);
    pop();
  }

  if (gV) {
    push();
    translate(width, 0);
    scale(-1, 1);

    tint(255, 170);
    image(video, 0, 0, width, height);

    if (poseData) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(
        poseData.keypoints,
        minPartConfidence,
        drawingContext
      );
      tmPose.dSkel(poseData.keypoints, minPartConfidence, drawingContext);
    }

    pop();
  }

  let level = 0;
  if (amp) level = amp.getLevel();
  let baseMax = 0.15;
  if (currentPage === 2 && currentSnd && currentSnd.isPlaying()) {
    baseMax = baseMax / 1.7;
  }

  let vol = map(level, 0, baseMax, 0, 1, true);
  Fall();

  if (cEnabled && label === "기도") {
    spLetters();
  }
  dLetters();

  stroke(255);
  strokeWeight(0.6);
  noFill();

  for (let i = 0; i < sentences.length; i++) {
    sentences[i].updatePhase();
    sentences[i].updatePositions();
    sentences[i].draw(vol);
  }

  if (isCurrentGroupFinished()) {
    initGroup();
  }

  push();
  textFont(font);
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(16);
  text(label, width - width / 3.7, 90);
  pop();

  drawButtons();
}

function drawButtons() {
  for (let i = 0; i < uiButtons.length; i++) {
    const b = uiButtons[i];
    if (b.visible) b.draw();
  }

  if (
    uiButtons[0] &&
    uiButtons[0].visible &&
    uiButtons[0].hit(mouseX, mouseY)
  ) {
    push();
    textFont(font);
    textSize(14);
    fill(255);
    noStroke();
    textAlign(LEFT, TOP);

    text(
      "기도하는 자세 - 단어 랜덤 생성",
      uiButtons[0].x - uiButtons[0].rx,
      uiButtons[0].y + uiButtons[0].ry + 8
    );
    text(
      "눈 가리는 자세 - 단어 파괴",
      uiButtons[0].x - uiButtons[0].rx,
      uiButtons[0].y + uiButtons[0].ry + 8 + 18
    );
    pop();
  }
}

////////////////////////
// mousePressed
function mousePressed() {
  for (let i = uiButtons.length - 1; i >= 0; i--) {
    const b = uiButtons[i];
    if (!b.visible) continue;
    if (b.hit(mouseX, mouseY)) {
      b.onClick();
      return;
    }
  }

  userStartAudio();

  const ac = getAudioContext();
  if (ac.state !== "running") ac.resume();

  if (mic) return;

  mic = new p5.AudioIn();
  mic.start(function () {
    amp.setInput(mic);
  });
}

////////////////////////
// keyPressed 함수
function keyPressed() {
  if (key === "g" || key === "G") {
    gV = !gV;
  }
}

////////////////////////
// 눈가리기
function Fall() {
  if (!cEnabled) {
    cTriggered = false;
    return;
  }

  if (label !== "눈가리기") {
    cTriggered = false;
    return;
  }

  if (cTriggered) return;
  cTriggered = true;

  let picked = 0;

  for (let i = 0; i < sentences.length; i++) {
    if (random() < 0.4) {
      sentences[i].enablePhysics();
      picked++;
    }
  }

  if (picked === 0 && sentences.length > 0) {
    const idx = floor(random(sentences.length));
    sentences[idx].enablePhysics();
  }
}

////////////////////////
// 페이지 넘기기
function hlSwipe() {
  const lw = getLeftWrist();
  if (!lw) return;

  const x = width - lw.x;
  const y = lw.y;

  const yMin = height / 2 - 120;
  const yMax = height / 2 + 120;

  if (y < yMin || y > yMax) {
    lHSawLeft = false;
    pTriggered = false;
    return;
  }

  if (x < width * 0.3) {
    lHSawLeft = true;
    pTriggered = false;
  }

  if (lHSawLeft && x > width * 0.7) {
    if (!pTriggered) {
      currentPage = (currentPage + 1) % 3;
      initGroup();
      ButtonsForPage();
      pTriggered = true;
    }
  }
}

function getLeftWrist() {
  if (!poseData || !poseData.keypoints) return null;

  let kp = null;
  for (let i = 0; i < poseData.keypoints.length; i++) {
    if (poseData.keypoints[i].part === "leftWrist") {
      kp = poseData.keypoints[i];
      break;
    }
  }
  if (!kp) return null;

  let conf = 0;
  if (kp.score !== undefined) conf = kp.score;
  else if (kp.confidence !== undefined) conf = kp.confidence;

  if (conf < 0.2) return null;

  return { x: kp.position.x, y: kp.position.y, conf: conf };
}

////////////////////////
// 그룹 초기화
function initGroup() {
  cleanupSentenceBodies();

  sentences = [];

  let lines = GROUP1_LINES;
  if (currentPage === 1) lines = GROUP2_LINES;
  if (currentPage === 2) lines = GROUP3_LINES;

  for (let i = 0; i < lines.length; i++) {
    sentences.push(new Sentence(lines[i], i));
  }
  pTriggered = false;
  lHSawLeft = false;
  cTriggered = false;
}

function isCurrentGroupFinished() {
  if (!sentences || sentences.length === 0) return false;
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].state !== "done") return false;
  }
  return true;
}

function cleanupSentenceBodies() {
  if (!sentences || sentences.length === 0) return;

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (!s.points) continue;

    for (let j = 0; j < s.points.length; j++) {
      const p = s.points[j];
      if (p && p.body) {
        Composite.remove(engine.world, p.body);
        p.body = null;
      }
    }
  }
}

////////////////////////
// 배경 그래픽
function Back() {
  bgLayer = createGraphics(width, height);
  const b = bgLayer;

  b.colorMode(HSL);
  b.noStroke();
  b.rectMode(CENTER);
  b.background(120, 10, 10);

  for (let y = 0; y < height; y += 6.3) {
    for (let x = 0; x < width; x += random(1, 10)) {
      b.noStroke();
      b.fill(120, 10 + random(5), 10 + random(5));
      b.rect(x, y, random(1, 10), 3);
    }
  }

  const grainG = createGraphics(width, height);
  grainG.colorMode(RGB);
  grainG.noStroke();

  const grainCount = min(60000, width * height * 0.03);

  for (let i = 0; i < grainCount; i++) {
    grainG.fill(
      random(180, 230),
      random(180, 230),
      random(180, 230),
      random(20, 60)
    );
    grainG.circle(random(width), random(height), random(0.1, 1.7));
  }
  b.image(grainG, 0, 0);

  // 십자가
  b.push();
  b.translate(width - width / 5, height / 5.7);
  b.blendMode(ADD);
  b.noStroke();
  b.colorMode(RGB);

  for (let i = 0; i < 40; i++) {
    const alpha = map(i, 0, 39, 255, 0);
    const size = map(i, 0, 85, 20, width);

    b.fill(255, 255, 255, alpha * 0.07);
    b.rect(0, 0, size * 4, size * 0.1);
    b.rect(0, 0, size * 0.1, size * 4);
  }
  b.pop();

  b.colorMode(HSL);
}

////////////////////////
// Sentence 클래스
class Sentence {
  constructor(text, index) {
    this.text = text;
    this.index = index;

    this.points = [];
    this.state = "n_active";
    this.start = millis();

    this.waiting = this.index * st_gap;
    this.physicsEnabled = false;
  }
  getDynHoldMs() {
    return hold_t + holdBoostMs;
  }

  getDynCycleMs() {
    return gather_t + this.getDynHoldMs() + display_t;
  }

  removeBodies() {
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (p.body) {
        Composite.remove(engine.world, p.body);
        p.body = null;
      }
    }
  }

  startActive() {
    if (!font) return;

    this.state = "active";
    this.start = millis();
    this.points = [];

    const fontSize = 30;

    const pts = font.textToPoints(this.text, 0, 0, fontSize, {
      sampleFactor: 1,
    });

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];

      const baseX = p.x + width * 0.05;
      const baseY = p.y + height * 0.3 + this.index * 57;

      const sx = random(width);
      const sy = random(height);

      this.points.push({
        baseX: baseX,
        baseY: baseY,
        sx: sx,
        sy: sy,
        x: sx,
        y: sy,
        body: null,
        r: 2,
      });
    }
  }

  updatePhase() {
    const elapsed = millis() - this.start;

    if (this.state === "n_active") {
      if (elapsed >= this.waiting) this.startActive();
    } else if (this.state === "active") {
      if (elapsed >= this.getDynCycleMs()) {
        this.state = "done";
        this.removeBodies();
        this.points = [];
      }
    }
  }

  Gather() {
    if (this.state !== "active") return 0;

    const t = millis() - this.start;
    const dynHold = this.getDynHoldMs();
    const dynCycle = gather_t + dynHold + display_t;

    if (t < gather_t) return t / gather_t;
    if (t < gather_t + dynHold) return 1;

    if (t < dynCycle) {
      const tt = t - (gather_t + dynHold);
      return 1 - tt / display_t;
    }
    return 0;
  }

  enablePhysics() {
    if (this.physicsEnabled) return;
    this.physicsEnabled = true;

    const newPoints = [];

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (random() > 0.15) continue;

      const body = Bodies.circle(p.x, p.y, 6, {
        restitution: 0.2,
        friction: 0.6,
        density: 0.001,
      });

      Composite.add(engine.world, body);

      newPoints.push({
        x: p.x,
        y: p.y,
        body: body,
        r: 6,
      });
    }

    this.points = newPoints;
  }

  updatePositions() {
    if (this.physicsEnabled) {
      for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        if (p.body) {
          p.x = p.body.position.x;
          p.y = p.body.position.y;
        }
      }
      return;
    }

    const f = this.Gather();
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      p.x = lerp(p.sx, p.baseX, f);
      p.y = lerp(p.sy, p.baseY, f);
    }
  }

  draw(vol) {
    if (this.points.length === 0) return;
    if (this.physicsEnabled) {
      noStroke();
      fill(255);
      for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        ellipse(p.x, p.y, p.r * 0.3, p.r * 0.3);
      }
      return;
    }

    const f = this.Gather();
    let formed = false;
    if (this.state === "active") {
      if (f >= 0.999) formed = true;
    }

    stroke(255);
    noFill();

    if (!formed) {
      for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        point(p.x, p.y);
      }
      return;
    }

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];

      if (vol < 0.2) {
        const jitter = map(vol, 0, 0.2, 0, 5);
        const ox = random(-jitter, jitter);
        const oy = random(-jitter, jitter);
        point(p.x + ox, p.y + oy);
      } else {
        const len = map(vol, 0.2, 1.0, 8, 60);
        const ang = noise(p.x * 0.01, p.y * 0.01, frameCount * 0.02) * TWO_PI;
        const x2 = p.x + cos(ang) * len;
        const y2 = p.y + sin(ang) * len;
        line(p.x, p.y, x2, y2);
      }
    }
  }
}

////////////////////////
// 벽
function createWall(t) {
  Composite.add(engine.world, [
    Bodies.rectangle(0, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width - t / 2, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width / 2, t / 2, width, t, { isStatic: true }),
    Bodies.rectangle(width / 2, height - t / 2, width, t, { isStatic: true }),
  ]);
}

////////////////////////
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  Back();
  initGroup();
}

////////////////////////
// 기도제스처 -> 랜덤 생성
function spLetters() {
  const now = millis();

  const nextGap = random(600, 1200);
  if (now - lastLetterSpawnMs < nextGap) return;
  lastLetterSpawnMs = now;

  let count = 1;

  for (let i = 0; i < count; i++) {
    const ch = random(LETTERS);

    const x = random(width * 0.08, width * 0.92);
    const y = random(height * 0.18, height * 0.88);

    const size = random(22, 70);
    const life = random(3000, 6000);

    letterBursts.push(new LetterBurst(ch, x, y, size, life));
  }

  if (letterBursts.length > 180) {
    letterBursts.splice(0, letterBursts.length - 180);
  }
}

function dLetters() {
  for (let i = letterBursts.length - 1; i >= 0; i--) {
    const p = letterBursts[i];
    p.update();

    if (p.isDead()) {
      letterBursts.splice(i, 1);
    } else {
      p.draw();
    }
  }
}

class LetterBurst {
  constructor(ch, x, y, size, lifeMs) {
    this.ch = ch;
    this.x = x;
    this.y = y;
    this.size = size;
    this.lifeMs = lifeMs;

    this.birth = millis();
    this.vx = random(-0.06, 0.06);
    this.vy = random(-0.1, 0.03);
    this.rot = random(-0.15, 0.15);
    this.a = random(TWO_PI);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.a += 0.01;
  }

  isDead() {
    return millis() - this.birth > this.lifeMs;
  }

  draw() {
    const t = (millis() - this.birth) / this.lifeMs;

    let fade = 0;
    if (t < 0.5) fade = t / 0.5;
    else fade = (1 - t) / 0.5;

    const a = 80 * fade;

    push();
    translate(this.x, this.y);
    rotate(this.rot + sin(this.a) * 0.05);

    noStroke();

    colorMode(RGB, 255);
    fill(200, 100, 230, a);

    textFont(font);
    textAlign(CENTER, CENTER);
    textSize(this.size);

    drawingContext.shadowBlur = 12;
    drawingContext.shadowColor = "rgba(105,200,105," + a / 255 + ")";

    text(this.ch, 0, 0);

    drawingContext.shadowBlur = 0;
    pop();
  }
}

////////////////////////
// 버튼
class nButton {
  constructor(x, y, rx, ry, textLabel, onClick) {
    this.x = x;
    this.y = y;
    this.rx = rx;
    this.ry = ry;
    this.textLabel = textLabel;
    this.onClick = onClick;
    this.visible = true;

    this.textPts = [];
    this.textSizePx = 14;
    this.sampleFactor = 2.2;
    this.rebuildTextPoints();
  }

  setText(t) {
    this.textLabel = t;
    this.rebuildTextPoints();
  }

  rebuildTextPoints() {
    if (!font) return;

    const pts = font.textToPoints(this.textLabel, 0, 0, this.textSizePx, {
      sampleFactor: this.sampleFactor,
    });

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;

    this.textPts = [];
    for (let i = 0; i < pts.length; i++) {
      this.textPts.push({ x: pts[i].x - cx, y: pts[i].y - cy });
    }
  }

  hit(mx, my) {
    const dx = mx - this.x;
    const dy = my - this.y;
    const nx = dx / this.rx;
    const ny = dy / this.ry;
    return nx * nx + ny * ny <= 1;
  }

  draw() {
    push();
    translate(this.x, this.y);

    stroke(255);
    strokeWeight(1);
    noFill();

    for (let i = 0; i < this.textPts.length; i++) {
      const p = this.textPts[i];
      point(p.x, p.y);
    }

    pop();
  }
}

////////////////////////
// mp3 재생
function stopAllSounds() {
  for (let i = 0; i < allSounds.length; i++) {
    const s = allSounds[i];
    if (s) s.stop();
  }
}

function playTrack(snd) {
  if (!snd) return;

  userStartAudio();
  const ac = getAudioContext();
  if (ac.state !== "running") ac.resume();

  if (currentSnd === snd && snd.isPlaying()) {
    snd.stop();
    currentSnd = null;
    holdBoostMs = 0;
    return;
  }

  stopAllSounds();

  currentSnd = snd;

  initGroup();

  holdBoostMs = floor(snd.duration() * 1000 * 0.8);

  snd.play();
  snd.onended(function () {
    if (currentSnd === snd) {
      holdBoostMs = 0;
      currentSnd = null;
    }
  });
}
