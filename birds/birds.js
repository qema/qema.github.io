var entities = [];
var mouseX = 0, mouseY = 0;
var numFrames = 0;

// user controlled parameters
var AF = 1.0/3, CF = 1.0/3, RF = 1.0/3, FF = 1.0;
var turnSpeed = 0.03, flockSize = 100;
var followRed = true, fearRed = false;
var showVectors = false;

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

function angle(l, r) {
  //var orientation = Math.cos(r)*Math.sin(l) + Math.cos(l)*Math.sin(r);
  var d = (l - r).mod(2*Math.PI);
  if (d > Math.PI) d -= 2*Math.PI;
  //d = d.mod(2*Math.PI);
  //d *= orientation;
  return d;
  //return d;
}

function orientedAngle(l, r) {
  var x1 = Math.cos(l), y1 = Math.sin(l);
  var x2 = Math.cos(r), y2 = Math.sin(r);
  var orientation = Math.sign(x2*y1 + x1*y2);
  var a = Math.acos(x1*x2 + y1*y2);
  return a * orientation;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1))
}

function closestEntities(x, y) {
  var e = entities.slice(1);  // copy array (don't include red bird)
  e.sort(function(b, a) {return dist(x, y, b.x, b.y) - dist(x, y, a.x, a.y)});
  e = e.slice(1);  // don't include self
  return e;
}

function Entity(x, y) {
  this.t = 0;  // angle
  this.x = x;
  this.y = y;

  this.maxVel = Math.random() * 10 + 3;

  this.ar = 0; // radial accel
  this.at = Math.random() * Math.PI * 2; // angle accel
  this.vr = 0;
  this.vt = 0;

  this.avoidDir = Math.PI / 2;

  this.accel = function() {
    var closest = closestEntities(this.x, this.y).slice(0, flockSize);
    if (followRed) {
      closest.push(entities[0]);
    }
    
    // alignment
    var avgHeading = 0;
    for (var i = 0; i < closest.length; i++) {
      avgHeading += closest[i].t;
    }
    avgHeading /= closest.length;
    var alignmentDR = 10;
    var alignmentDT = orientedAngle(avgHeading, this.t);

    // cohesion
    var cx = 0, cy = 0;
    for (var i = 0; i < closest.length; i++) {
      cx += closest[i].x;
      cy += closest[i].y;
    }
    cx /= closest.length;
    cy /= closest.length;
    var cohesionDR = Math.sqrt(dist(this.x, this.y, cx, cy));
    var cohesionDT = angle(Math.atan2(cy - this.y, cx - this.x), this.t);

    // repulsion
    var repulsionDR = dist(this.x, this.y, closest[0].x, closest[0].y) < (100 * RF) ? 10 : 0;
    var a = angle(Math.atan2(closest[0].y - this.y, closest[0].x - this.x), this.t);
    var repulsionDT = (repulsionDR == 0 && Math.abs(a) < this.avoidDir) ? 0 : Math.abs(Math.abs(a) - this.avoidDir) * (a > 0 ? 1 : -1);
    //this.ar = Math.log(closestDist / 10 + 0.000001) * 1;
    //console.log(closestDist / 100 + 0.000001);

    // fear (repulsion of mouse-controlled bird)
    var fearDR = dist(this.x, this.y, entities[0].x, entities[0].y) < 2000 ? 160 : 0;
    var a = orientedAngle(entities[0].t, this.t);
    var fearDT = (fearDR == 0 || Math.abs(a) > Math.PI / 2) ? 0 : 1.0 * (a > 0 ? -1 : 1);
    //this.debugVec = {"x": 20 * Math.cos(this.t + a),
    //		     "y": 20 * Math.sin(this.t + a)}

    this.at = AF*alignmentDT + CF*cohesionDT +
      RF*repulsionDT + (fearRed ? RF*fearDT : 0);
    this.ar = AF*alignmentDR + CF*cohesionDR +
      RF*repulsionDR + (fearRed ? RF*fearDR : 0);
    
    this.debugVec = {"x": this.ar * Math.cos(this.t + this.at),
    		     "y": this.ar * Math.sin(this.t + this.at)}
    
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

    var canvas = document.getElementById("swarm-canvas");
    if (this.x >= canvas.width) this.x = 0;
    if (this.y >= canvas.height) this.y = 0;
    if (this.x < 0) this.x = canvas.width;
    if (this.y < 0) this.y = canvas.height;
  }
}

function mouseMove(e) {
  mouseX = e.offsetX * 2;
  mouseY = e.offsetY * 2;
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
    ctx.arc(entity.x, entity.y, 4, 0, 2 * Math.PI, false);
    var color = "hsl(" + (Math.floor(entity.t.mod(Math.PI*2)*180/Math.PI)) + ",70%,50%)";
    ctx.fillStyle = (i === 0) ? "red" : color;
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

function updateUI() {
  // sliders
  var c = Number(document.getElementById("cohesion").value);
  var a = Number(document.getElementById("adhesion").value);
  var r = Number(document.getElementById("repulsion").value);
  CF = c / 100.0;
  AF = a / 100.0;
  RF = r / 100.0;

  turnSpeed = Number(document.getElementById("turn-speed").value) / 1000;
  flockSize = Math.max(3, Math.floor(Number(document.getElementById("flock-size").value) / 100.0 * entities.length))

  // checkboxes
  followRed = document.getElementById("follow-red").checked;
  fearRed = document.getElementById("fear-red").checked;
}

function update() {
  updateUI();
  
  for (var i = 0; i < entities.length; i++) {
    entities[i].update();
  }

  redraw();
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

function init() {
  var canvas = document.getElementById("swarm-canvas");
  canvas.width = window.innerWidth * 2;
  canvas.height = window.innerHeight * 2;
  canvas.style.width = window.innerWidth;
  canvas.style.height = window.innerHeight;

  var numBirds = Math.round(240 / (1440 * 812) * window.innerWidth * window.innerHeight);
  //console.log(numBirds,window.innerWidth,window.innerHeight);
  for (var i = 0; i < numBirds; i++)
    addNewEntity();

  entities[0].accel = function() {
    this.ar = 0.1;
    this.at = angle(Math.atan2(mouseY - this.y, mouseX - this.x), this.t);
  }

  canvas.addEventListener("mousemove", mouseMove);
  addEventListener("mouseup", mouseUp);
  addEventListener("keypress", keyPress);
  
  setInterval(update, 1000 / 60.0);
  //setInterval(fpsCount, 1000);
  redraw();
}
