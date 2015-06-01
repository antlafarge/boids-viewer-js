var debug = false;

var netAverageDelta = 0.2;
var netDataCount = 0;
var netDeltaClock = new THREE.Clock();
var estimatedTime = 0;

var canvas = document.querySelector("canvas");
var width = canvas.offsetWidth;
var height = canvas.offsetHeight;
var ctx = canvas.getContext('2d');
var clock = new THREE.Clock();

var boids = {};

var worldZoom = 3;

window.onresize = onResize;
window.onload = main;

var config = Stormancer.Configuration.forAccount("d81fc876-6094-3d92-a3d0-86d42d866b96", "boids-demo");
var client = $.stormancer(config);
var scene = null;
client.getPublicScene("main-session", "{ isObserver:true }").then(function(sc) {
    scene = sc;
    scene.registerRoute("position.update", onShipUpdate);
    scene.registerRoute("ship.remove", onShipRemoved);
    scene.registerRoute("ship.add", onShipAdded);
    return scene.connect().then(function() {
        console.log("CONNECTED");
    });
});

setInterval(function() {
	estimatedTime = clock.getElapsedTime();
}, 200);

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

	ctx.beginPath();
	ctx.moveTo(computeX(-originSize), computeY(0));
	ctx.lineTo(computeX(+originSize), computeY(0));
	ctx.strokeStyle = "#777777";
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(computeX(0), computeY(-originSize));
	ctx.lineTo(computeX(0), computeY(+originSize));
	ctx.strokeStyle = "#777777";
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

function updateShip(id, x, y, rot)
{
	var boid = boids[id];
	boid.pushInterpData({
		time: estimatedTime,
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
	//estimatedTime = netTime;

	if (buffer.byteLength <= 3) // DELETE THIS LATER
	{
		return;
	}

	var dataView = new DataView(buffer, 3);
	var nbShipsUpdated = 0;
	for (var i = 0; i < dataView.byteLength; i += 14)
	{
		var id = dataView.getUint16(i+0, true);
		if (!boids[id])
		{
			createShip(id);
		}
		var x = dataView.getFloat32(i+2, true);
		var y = dataView.getFloat32(i+6, true);
		var rot = dataView.getFloat32(i+10, true);
		updateShip(id, x, y, rot);
		nbShipsUpdated++;
	}

	if (debug)
	{
		console.log("time " + netTime + "\tdelta " + netDelta + "\tnetAverageDelta " + netAverageDelta + "\tshipsUpdated " + nbShipsUpdated);
	}
}

function onShipRemoved(data)
{
	delete boids[data];
}

function onShipAdded(data)
{
	var id = data[0];
	var rot = data[1];
	var x = data[2];
	var y = data[3];

	var boid = createShip(id);
	boid.pushInterpData({
		time: clock.getElapsedTime(),
		position: new THREE.Vector3(x, y, 0),
		orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
	});
}
