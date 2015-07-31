var debug = false;

if (window.location.href.indexOf("localhost"))
{
	Stormancer.Configuration.apiEndpoint = "http://localhost:8081";
}
/*
var accountId = "997bc6ac-9021-2ad6-139b-da63edee8c58";
var applicationName = "boids-test";
var sceneName = "main";
*/
var accountId = "test";
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
var maxPv = 50;

var myPackets = {};
var myId;

var objects = [];
var boidsMap = {};
var boidsCount = 0;
var teams = [];
var teamColorsSet = ["#D00", "#0BF", "#DD0", "#3D3"];

var worldZoom = 6;

window.onresize = onResize;
window.onload = main;

//Checker.addChecker("deltaReceive", 190, 210);
//Checker.addChecker("ping", 1, 500);

var config;
var client;
var scene;

function toggleDebugInfos()
{
	$("table.bl").toggle();
}

function main()
{
	//toggleDebugInfos();
	toggleDebug();
	$("#debugCheckbox").prop('checked', true);

	onResize();
	requestRender();
	
	config = Stormancer.Configuration.forAccount(accountId, applicationName);
	client = new Stormancer.Client(config);
	client.getPublicScene(sceneName, "{isObserver:true}").then(function(sc) {
		scene = sc;
		scene.registerRoute("ship.usedSkill", onUsedSkill);
		scene.registerRoute("ship.statusChanged", onBoidStatusChanged);
		scene.registerRoute("ship.add", onBoidAdded);
		scene.registerRoute("ship.remove", onBoidRemoved);
		scene.registerRouteRaw("ship.pv", onPv);
		scene.registerRouteRaw("position.update", onBoidUpdate);
		//scene.registerRoute("ship.me", onMyBoid);
		return scene.connect().then(function() {
			console.log("CONNECTED");
			setInterval(syncClock, 1000);
		});
	});
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
	ctx.scale(worldZoom, -worldZoom);
	ctx.translate(cameraPosition.x, cameraPosition.y);
	drawOrigin();
	drawBoidsAveragePoint();
	var osz = objects.length;
	for (var i=0; i<osz; )
	{
		var object = objects[i];
		if (object.update(delta, time))
		{
			objects.splice(i, 1);
			osz = objects.length;
		}
		else
		{
			object.draw();
			i++
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

var clockSet = false;
function syncClock()
{
	var serverTime = client.clock() / 1000;
	if (!clockSet && serverTime)
	{
		timer.elapsedTime = serverTime;
		clockSet = true;
		console.log("serverClock", timer.elapsedTime);
	}
}

function onBoidAdded(dataArray)
{
	console.error("onBoidAdded!", dataArray)
	for (var b = 0; b < dataArray.length; b++)
	{
		var data = dataArray[b];
		if (data instanceof Array)
		{
			data.id = data[0];
			data.rot = data[1];
			data.status = data[2];
			data.team = data[3];
			data.weapons = data[4];
			data.x = data[5];
			data.y = data[6];
			for (var w = 0; w < data.weapons.length; w++)
			{
				var weapon = data.weapons[w];
				weapon.coolDown = weapon[0];
				weapon.damage = weapon[1];
				weapon.fireTimestamp = weapon[2];
				weapon.id = weapon[3];
				weapon.precision = weapon[4];
				weapon.range = weapon[5];
			}
		}
		console.log("onBoidAdded", data)

		var boid = new Boid(data.id, data.team);
		boid.data = data;
		boid.status = data.status;
		boid.weapons = data.weapons;
		boid.netMobile.root.position.x = data.x;
		boid.netMobile.root.position.y = data.y;

		boidsMap[data.id] = boid;
		if (data.team)
		{
			assignTeam(data.id, data.team);
		}

		boidsCount++;
		$("#boidsCount").text(boidsCount);
	}
}

function onBoidRemoved(data)
{
	console.log("onBoidRemoved", "#"+data)
	var boidId = data;
	var boid = boidsMap[boidId];

	if (!boid)
	{
		console.warn("onBoidRemoved", "boid #"+data+" not found!")
		return;
	}

	var index = objects.indexOf(boid);
	if (index !== -1)
	{
		objects.splice(index, 1);
		delete boidsMap[boidId];
		$("#boidsCount").text(boidsCount);
	}
}

function onUsedSkill(data)
{
	console.log("onUsedSkill", data)
	if (!boidsMap[data.origin] || !boidsMap[data.shipId])
	{
		if (!boidsMap[data.origin])
		{
			console.warn("boid #" + data.origin + " is not found!");
		}
		if (!boidsMap[data.shipId])
		{
			console.warn("boid #" + data.shipId + " is not found!");
		}
		return;
	}

	if (data.weaponId === "canon")
	{
		shootLaser(data.origin, data.shipId, data.success);
	}
	else
	{
		shootMissile(data.origin, data.shipId, data.success);
	}
}

function onPv(dataView)
{
	var boidId = dataView.getUint16(0, true);
	var diff = dataView.getInt32(2, true);

	console.log("onPv", "#"+boidId, diff);

	var boid = boidsMap[boidId];
	if (!boid)
	{
		console.warn("onPv", "boid #"+boidId+" not found!");
		return;
	}

	boid.pv += (diff / maxPv);
}

function onBoidStatusChanged(data)
{
	console.log("onBoidStatusChanged", data)
	var boid = boidsMap[data.shipId];

	if (!boid)
	{
		console.warn("onBoidStatusChanged", "boid #"+data.shipId+" not found!");
		return;
	}

	if (data.status === "Waiting")
	{
		//
	}

	if (data.status === "InGame")
	{
		if (objects.indexOf(boid) === -1)
		{
			objects.push(boid);
		}
	}
	else
	{
		var index = objects.indexOf(boid);
		if (index !== -1)
		{
			objects.splice(index, 1);
		}
	}

	if (data.status === "Dead")
	{
		if (boid.status === "InGame")
		{
			boidDie(boid.id);
		}
	}

	boid.status = data.status;
}

var frameSize = 22;
function onBoidUpdate(dataView)
{
	for (var i = 0; dataView.byteLength - i >= frameSize; i += frameSize)
	{
		var id = dataView.getUint16(i, true);
		var x = dataView.getFloat32(i+2, true);
		var y = dataView.getFloat32(i+6, true);
		var rot = dataView.getFloat32(i+10, true);
		var time = getUint64(dataView, i+14, true) / 1000;
		console.log("onBoidUpdate", "#"+id, "time: ", time)
		
		var boid;
		if (!(boid = boidsMap[id]))
		{
			console.warn("onBoidUpdate", "boid #"+id+" not found!");
			continue;
		}
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

function onmousewheel(e)
{
	worldZoom += (e.wheelDelta/120*0.1);
}
document.addEventListener("mousewheel", onmousewheel, false);
document.addEventListener("DOMMouseScroll", onmousewheel, false); // Firefox

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
			center.y += object.netMobile.root.position.y;
			j++;
		}
	}

	center.multiplyScalar(1 / (j || 1));
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

function shootLaser(boidId, targetId, hit)
{
	var boid = boidsMap[boidId];
	var target = boidsMap[targetId];
	var lazer = new Laser(boid.netMobile.root.position, target.netMobile.root.position, hit);
	objects.push(lazer);
	if (hit)
	{
		hitLaser(targetId);
	}
	return lazer;
}

function hitLaser(boidId)
{
	var boid = boidsMap[boidId];
	createExplosion(boidId, 1);
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
	createExplosion(boidId, 2);
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

// TEAM
function Team(id, color)
{
	this.id = id;
	this.color = color;
	this.boids = [];
}

function getTeam(teamId)
{
	if (!teams[teamId])
	{
		teams[teamId] = new Team(teamId, teamColorsSet[teamId % teamColorsSet.length]);
	}
	return teams[teamId];
}

function assignTeam(boidId, teamId)
{
	var boid = boidsMap[boidId];
	var team = getTeam(teamId);
	team.boids.push(boidId);
	boid.color = team.color;
}

function unassignTeam(boidId)
{
	var boid = boidsMap[boidId];
	var teamId = boid.team;
	var team = teams[teamId];

	boid.team = null;
	boid.color = null;

	var index = team.boids.indexOf(boidId);
	if (index !== -1)
	{
		team.boids.splice(index, 1);
	}
}

function boidDie(boidId)
{
	var explosion = createExplosion(boidId, 3);
	var boid = boidsMap[boidId];
	explosion.color = boid.color;
}

function getUint64(dataView, offset, littleEndian)
{
	var number = 0;
	for (var i = 0; i < 8; i++)
	{
		number += (dataView.getUint8(offset+i) * Math.pow(2, (littleEndian ? i : 7-i)*8));
	}
	return number;
}
/*
// BOID FIGHT SIMULATION (CLIENT SIDE)
setInterval(function(){
	var b1 = (b1 = randomBoid()) && (b1 = b1.id);
	var b2 = (b2 = randomBoid()) && (b2 = b2.id);
	if (b1 !== b2)
	{
		if (Math.random() > 0.5)
		{
			shootLaser(b1, b2, randomHit(0.9));
		}
		else
		{
			shootMissile(b2, b1, randomHit(0.7));
		}
	}
}, 1000);
*/
