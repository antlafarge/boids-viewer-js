var debug = true;

var netAverageDelta = 0.2;
var netDataCount = 0;
var netDeltaClock = new THREE.Clock();
var firstUpdateDataReceived = false;

var canvas = document.querySelector("canvas");
var width = canvas.offsetWidth;
var height = canvas.offsetHeight;
var ctx = canvas.getContext('2d');
var clock = new THREE.Clock();

var boids = {};

var worldZoom = 3;

window.onresize = onResize;
window.onload = main;

var config = Stormancer.Configuration.forAccount("997bc6ac-9021-2ad6-139b-da63edee8c58", "boids");
var client = $.stormancer(config);
var scene = null;
client.getPublicScene("main", "{ isObserver:true }").then(function(sc) {
    scene = sc;
    scene.registerRoute("position.update", onShipUpdate);
    scene.registerRoute("ship.remove", onShipRemoved);
    scene.registerRoute("ship.add", onShipAdded);
    return scene.connect().then(function() {
        console.log("CONNECTED");
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
	}
	var euler = new THREE.Euler();
	for (var id in boids)
	{
		var boid = boids[id];
		boid.update(delta, time);
		var x = boid.root.position.x;
		var y = boid.root.position.y;
		var rot = euler.setFromQuaternion(boid.root.quaternion, 'YZX').y;
		drawPoints(boid);
		placeBoid(x, y, -rot, boid.ex, boid.desync);
	}
}

function computeX(x)
{
	return width / 2 + worldZoom * x;
}

function computeY(y)
{
	return height / 2 + worldZoom * -y;
}

function onResize(event)
{
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	width = canvas.offsetWidth;
	height = canvas.offsetHeight;
}

function clearCanvas()
{
	ctx.fillStyle = "#000022";
	ctx.fillRect(0, 0, width, height);
}

function drawOrigin()
{
	var originSize = 2;

	/*ctx.fillStyle = "#777777";
	ctx.fillRect(computeX(0), computeY(0), originSize, originSize);*/

	ctx.strokeStyle = "#777777";
	
	ctx.beginPath();
	ctx.moveTo(computeX(-originSize), computeY(0));
	ctx.lineTo(computeX(+originSize), computeY(0));
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(computeX(0), computeY(-originSize));
	ctx.lineTo(computeX(0), computeY(+originSize));
	ctx.stroke();
}

function drawPoints(boid)
{
	var dotSize = 2;
	for (var i in boid.interpData)
	{
		ctx.fillStyle = "#777777";
		ctx.fillRect(computeX(boid.interpData[i].position.x), computeY(boid.interpData[i].position.y), dotSize, dotSize);
	}
}

function placeBoid(x, y, rot, ex, desync)
{
	ctx.save();
	ctx.translate(computeX(x), computeY(y));
	ctx.rotate(rot);
	drawBoid(ex, desync);
	ctx.restore();
}

function drawBoid(ex, desync)
{
	ctx.beginPath();
	ctx.moveTo(-6, -4);
	ctx.lineTo(-6, +4);
	ctx.lineTo(+6, +0);
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
	ctx.fill();
}

function createShip(id)
{
	var boid = new NetMobile(id);
	boids[id] = boid;
	return boid;
}

function updateShip(id, x, y, rot, time)
{
	var boid = boids[id];
	boid.pushInterpData({
		time: time,
		position: new THREE.Vector3(x, y, 0),
		orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
	});
}

function onShipUpdate(data, buffer)
{
	var netDelta = netDeltaClock.getDelta();
	var netTime = clock.getElapsedTime();
	netDataCount++;
	netAverageDelta = (netDataCount * netAverageDelta + netDelta) / (netDataCount + 1);

	if (buffer.byteLength <= 3) // DELETE THIS LATER
	{
		return;
	}

	var dataView = new DataView(buffer, 3);
	var nbShipsUpdated = 0;
	for (var i = 0; i < dataView.byteLength; i += 18)
	{
		var id = dataView.getUint16(i+0, true);
		if (!boids[id])
		{
			createShip(id);
		}
		var x = dataView.getFloat32(i+2, true);
		var y = dataView.getFloat32(i+6, true);
		var rot = dataView.getFloat32(i+10, true);
		var time = dataView.getUint32(i+14, true) * 0.001;
		if (!firstUpdateDataReceived)
		{
			clock.elapsedTime = time;
			firstUpdateDataReceived = true;
		}
		updateShip(id, x, y, rot, time);
		nbShipsUpdated++;
	}

	if (debug)
	{
		console.log("#" + netDataCount + "\ttime " + netTime + "\tdelta " + netDelta + "\tnetAverageDelta " + netAverageDelta + "\tshipsUpdated " + nbShipsUpdated);
	}
}

function onShipRemoved(data)
{
	var id = data;
	delete boids[id];
}

function onShipAdded(data)
{
/*
	var boid = createShip(data.id);
	boid.pushInterpData({
		time: data.time,
		position: new THREE.Vector3(data.x, data.y, 0),
		orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), data.rot)
	});
*/
}
