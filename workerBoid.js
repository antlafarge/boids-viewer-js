importScripts("libs/jquery-css-deprecated-dimensions-effects-event-alias-offset-wrap.js");
importScripts("libs/three.min.js");
importScripts("libs/stormancer.js");

var accountId = "997bc6ac-9021-2ad6-139b-da63edee8c58";
var applicationName = "boids";
var sceneName = "main";

var config = Stormancer.Configuration.forAccount(accountId, applicationName);
var client = new Stormancer.client(config);
var scene = null;
client.getPublicScene(sceneName, "{isObserver:false}").then(function(sc) {
    scene = sc;
    //scene.registerRoute("clock", onClock);
    //scene.registerRoute("ship.add", onBoidAdded);
    scene.registerRoute("ship.remove", onBoidRemoved);
    scene.registerRouteRaw("position.update", onBoidUpdate);
	scene.registerRoute("ship.me", onMyBoid);
    return scene.connect().then(function() {
    });
});

var boids = [];
var firstUpdateDataReceived = false;
var timer = new THREE.Clock();
var renderDeltaClock = new THREE.Clock();
var myBoid = {};
var center = new THREE.Vector3();

function onClock(dataView)
{
	var serverTime = dataView.getUint32();
	var lastTimestamp = dataView.getUint32();
	var timestamp = Date.now();
	var latency = (timestamp - lastTimestamp) / 2;
	timer.elapsedTime = serverTime - latency;
	console.log(serverTime, lastTimestamp, timestamp, latency, timer.elapsedTime);
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
	
	var boid = {
		id: data.id,
		x: data.x,
		y: data.y,
		rot: data.rot
	};
	
	boids[id] = boid;
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

function onBoidUpdate(dataView)
{
	var serverTime = dataView.getUint32(1, true) / 1000;
	
	var startByte = 5;
	var frameSize = 22;
	for (var i = startByte; dataView.byteLength - i >= frameSize; i += frameSize)
	{
		if (!boids[id])
		{
			boids[id] = new NetMobile(id);
		}
		
		var id = dataView.getUint16(i, true);
		var boid = boids[id];
		
		boid.x = dataView.getFloat32(i+2, true);
		boid.y = dataView.getFloat32(i+6, true);
		boid.rot = dataView.getFloat32(i+10, true);
		boid.time = dataView.getUint32(i+14, true) / 1000;
		boid.packetId = dataView.getUint32(i+18, true);
	}
	
	if (firstUpdateDataReceived === false)
	{
		timer.elapsedTime = time;
		firstUpdateDataReceived = true;
	}
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
	boidsMap[myId] = myBoid;
	boids.push(myBoid);
	
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

		var osz = objects.length;
		for (var i=0; i<osz; i++)
		{
			var boid = objects[i];
			if (boid instanceof Boid)
			{
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
