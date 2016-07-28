var paused = false;

var entities = [];
var mouseX = 0, mouseY = 0;
var numFrames = 0;
var scale;
var scrWidth, scrHeight;

// user controlled parameters
var AF = 1.0/3, CF = 1.0/3, RF = 1.0/3, FF = 1.0;
var turnSpeed = 0.03, flockSize = 100;
var followWhite = true, fearWhite = false;
var showVectors = false;

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

function angle(l, r) {
  //var orientation = Math.cos(r)*Math.sin(l) + Math.cos(l)*Math.sin(r);
  var d = (r - l).mod(2*Math.PI);
  if (d > Math.PI) d -= 2*Math.PI;
  //d = d.mod(2*Math.PI);
  //d *= orientation;
  return Math.abs(d);
  //return d;
}

function orientedAngle(l, r) {
  var x1 = Math.cos(l), y1 = Math.sin(l);
  var x2 = Math.cos(r), y2 = Math.sin(r);

  var orientation = Math.sign(x1*y2 - x2*y1);
  if (orientation == 0) orientation = -1;
  var a = angle(l, r);//(x1*x2 + y1*y2);
  return a * orientation;
  //return a;
}

/*
function delta(a, b, bound) {
  return Math.min(Math.abs(b - a), Math.abs(b + bound - a));
}*/

function distSq(x1, y1, x2, y2) {
  //var a = delta(x1, x2, scrWidth);
  //var b = delta(y1, y2, scrHeight);
  //return a*a + b*b;
  return (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1);
}

/*
function loopoverInfo(x1, y1, x2, y2) {
  var d = (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1);
  var ld = distSq(x1, y1, x2, y2);
  if (d <= ld)
    return {"distSq": d, "loopover": false}
  else
    return {"distSq": ld, "loopover": true}
}*/

function closestEntities(x, y) {
  var e = entities.slice(1);  // copy array (don't include white bird)
  e.sort(function(b, a) {return distSq(x, y, b.x, b.y) - distSq(x, y, a.x, a.y)});
  e = e.slice(1);  // don't include self
  return e;
}

function Entity(x, y) {
  this.t = Math.random() * Math.PI * 2;  // angle
  this.x = x;
  this.y = y;

  this.maxVel = (Math.random() * 10 + 3) * scale;

  this.ar = 0; // radial accel
  this.at = 0; // angle accel
  this.vr = 0;
  this.vt = 0;

  //////this.biasDir = Math.random() * 0.1 - 0.05;
  this.avoidDir = Math.PI / 4;

  this.accel = function() {
    var closest = closestEntities(this.x, this.y).slice(0, flockSize);
    if (followWhite) {
      closest.push(entities[0]);
    }
    
    // adhesion
    var avgHeading = 0, avgVelR = 0;
    var x = 0, y = 0;
    for (var i = 0; i < closest.length; i++) {
      //avgHeading += closest[i].t;
      x += Math.cos(closest[i].t);
      y += Math.sin(closest[i].t);
      avgVelR += closest[i].vr;
    }
    avgHeading = Math.atan2(y, x);// /= closest.length;
    avgVelR /= closest.length;
    var alignmentDR = (avgVelR - this.vr) + Math.random() * 0.1;
    var desiredVT = orientedAngle(this.t, avgHeading);
    var alignmentDT = (desiredVT - this.vt) * 0.15;

    // cohesion
    var cx = 0, cy = 0;
    for (var i = 0; i < closest.length; i++) {
      cx += closest[i].x;
      cy += closest[i].y;
    }
    cx /= closest.length;
    cy /= closest.length;

    //var li = loopoverInfo(this.x, this.y, cx, cy);
    var cohesionDR = Math.pow(distSq(this.x, this.y, cx, cy), 0.25);
    desiredVT = orientedAngle(this.t, Math.atan2(cy - this.y, cx - this.x));
    var cohesionDT = (desiredVT - this.vt) * 0.1;
    //if (li.loopover) cohesionDT -= Math.PI * Math.sign(cohesionDT);

    // repulsion
    var r = 40 * scale * RF;
    var repulsionDR = distSq(this.x, this.y, closest[0].x, closest[0].y) < r*r ? 10 : 0;
    desiredVT = orientedAngle(this.t, Math.atan2(closest[0].y - this.y, closest[0].x - this.x) + this.avoidDir);
    var repulsionDT = (desiredVT - this.vt) * 0.1;
    //var repulsionDT = (repulsionDR == 0 && Math.abs(a) < this.avoidDir) ? 0 : Math.abs(Math.abs(a) - this.avoidDir) * (a > 0 ? -0.1 : 0.1);
    //this.ar = Math.log(closestDistSq / 10 + 0.000001) * 1;
    //console.log(closestDistSq / 100 + 0.000001);

    // fear (repulsion of mouse-controlled bird)
    r = 270 * scale;
    var fearDR = distSq(this.x, this.y, entities[0].x, entities[0].y) < r*r ? 40 : 0;
    var posa = Math.atan2(entities[0].y - this.y, entities[0].x - this.x);
    desiredVT = orientedAngle(this.t, posa);
    var fearDT = -(desiredVT - this.vt) * 0.5;
    //if (Math.abs(desiredVT) > Math.PI / 2) fearDT *= -1;
    if (this.vr < 0) fearDT *= -1;
    //var fearDT = da > 0 ? -0.3 : 0.3;
    //if (Math.abs(da) > Math.PI / 2) fearDT *= -1;
    //if (this.vr < 0) fearDT *= -1;

    if (fearWhite && fearDR) { 
      this.at = fearDT; this.ar = fearDR;
    } else if (repulsionDR) {
      this.at = RF * repulsionDT; this.ar = RF * repulsionDR;
    } else {
      this.at = AF*alignmentDT + CF*cohesionDT;
      this.ar = AF*alignmentDR + CF*cohesionDR;
    }
    //this.at = (fearRed && fearDT > 0) ? fearDT :
    //  (AF*alignmentDT + CF*cohesionDT + RF*repulsionDT);
    //this.ar = (fearRed && fearDR > 0) ? fearDR :
    //  (AF*alignmentDR + CF*cohesionDR + RF*repulsionDR);
    
    this.debugVec = {"x": this.ar * 4 * Math.cos(this.t + this.at),
    		     "y": this.ar * 4 * Math.sin(this.t + this.at)}
      
    //this.debugVec = {"x": 30 * Math.cos(this.t + this.at),
    //		     "y": 30 * Math.sin(this.t + this.at)}
    
    //if (this.ar < 0) {
    //  this.ar *= 100;
    //  this.at *= -1;
    //}
  }

  this.update = function() {
    this.maxAngVel = turnSpeed;
    
    this.accel();
    
    this.vr += this.ar;
    this.vt += this.at;
    if (this.vr < -this.maxVel) this.vr = -this.maxVel;
    if (this.vt < -this.maxAngVel) this.vt = -this.maxAngVel;
    if (this.vr > this.maxVel) this.vr = this.maxVel;
    if (this.vt > this.maxAngVel) this.vt = this.maxAngVel;
    this.t += this.vt;
    this.x += this.vr * Math.cos(this.t);
    this.y += this.vr * Math.sin(this.t);

    if (this.x >= scrWidth) this.x = 0;
    if (this.y >= scrHeight) this.y = 0;
    if (this.x < 0) this.x = scrWidth;
    if (this.y < 0) this.y = scrHeight;
  }
}

function mouseMove(e) {
  mouseX = e.offsetX * scale * 2;
  mouseY = e.offsetY * scale * 2;
}

function mouseUp(e) {
  document.getElementById('about').style.visibility = "hidden";
}

function redraw() {
  var canvas = document.getElementById("swarm-canvas");
  var ctx = canvas.getContext("2d");

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (var i = 0; i < entities.length; i++) {
    var entity = entities[i];
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, 5 * scale, 0, 2 * Math.PI, false);
    var color = "hsl(" + (Math.floor(entity.t.mod(Math.PI*2)*180/Math.PI)) + ",70%,50%)";
    ctx.fillStyle = (i === 0) ? "#fff" : color;
    //ctx.lineWidth = 0;
    //ctx.strokeStyle = "#003300";
    ctx.fill();

    if (entity.debugVec && showVectors) {
      ctx.strokeStyle = "#fff";
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.moveTo(entity.x, entity.y);
      ctx.lineTo(entity.x + entity.debugVec.x, entity.y + entity.debugVec.y);
      ctx.stroke();
    }
    //ctx.stroke();
  }

  numFrames++;
  //requestAnimationFrame(redraw);
}

function update() {
  if (!paused) {
    //updateUI();

    for (var i = 0; i < entities.length; i++) {
      entities[i].update();
    }

    redraw();
    //requestAnimationFrame(update);
  }
}

function keyPress(e) {
  if (e.keyCode === 32) {   // " " show/hide menu
    var hud = document.getElementById("hud");
    hud.style.visibility =
      (hud.style.visibility == "hidden") ? "visible" : "hidden";
  }
  if (e.keyCode === 118) {   // "v" show/hide debug vectors
    showVectors = !showVectors;
  }
}

function addNewEntity() {
  var canvas = document.getElementById("swarm-canvas");
  entities.push(new Entity(Math.random() * canvas.width, Math.random() * canvas.height));
}

var removeChunkCount = 5, removedEntities = 0, lastAdded = false;
function fpsCount() {
  if (numFrames < 58) {
    removedEntities += removeChunkCount;
    for (var i = 0; i < removeChunkCount; i++)
      entities.pop();
    if (lastAdded) {
      lastAdded = false;
      removedEntities = 0;
    }
    console.log("removed entities");
  } else if (removedEntities > 0) {
    addNewEntity();
    removedEntities--;
    console.log("added entity");
    lastAdded = true;
  }
  numFrames = 0;
}

function isHighRes() {
  return window.devicePixelRatio > 1;
}

function setupUIHooks(canvas) {
  // global events
  canvas.addEventListener("mousemove", mouseMove);
  addEventListener("mouseup", mouseUp);
  addEventListener("keypress", keyPress);

  // hud sliders
  if (document.getElementById("hud")) {
    var cohesionSlider = document.getElementById("cohesion");
    cohesionSlider.oninput = function() {
      CF = Number(cohesionSlider.value) / 100.0;
    }
    var adhesionSlider = document.getElementById("adhesion");
    adhesionSlider.oninput = function() {
      AF = Number(adhesionSlider.value) / 100.0;
    }
    var repulsionSlider = document.getElementById("repulsion");
    repulsionSlider.oninput = function() {
      RF = Number(repulsionSlider.value) / 100.0;
    }
    var turnSpeedSlider = document.getElementById("turn-speed");
    turnSpeedSlider.oninput = function() {
      turnSpeed = Number(turnSpeedSlider.value) / 1000;
    }
    var flockSizeSlider = document.getElementById("flock-size");
    flockSizeSlider.oninput = function() {
      flockSize = Math.max(3, Math.floor(Number(flockSizeSlider.value) /
					 100.0 * entities.length));
    }
    var followWhiteCheckbox = document.getElementById("follow-white");
    followWhiteCheckbox.onchange = function() {
      followWhite = followWhiteCheckbox.checked;
    }
    var fearWhiteCheckbox = document.getElementById("fear-white");
    fearWhiteCheckbox.onchange = function() {
      fearWhite = fearWhiteCheckbox.checked;
    }
  }
}

function init(wid, hei, numBirds) {
  if (!wid) wid = window.innerWidth;
  if (!hei) hei = window.innerHeight;
  if (!numBirds) numBirds = Math.round(225 / (1440 * 812) * wid * hei);
  
  var canvas = document.getElementById("swarm-canvas");
  scale = isHighRes() ? 1 : 0.5;
  canvas.width = wid * scale * 2;
  canvas.height = hei * scale * 2;
  canvas.style.width = wid;
  canvas.style.height = hei;
  scrWidth = canvas.width;
  scrHeight = canvas.height;
  
  //console.log(numBirds,window.innerWidth,window.innerHeight);
  for (var i = 0; i < numBirds; i++)
    addNewEntity();

  entities[0].maxVel = 8 * scale;
  entities[0].accel = function() {
    this.ar = 0.1;
    this.at = orientedAngle(this.t, Math.atan2(mouseY - this.y, mouseX - this.x));
  }

  setupUIHooks(canvas);
  
  //update();
  setInterval(update, 1000 / 60.0);
  //setInterval(fpsCount, 1000);
  //redraw();
}
