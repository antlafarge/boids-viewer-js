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

var boids = {};

var worldZoom = 3;

window.onresize = onResize;
window.onload = main;

Checker.addChecker("deltaReceive", 190, 210);
Checker.addChecker("ping", 1, 500);

var config;
var client;
var scene;

function main()
{
	onResize();
	requestRender();
	
	config = Stormancer.Configuration.forAccount(accountId, applicationName);
	client = new Stormancer.Client(config);
	client.getPublicScene(sceneName, "{isObserver:false}").then(function(sc) {
		scene = sc;
		//scene.registerRoute("clock", onClock);
		//scene.registerRoute("ship.add", onBoidAdded);
		scene.registerRoute("ship.remove", onBoidRemoved);
		scene.registerRouteRaw("position.update", onBoidUpdate);
		scene.registerRoute("ship.me", onMyBoid);
		return scene.connect().then(function() {
			console.log("CONNECTED");
			scene.send("clock", Date.now());
		});
	});
	
	//startBoid();
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
	var euler = new THREE.Euler();
	for (var id in boids)
	{
		var boid = boids[id];
		boid.update(delta, time);
		var x = boid.root.position.x;
		var y = boid.root.position.y;
		var rot = euler.setFromQuaternion(boid.root.quaternion, 'YZX').y;
		if (debug)
		{
			drawPoints(boid);
		}
		placeBoid(id, x, y, rot, boid.ex, boid.desync);
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

function drawPoints(boid)
{
	var dotSize = 0.5;
	for (var i=boid.interpData.length-1; i>=0 && i < NetMobile.nbPointsToDraw; i--)
	{
		var interpFrame = boid.interpData[i];
		ctx.fillStyle = "#777777";
		ctx.fillRect(interpFrame.position.x, interpFrame.position.y, dotSize, dotSize);
	}
}

function drawBoidsAveragePoint()
{
	computeCenter();
	
	var dotSize = 1;
	ctx.fillStyle = "#FF0000";
	ctx.fillRect(center.x, center.y, dotSize, dotSize);
}

function placeBoid(id, x, y, rot, ex, desync)
{
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot);
	drawBoid(id, ex, desync);
	ctx.restore();
}

function drawBoid(id, ex, desync)
{
	ctx.scale(0.5, 0.5);
	ctx.beginPath();
	ctx.moveTo(-3, -2);
	ctx.lineTo(-3, +2);
	ctx.lineTo(+3, +0);
	if (debug)
	{
		if (desync)
		{
			ctx.fillStyle = "#FF0000";
		}
		else if (ex)
		{
			ctx.fillStyle = "#FFFF00";
		}
		else
		{
			ctx.fillStyle = "#00DD00";
		}
	}
	else
	{
		ctx.fillStyle = "#DDDDDD";
	}
	ctx.fill();
/*
	ctx.save();
	ctx.scale(0.5, 0.5);
	ctx.rotate(Math.PI / 2)
	ctx.fillStyle = "#DDDDDD";
	ctx.fillText(id, 0, 0);
	ctx.restore();
*/
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
	
	var boid = new NetMobile(data.id);
	
	boid.pushInterpData({
		time: data.time,
		position: new THREE.Vector3(data.x, data.y, 0),
		orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), data.rot)
	});
	
	boids[data.id] = boid;
}

function onBoidRemoved(data)
{
	var id = data;
	delete boids[id];
}

var lastPacketId;
function onBoidUpdate(dataView)
{
	var deltaReceive = deltaReceiveClock.getDelta() * 1000;
	var netTime = timer.getElapsedTime();
	deltaReceiveAvg.push(deltaReceive);
	$("#deltaReceive").text(deltaReceive.toFixed(4)+"...");
	$("#deltaReceiveAvg").text(deltaReceiveAvg.value.toFixed(4)+"...");
	//Checker.check("deltaReceive", deltaReceive);

	var packetId = dataView.getUint8(0);
	$("#packetId").text(packetId);
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
		if (!boids[id])
		{
			boids[id] = new NetMobile(id);
		}
		var x = dataView.getFloat32(i+2, true);
		var y = dataView.getFloat32(i+6, true);
		var rot = dataView.getFloat32(i+10, true);
		time = dataView.getUint32(i+14, true) / 1000;
		var boidPacketId = dataView.getUint32(i+18, true);
		
		var ping;
		if (ping = getPing(boidPacketId))
		{
			$("#ping").text(ping.toFixed(4)+"...");
			netgraph.push(ping);
		}
		
		var boid = boids[id];
		boid.pushInterpData({
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

	if (lastPacketId && packetId != ((lastPacketId + 1) % 256))
	{
		console.error((packetId - lastPacketId - 1) ,"packets missing, previouspacketId", lastPacketId, ", currentpacketId", packetId, ", at time", (new Date()));
	}
	lastPacketId = packetId;
}

function onMyBoid(data)
{
	if (data instanceof Array)
	{
		data.id = data[0];
		data.rot = data[1];
		data.x = data[2];
		data.y = data[3];
	}
	
	console.log(data);
	myId = data.id;
	myBoid = new NetMobile(myId);
	boids[myId] = myBoid;
	
	var id = data.id;
	var packetId = 0;
	var packetSize = 22;
	var len = 20;
	var time = 0;
	var x = data.x;
	var y = data.y;
	var rot = data.rot;
	var buffer;
	var dataView;
	
	var lastSend = performance.now();
	Checker.addChecker("deltaSend", 190, 210);
	var deltaSendAvg = new Average();
	
	var offset = (Math.random() * 2 * Math.PI);

	var speed = 25;
	var drMax = Math.PI / 32;
	var dr;
	var space = 10;

	function flock()
	{
		var dX = 0;
		var dY = 0;

		for (var i in boids)
		{
			var boid = boids[i];

			var distance = myBoid.root.position.distanceTo(boid.root.position);

			if (distance < space)
			{
				dX += (myBoid.root.position.x - boid.root.position.x);
				dY += (myBoid.root.position.y - boid.root.position.y);
			}
			else
			{
				dX += ((boid.root.position.x - myBoid.root.position.x) * 0.05);
				dY += ((boid.root.position.y - myBoid.root.position.y) * 0.05);
			}
		}

		//var centerDistance = myBoid.root.position.length();

		dX += (-myBoid.root.position.x * Math.abs(myBoid.root.position.x) * 0.05);
		dY += (-myBoid.root.position.y * Math.abs(myBoid.root.position.y) * 0.05);

		var tr = Math.atan2(dY, dX);

		dr = tr - rot;

		if (dr < -Math.PI)
		{
			dr += 2 * Math.PI;
		}
		else if (dr > Math.PI)
		{
			dr -= 2 * Math.PI;
		}

		dr *= 0.1;
	}

	function checkSpeed()
	{
		if (dr > drMax)
		{
			dr = drMax;
		}
		else if (dr < -drMax)
		{
			dr = -drMax;
		}
	}

	setInterval(function() {
		computeCenter();
		
		time = timer.getElapsedTime();

		var sendNow = performance.now();
		var deltaSend = sendNow - lastSend;
		deltaSendAvg.push(deltaSend);
		Checker.check("deltaSend", deltaSend);
		$("#deltaSend").text(deltaSend.toFixed(4)+"...");
		$("#deltaSendAvg").text(deltaSendAvg.value.toFixed(4)+"...");
		lastSend = sendNow;

		myPackets[packetId] = sendNow;

		/*flock();
		checkSpeed();
		rot += dr;
		var dt = deltaSend / 1000;
		var dx = Math.cos(rot) * speed * dt;
		var dy = Math.sin(rot) * speed * dt;
		x = myBoid.root.position.x + dx;
		y = myBoid.root.position.y + dy;*/

		var time2 = time + offset;
		x = len * Math.cos(time2);
		y = len * Math.sin(time2);
		rot = Math.acos(x / len);
		if (y < 0)
		{
			rot = 2*Math.PI - rot;
		}
		rot += Math.PI/2;
		
		buffer = new ArrayBuffer(packetSize);
		dataView = new DataView(buffer);
		
		dataView.setUint16(0, id, true);
		dataView.setFloat32(2, x, true);
		dataView.setFloat32(6, y, true);
		dataView.setFloat32(10, rot, true);
		dataView.setUint32(14, parseInt(time*1000), true);
		dataView.setUint32(18, packetId, true);
		
		packetId++;
		
		scene.sendPacket("position.update", new Uint8Array(buffer), Stormancer.PacketPriority.MEDIUM_PRIORITY, Stormancer.PacketReliability.RELIABLE_packetIdUENCED);
	}, 200);
}

function computeCenter()
{
	center.set(0, 0, 0);
	
	var i = 0;
	for (var b in boids)
	{
		var boid = boids[b];
		center.x += boid.x;
		center.y += boid.y;
		i++;
	}
	
	center.multiply(1/i);
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
	
	var i = 0;
	for (var b in boids)
	{
		var boid = boids[b];
		center.x += boid.x;
		center.y += boid.y;
		i++;
	}
	
	center.multiply(1/i);
}
