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
		//scene.registerRoute("clock", onClock);
		//scene.registerRoute("ship.add", onBoidAdded);
		scene.registerRoute("ship.remove", onBoidRemoved);
		scene.registerRouteRaw("position.update", onBoidUpdate);
		//scene.registerRoute("ship.me", onMyBoid);
		return scene.connect().then(function() {
			console.log("CONNECTED");
			scene.send("clock", Date.now());
		});
	});

	teams.push({id:0, color:"#EEEEEE", boids:[]});
	teams.push({id:1, color:"#DD0000", boids:[]});
	teams.push({id:2, color:"#5555FF", boids:[]});
	teams.push({id:3, color:"#00AA00", boids:[]});
	teams.push({id:4, color:"#CCCC00", boids:[]});
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
	clearCanvas();
	if (debug)
	{
		drawOrigin();
		//drawBoidsAveragePoint();
	}
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
	ctx.fillStyle = "#000022";
	ctx.fillRect(-width/2, -height/2, width, height);
}

function drawOrigin()
{
	var originSize = 0.5;

	/*ctx.fillStyle = "#777777";
	ctx.fillRect(0, 0, originSize, originSize);*/

	ctx.strokeStyle = "#777777";
	
	ctx.beginPath();
	ctx.moveTo(-originSize, 0);
	ctx.lineTo(+originSize, 0);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(0, -originSize);
	ctx.lineTo(0, +originSize);
	ctx.stroke();
}

function drawBoidsAveragePoint()
{
	computeCenter();
	
	var dotSize = 1;
	ctx.fillStyle = "#FF0000";
	ctx.fillRect(center.x, center.y, dotSize, dotSize);
}

function onClock(dataView)
{
/*
	var serverTime = dataView.getUint32();
	var lastTimestamp = dataView.getUint32();
	var timestamp = Date.now();
	var latency = (timestamp - lastTimestamp) / 2;
	timer.elapsedTime = serverTime - latency;
	console.log(serverTime, lastTimestamp, timestamp, latency, timer.elapsedTime);
*/
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

var lastPacketId = 0;
function onBoidUpdate(dataView)
{
	//var deltaReceive = deltaReceiveClock.getDelta() * 1000;
	//var netTime = timer.getElapsedTime();
	//deltaReceiveAvg.push(deltaReceive);
	//$("#deltaReceive").text(deltaReceive.toFixed(4)+"...");
	//$("#deltaReceiveAvg").text(deltaReceiveAvg.value.toFixed(4)+"...");
	//Checker.check("deltaReceive", deltaReceive);

	//var packetId = dataView.getUint8(0);
	//$("#packetId").text(packetId);
	var serverTime = dataView.getUint32(1, true) / 1000;
	//var time = timer.getElapsedTime();
	//var delay = time - serverTime;
	//...
	//console.log(serverTime);
	var time;
	var startByte = 5;
	var frameSize = 22;
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
		time = dataView.getUint32(i+14, true) / 1000;
		var boidPacketId = dataView.getUint32(i+18, true);
		
		if (id === myId)
		{
			var packetIdTmp = lastPacketId;
			do
			{
				var ping;
				if (ping = getPing(boidPacketId))
				{
					$("#ping").text(ping.toFixed(4)+"...");
					netgraph.push(ping);
				}
				else
				{
					$("#ping").text("0");
					netgraph.push(0);	
				}
				packetIdTmp = (packetIdTmp + 1) % 256;
			} while (packetIdTmp !== packetId);
		}
		
		var boid = boidsMap[id];
		boid.netMobile.pushInterpData({
			time: time,
			position: new THREE.Vector3(x, y, 0),
			orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
		});
	}
	if (firstUpdateDataReceived === false)
	{
		timer.elapsedTime = time;
		firstUpdateDataReceived = true;
	}

	//if (lastPacketId && packetId != ((lastPacketId + 1) % 256))
	//{
	//	console.error((packetId - lastPacketId - 1) ,"packets missing, previouspacketId", lastPacketId, ", currentpacketId", packetId, ", at time", (new Date()));
	//}
	//lastPacketId = packetId;
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
	
	var i;
	var bsz = objects.length;
	for (i=0; i<bsz; i++)
	{
		var object = boids[i];
		if (object instanceof Boid)
		{
			center.x += object.x;
			center.y += object.y;
			i++;
		}
	}
	
	center.multiply(1/i);
}

function createExplosion(boidId, radiusMax)
{
	var boid = boidsMap[boidId];
	var explosion = new Explosion(radiusMax);
	explosion.x = boid.netMobile.root.position.x;
	explosion.y = boid.netMobile.root.position.y;
	objects.push(explosion);
}

function shootLazer(boidId, targetId)
{
	var boid = boidsMap[boidId];
	var target = boidsMap[targetId];
	var lazer = new Lazer(boid.netMobile.root.position, target.netMobile.root.position);
	objects.push(lazer);
}

function shootMissile(boidId, targetId, hit)
{
	var boid = boidsMap[boidId];
	var target = boidsMap[targetId];
	var missile = new Missile(boid.netMobile.root.position, target.netMobile.root.position, targetId, hit, function(){createExplosion(targetId,2);});
	objects.push(missile);
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

setInterval(function(){
	var b1 = (b1 = randomBoid()) && (b1 = b1.id);
	var b2 = (b2 = randomBoid()) && (b2 = b2.id);
	if (b1 !== b2)
	{
		if (Math.random() > 0.5)
		{
			shootLazer(b1, b2);
			if (Math.random() > 0.1)
			{
				createExplosion(b2, 1);
			}
		}
		else
		{
			shootMissile(b2, b1, (Math.random()>0.3?true:false));
		}
	}
}, 1000);
