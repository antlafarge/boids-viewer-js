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

var boids = {};
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
	delete boids[id];
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
	onBoidAdded(data);
	
	myBoid = boids[data.id];
	
	var id = myBoid.id;
	var packetIndex = 0;
	var packetSize = 22;
	var len = 50;
	var time = 0;
	var x = 0;
	var y = 0;
	var rot = 0;
	var buffer;
	var dataView;
	
	setInterval(function() {
		computeCenter();
		
		time = timer.getElapsedTime();
		x = len * Math.cos(time);
		y = len * Math.sin(time);
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
		dataView.setUint32(18, packetIndex, true);
		
		packetIndex++;
		
		scene.sendPacket("position.update", new Uint8Array(buffer), Stormancer.PacketPriority.MEDIUM_PRIORITY, Stormancer.PacketReliability.RELIABLE_SEQUENCED);
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
