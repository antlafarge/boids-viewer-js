var debug = false;

var accountId = "997bc6ac-9021-2ad6-139b-da63edee8c58";
var applicationName = "boids";
var sceneName = "main";

var deltaReceiveAvg = new Average();
var deltaReceiveClock = new THREE.Clock();
var firstUpdateDataReceived = false;

var canvas = document.querySelector("canvas");
var width = canvas.offsetWidth;
var height = canvas.offsetHeight;
var ctx = canvas.getContext('2d');
var fontSize = 1;
ctx.font = fontSize+"px serif";
var timer = new THREE.Clock();
var renderDeltaClock = new THREE.Clock();
var centerX = 0;
var centerY = 0;

var boids = {};

var worldZoom = 3;

window.onresize = onResize;
window.onload = main;

var config = Stormancer.Configuration.forAccount(accountId, applicationName);
var client = $.stormancer(config);
var scene = null;
client.getPublicScene(sceneName, "{ isObserver:false }").then(function(sc) {
    scene = sc;
    scene.registerRouteRaw("position.update", onBoidUpdate);
    scene.registerRoute("ship.remove", onBoidRemoved);
    //scene.registerRoute("ship.add", onBoidAdded);
	scene.registerRoute("ship.me", onMyBoid);
    //scene.registerRoute("clock", onClock);
    return scene.connect().then(function() {
        console.log("CONNECTED");
        scene.send("clock", Date.now());
    });
});

function main()
{
	onResize();
	requestRender();
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
	centerX = 0;
	centerY = 0;
	var i = 0;
	for (var b in boids)
	{
		var boid = boids[b];
		centerX += boid.root.position.x;
		centerY += boid.root.position.y;
		i++;
	}
	centerX /= i;
	centerY /= i;
	var dotSize = 1;
	ctx.fillStyle = "#FF0000";
	ctx.fillRect(centerX, centerY, dotSize, dotSize);
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

Checker.addChecker("deltaReceive", 190, 210);
Checker.addChecker("ping", 1, 400);

function onBoidUpdate(dataView)
{
	var deltaReceive = deltaReceiveClock.getDelta() * 1000;
	var netTime = timer.getElapsedTime();
	deltaReceiveAvg.push(deltaReceive);
	$("#deltaReceive").text(deltaReceive.toFixed(4)+"...");
	$("#deltaReceiveAvg").text(deltaReceiveAvg.value.toFixed(4)+"...");

	var serverTime = dataView.getUint32(1, true) / 1000;
	//var time = timer.getElapsedTime();
	//var delay = time - serverTime;
	//...
	//console.log(serverTime);
	var nbBoidsUpdated = 0;
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
		var seq = dataView.getUint32(i+18, true);
		var ping;
		if (ping = getPing(id, seq))
		{
			Checker.check("ping", ping);
			$("#ping").text(ping.toFixed(4)+"...");
		}
		
		var boid = boids[id];
		boid.pushInterpData({
			time: time,
			position: new THREE.Vector3(x, y, 0),
			orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
		});

		if (boids[id].seq && boid.seq != seq - 1)
		{
			console.error((seq - boid.seq - 1) ,"packets missing, boid", id, ", previousSeq", boid.seq, ", currentSeq", seq, ", at time", (new Date()));
		}
		boid.seq = seq;
	}
	if (firstUpdateDataReceived === false)
	{
		timer.elapsedTime = time;
		firstUpdateDataReceived = true;
	}

	Checker.check("deltaReceive", deltaReceive);
}

function onBoidAdded(data)
{
/*
	var boid = new NetMobile(id);
	boid.pushInterpData({
		time: data.time,
		position: new THREE.Vector3(data.x, data.y, 0),
		orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), data.rot)
	});
	boids[id] = boid;
*/
}

function onBoidRemoved(data)
{
	var id = data;
	delete boids[id];
}

function toggleDebug()
{
	debug = !debug;
}

// BOID CLIENT
var myBoid = new NetMobile("me");
myBoid.interp = false;
var myBoidStarted = false;
var packets = {};
var id = null;
function onMyBoid(boidInfos)
{
	if (boidInfos instanceof Array)
	{
		boidInfos.id = boidInfos[0];
		boidInfos.x = boidInfos[1];
		boidInfos.y = boidInfos[2];
		boidInfos.rot = boidInfos[3];
	}
	
	id = boidInfos.id;
	var boid = new NetMobile(id);
	boids[id] = boid;
	packets[id] = {};
	
	if (myBoidStarted)
	{
		boid.root.position.set(boidInfos.x, boidInfos.y, 0);
		boid.root.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), boidInfos.rot);
	}
}

function startMyBoid()
{
	if (!scene.connected || myBoidStarted)
	{
		return;
	}
	myBoidStarted = true;
	
	boids["me"] = myBoid;
	
	var packetIndex = 0;
	var len = 20;
	var time = 0;
	var lastSend = performance.now();
	Checker.addChecker("deltaSend", 190, 210);
	var deltaSendAvg = new Average();
	
	setInterval(function() {
		var time = timer.getElapsedTime();
		var x = len * Math.cos(time);
		var y = len * Math.sin(time);
		var rot = Math.acos(x / len);
		if (y < 0)
		{
			rot = 2*Math.PI - rot;
		}
		rot += Math.PI/2;
		var buffer = new ArrayBuffer(22);
		var dataView = new DataView(buffer);
		dataView.setUint16(0, id, true);
		dataView.setFloat32(2, x, true);
		dataView.setFloat32(6, y, true);
		dataView.setFloat32(10, rot, true);
		dataView.setUint32(14, parseInt(time*1000), true);
		dataView.setUint32(18, packetIndex, true);
		packetIndex++;
		
		scene.sendPacket("position.update", new Uint8Array(buffer), Stormancer.PacketPriority.MEDIUM_PRIORITY, Stormancer.PacketReliability.RELIABLE_SEQUENCED);
		myBoid.root.position.set(x, y, 0);
		myBoid.root.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
		
		var sendNow = performance.now();
		var myBoiddeltaSend = (sendNow - lastSend);
		deltaSendAvg.push(myBoiddeltaSend);
		Checker.check("deltaSend", myBoiddeltaSend);
		$("#deltaSend").text(myBoiddeltaSend.toFixed(4)+"...");
		$("#deltaSendAvg").text(deltaSendAvg.value.toFixed(4)+"...");
		lastSend = sendNow;
		
		packets[id][packetIndex] = sendNow;
	}, 200);
}

function getPing(boidId, packetIndex)
{
	if (!packets || !packets[boidId] || !packets[boidId][packetIndex])
	{
		return;
	}
	
	var ping = (performance.now() - packets[boidId][packetIndex]);
	delete packets[boidId][packetIndex];
	return ping;
}
