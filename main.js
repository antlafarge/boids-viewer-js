var debug = false;

var accountId = "997bc6ac-9021-2ad6-139b-da63edee8c58";
var applicationName = "boids";
var sceneName = "main";

var deltaReceiveAvg = new Average();
var deltaReceiveClock = new THREE.Clock();
var firstUpdateDataReceived = false;

var canvas = document.querySelector("canvas#scene");
var width = canvas.offsetWidth;
var height = canvas.offsetHeight;
var ctx = canvas.getContext('2d');
var fontSize = 1;
ctx.font = fontSize+"px serif";
var timer = new THREE.Clock();
var renderDeltaClock = new THREE.Clock();
var center = new THREE.Vector3();
var netgraph = new NetGraph("#netgraph");
var cameraPosition = {x:0, y:0};

var myPackets = {};
var myId;

var objects = [];
var boidsMap = {};
var boidsCount = 0;
var teams = [];

var worldZoom = 6;

window.onresize = onResize;
window.onload = main;

Checker.addChecker("deltaReceive", 190, 210);
Checker.addChecker("ping", 1, 500);

var config;
var client;
var scene;

function toggleDebugInfos()
{
	$("table.bl").toggle();
}

function main()
{
	toggleDebugInfos();

	onResize();
	requestRender();
	
	config = Stormancer.Configuration.forAccount(accountId, applicationName);
	client = new Stormancer.Client(config);
	client.getPublicScene(sceneName, "{isObserver:true}").then(function(sc) {
		scene = sc;
		//scene.registerRoute("ship.add", onBoidAdded);
		scene.registerRoute("ship.remove", onBoidRemoved);
		scene.registerRouteRaw("position.update", onBoidUpdate);
		//scene.registerRoute("ship.me", onMyBoid);
		return scene.connect().then(function() {
			console.log("CONNECTED");
			setInterval(syncClock, 1000);
		});
	});

	teams.push({id:0, color:"#D00", boids:[]});
	teams.push({id:1, color:"#0BF", boids:[]});
	teams.push({id:3, color:"#DD0", boids:[]});
	teams.push({id:2, color:"#3D3", boids:[]});
}

function requestRender()
{
	render();
	window.requestAnimationFrame(requestRender);
}

function render()
{
	var delta = renderDeltaClock.getDelta();
	var time = timer.getElapsedTime();
	if (kbMoveLeft)
	{
		cameraPosition.x += (delta * kbSens);
	}
	if (kbMoveRight)
	{
		cameraPosition.x += (-delta * kbSens);
	}
	if (kbMoveUp)
	{
		cameraPosition.y += (-delta * kbSens);
	}
	if (kbMoveDown)
	{
		cameraPosition.y += (delta * kbSens);
	}
	clearCanvas();
	ctx.save();
	ctx.translate(cameraPosition.x, cameraPosition.y);
	drawOrigin();
	drawBoidsAveragePoint();
	var osz = objects.length;
	for (var i=0; i<osz; i++)
	{
		var object = objects[i];
		if (object.update(delta, time))
		{
			objects.splice(i, 1);
			i--;
			osz = objects.length;
		}
		else
		{
			object.draw();
		}
	}
	$("#deltaRender").text(delta.toFixed(4)+"...");
	$("#time").text(time.toFixed(4)+"...");
	ctx.restore();
}

function onResize(event)
{
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	width = canvas.offsetWidth;
	height = canvas.offsetHeight;
	ctx.translate(width/2, height/2);
	ctx.scale(worldZoom, -worldZoom);
	netgraph.onresize();
}

function clearCanvas()
{
	ctx.fillStyle = "#003";
	ctx.fillRect(-width/2, -height/2, width, height);
}

function drawOrigin()
{
	var originSize = 1;

	ctx.fillStyle = "#FFF";
	ctx.fillRect(0, 0, originSize, originSize);
}

function drawBoidsAveragePoint()
{
	computeCenter();
	
	var dotSize = 1;
	ctx.fillStyle = "#FF0000";
	ctx.fillRect(center.x, center.y, dotSize, dotSize);
}

function syncClock()
{
	timer.elapsedTime = client.clock();
	console.log("serverClock", timer.elapsedTime);
}

function onBoidAdded(data)
{
	if (data instanceof Array)
	{
		data.id = data[0];
		data.rot = data[1];
		data.x = data[2];
		data.y = data[3];
	}
	data.team = randomInt(0, teams.length-1);

	var boid = new Boid(data.id, data.team);
	boidsMap[data.id] = boid;
	assignTeam(data.id, data.team);
	
	boidsCount++;
	$("#boidsCount").text(boidsCount);

	objects.push(boid);
}

function onBoidRemoved(data)
{
	var id = data;
	for (var i=0; i<objects.length; i++)
	{
		if (objects[i].id === id)
		{
			objects.splice(i, 1);
			delete boidsMap[id];
			$("#boidsCount").text(boidsCount);
			return;
		}
	}
}

var startByte = 5;
var frameSize = 22;
function onBoidUpdate(dataView)
{
	for (var i = startByte; dataView.byteLength - i >= frameSize; i += frameSize)
	{
		var id = dataView.getUint16(i, true);
		if (!boidsMap[id])
		{
			onBoidAdded({
				id:id,
				rot:0,
				x:0,
				y:0,
				team:randomInt(0, teams.length-1)
			});
		}
		var x = dataView.getFloat32(i+2, true);
		var y = dataView.getFloat32(i+6, true);
		var rot = dataView.getFloat32(i+10, true);
		var time = getUint64(dataView, i+14, true) / 1000;
		console.log("time", time)
		
		var boid = boidsMap[id];
		boid.netMobile.pushInterpData({
			time: time,
			position: new THREE.Vector3(x, y, 0),
			orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
		});
	}
}

var lastMouseX;
var lastMouseY;
var mouseSens = 0.2;
window.onmousemove = function(e)
{
	if (mouseHold)
	{
		var mouseX = e.offsetX;
		var mouseY = e.offsetY;
		var relativeX = (mouseX - lastMouseX) * mouseSens;
		var relativeY = -(mouseY - lastMouseY) * mouseSens;
		cameraPosition.x += relativeX;
		cameraPosition.y += relativeY;
		lastMouseX = mouseX;
		lastMouseY = mouseY;
	}
};

var mouseHold = false;
window.onmousedown = function(e)
{
	mouseHold = true;
	lastMouseX = e.offsetX;
	lastMouseY = e.offsetY;
};
window.onmouseup = function(e)
{
	mouseHold = false;
};

var kbMoveLeft = false;
var kbMoveRight = false;
var kbMoveUp = false;
var kbMoveDown = false;
var kbSens = 20;
window.onkeydown = function(e)
{
	if (e.which === 38)
	{
		kbMoveUp = true;
	}
	else if (e.which === 40)
	{
		kbMoveDown = true;
	}
	else if (e.which === 37)
	{
		kbMoveLeft = true;
	}
	else if (e.which === 39)
	{
		kbMoveRight = true;
	}
};
window.onkeyup = function(e)
{
	if (e.which === 38)
	{
		kbMoveUp = false;
	}
	else if (e.which === 40)
	{
		kbMoveDown = false;
	}
	else if (e.which === 37)
	{
		kbMoveLeft = false;
	}
	else if (e.which === 39)
	{
		kbMoveRight = false;
	}
};

canvas.addEventListener("touchstart", touchstart);
canvas.addEventListener("touchend", touchend);
canvas.addEventListener("touchcancel", touchcancel);
canvas.addEventListener("touchleave", touchleave);
canvas.addEventListener("touchmove", touchmove);

function touchstart(e)
{

}

function touchend(e)
{

}

function touchcancel(e)
{

}

function touchleave(e)
{

}

function touchmove(e)
{

}

function toggleDebug()
{
	debug = !debug;
}

function startBoid()
{
	var worker = new Worker("workerBoid.js");
}

function getPing(packetId)
{
	if (!myPackets[packetId])
	{
		return;
	}
	
	var ping = performance.now() - myPackets[packetId];
	delete myPackets[packetId];
	return ping;
}

function computeCenter()
{
	center.set(0, 0, 0);
	
	var j = 0;
	var bsz = objects.length;
	for (i=0; i<bsz; i++)
	{
		var object = objects[i];
		if (object instanceof Boid)
		{
			center.x += object.netMobile.root.position.x;
			center.y += object.netMobile.root.position.z;
			j++;
		}
	}

	center.multiplyScalar(1/(j||1));
}

function createExplosion(boidId, radiusMax)
{
	var boid = boidsMap[boidId];
	var explosion = new Explosion(radiusMax);
	explosion.x = boid.netMobile.root.position.x;
	explosion.y = boid.netMobile.root.position.y;
	objects.push(explosion);
	return explosion;
}

function shootLazer(boidId, targetId, hit)
{
	var boid = boidsMap[boidId];
	var target = boidsMap[targetId];
	var lazer = new Lazer(boid.netMobile.root.position, target.netMobile.root.position);
	objects.push(lazer);
	if (hit)
	{
		hitLazer(targetId);
	}
	return lazer;
}

function hitLazer(boidId)
{
	var boid = boidsMap[boidId];
	boid.life = Math.max(boid.life - 0.25, 0);
	if (boid.life == 0)
	{
		boidDie(boidId);
	}
	else
	{
		createExplosion(boidId, 1);
	}
}

function shootMissile(boidId, targetId, hit)
{
	var boid = boidsMap[boidId];
	var target = boidsMap[targetId];
	var missile = new Missile(boid.netMobile.root.position, target.netMobile.root.position, targetId, hit, function(){hitMissile(targetId);});
	objects.push(missile);
	return missile;
}

function hitMissile(boidId)
{
	var boid = boidsMap[boidId];
	boid.life = Math.max(boid.life - 0.5, 0);
	if (boid.life == 0)
	{
		boidDie(boidId);
	}
	else
	{
		createExplosion(boidId, 2);
	}
}

function randomBoid()
{
	var r = randomInt(0, boidsCount-1);
	var i = 0;
	for (var b in boidsMap)
	{
		if (r === i)
		{
			return boidsMap[b];
		}
		i++;
	}
}

function randomInt(min, max)
{
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomHit(successRatio)
{
	return (Math.random()<successRatio ? true : false);
}

function assignTeam(boidId, teamId)
{
	var boid = boidsMap[boidId];
	var team = teams[teamId];
	team.boids.push(boidId);
	boid.team = team;
}

function unassignTeam(boidId)
{
	var boid = boidsMap[boidId];
	var team = boid.team;
	var teamId = team.id;

	boid.team = null;
	for (var i=0; i<team.boids.length; i++)
	{
		if (team.boids[i] === boidId)
		{
			team.boids.splice(i, 1);
			break;
		}
	}
}

function boidDie(boidId)
{
	var explosion = createExplosion(boidId, 3);
	var boid = boidsMap[boidId];
	explosion.color = boid.team.color;
}

setInterval(function(){
	var b1 = (b1 = randomBoid()) && (b1 = b1.id);
	var b2 = (b2 = randomBoid()) && (b2 = b2.id);
	if (b1 !== b2)
	{
		if (Math.random() > 0.5)
		{
			shootLazer(b1, b2, randomHit(0.9));
		}
		else
		{
			shootMissile(b2, b1, randomHit(0.7));
		}
	}
}, 1000);

function getUint64(dataView, offset, littleEndian)
{
	var number = 0;
	for (var i = 0; i < 8; i++)
	{
		number += (dataView.getUint8(offset+i) * Math.pow(2, (littleEndian ? i : 7-i)*8));
	}
	return number;
}
