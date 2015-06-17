var debug = false;

var accountId = "997bc6ac-9021-2ad6-139b-da63edee8c58";
var applicationName = "boids";
var sceneName = "main";

var netAverageDelta = 0.2;
var netDataCount = 0;
var netDeltaClock = new THREE.Clock();
var firstUpdateDataReceived = false;

var canvas = document.querySelector("canvas");
var width = canvas.offsetWidth;
var height = canvas.offsetHeight;
var ctx = canvas.getContext('2d');
var fontSize = 1;
ctx.font = fontSize+"px serif";
var clock = new THREE.Clock();
var centerX = 0;
var centerY = 0;

var boids = {};

var worldZoom = 3;

window.onresize = onResize;
window.onload = main;

var config = Stormancer.Configuration.forAccount(accountId, applicationName);
var client = $.stormancer(config);
var scene = null;
client.getPublicScene(sceneName, "{ isObserver:true }").then(function(sc) {
    scene = sc;
    scene.registerRouteRaw("position.update", onBoidUpdate);
    scene.registerRoute("ship.remove", onBoidRemoved);
    //scene.registerRoute("ship.add", onBoidAdded);
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
	var delta = clock.getDelta();
	var time = clock.getElapsedTime();
	clearCanvas();
	if (debug)
	{
		drawOrigin();
		drawBoidsAveragePoint();
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
	clock.elapsedTime = serverTime - latency;
	console.log(serverTime, lastTimestamp, timestamp, latency, clock.elapsedTime);
*/
}

function onBoidUpdate(dataView)
{
	var netDelta = netDeltaClock.getDelta();
	var netTime = clock.getElapsedTime();
	netDataCount++;
	netAverageDelta = (netDataCount * netAverageDelta + netDelta) / (netDataCount + 1);

	var serverTime = dataView.getUint32(1, true) / 1000;
	//var time = clock.getElapsedTime();
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
		
		var boid = boids[id];
		boid.pushInterpData({
			time: time,
			position: new THREE.Vector3(x, y, 0),
			orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
		});

		if (boids[id].seq && boid.seq != seq - 1)
		{
			console.error((seq - boid.seq - 1) ,"packets lost, boid", id, ", previousSeq", boid.seq, ", currentSeq", seq, ", at time", (new Date()));
		}
		boid.seq = seq;
	}
	if (firstUpdateDataReceived === false)
	{
		clock.elapsedTime = time;
		firstUpdateDataReceived = true;
	}

	if (netDelta > NetMobile.ex_interp)
	{
		console.error("netDataCount", netDataCount, "\ttime", netTime, "\tdelta", netDelta, "\tnetAverageDelta", netAverageDelta, "\tboidsUpdated ", nbBoidsUpdated);
	}
	else if (netDelta > NetMobile.delay)
	{
		console.warn("netDataCount", netDataCount, "\ttime", netTime, "\tdelta", netDelta, "\tnetAverageDelta", netAverageDelta, "\tboidsUpdated ", nbBoidsUpdated);
	}
	else if (debug)
	{
		//console.log("netDataCount", netDataCount, "\ttime", netTime, "\tdelta", netDelta, "\tnetAverageDelta", netAverageDelta, "\tboidsUpdated ", nbBoidsUpdated);
	}
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

var myBoidStarted = false;
function startMyBoid()
{
	if (myBoidStarted)
	{
		return;
	}
	myBoidStarted = true;
	var config2 = Stormancer.Configuration.forAccount(accountId, applicationName);
	var client2 = $.stormancer(config2);
	var scene2 = null;
	client2.getPublicScene(sceneName, "{ isObserver:false }").then(function(sc) {
		scene2 = sc;
		//scene2.registerRouteRaw("position.update", onBoidUpdate);
		//scene2.registerRoute("ship.remove", onBoidRemoved);
		//scene2.registerRoute("ship.add", onBoidAdded);
		//scene2.registerRoute("clock", onClock);
		scene2.registerRoute("ship.me", onMyBoid);
		return scene2.connect().then(function() {
			console.log("CONNECTED");
			scene2.send("clock", Date.now());
		});
	});
	var sendClock = new THREE.Clock();
	function onMyBoid(boidInfos)
	{
		console.log("My boid:", boidInfos);
		var id = boidInfos.id;
		var boid = new NetMobile(id);
		boids[id] = boid;
		var x = boidInfos.x;
		var y = boidInfos.y;
		var rot = boidInfos.rot;
		var lastX = 0;
		var lastY = 0;
		var packetIndex = 0;
		var len = 20;
		var time = 0;
		setInterval(function() {
			var time = clock.getElapsedTime();
			lastX = x;
			lastY = y;
			x = len * Math.cos(time);
			y = len * Math.sin(time);
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
			scene2.sendPacket("position.update", new Uint8Array(buffer), Stormancer.PacketPriority.MEDIUM_PRIORITY, Stormancer.PacketReliability.RELIABLE_SEQUENCED);
			/*boid.pushInterpData({
				time: time,
				position: new THREE.Vector3(x, y, 0),
				orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
			});*/
			console.log("sent", sendClock.getDelta());
		}, 200);
		boid.root.position.set(x, y, 0);
		boid.root.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
	}
}