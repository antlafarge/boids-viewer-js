function clearCanvas()
{
	ctx.fillStyle = "#000022";
	ctx.fillRect(0, 0, width, height);
}

function drawOrigin()
{
	var originSize = 8;

	ctx.beginPath();
	ctx.moveTo(width / 2 - originSize, height / 2);
	ctx.lineTo(width / 2 + originSize, height / 2);
	ctx.strokeStyle = "#777777";
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(width / 2, height / 2 - originSize);
	ctx.lineTo(width / 2, height / 2 + originSize);
	ctx.strokeStyle = "#777777";
	ctx.stroke();
}

function drawPoints(boid)
{
	var dotSize = 2;
	for (var i in boid.interpData)
	{
		ctx.fillStyle = "#FFFFFF";
		ctx.fillRect(computeX(boid.interpData[i].position.x), computeY(boid.interpData[i].position.y), dotSize, dotSize);
	}
}

function placeBoid(x, y, rot, ex)
{
	ctx.save();
	ctx.translate(computeX(x), computeY(y));
	ctx.rotate(rot);
	drawBoid(ex);
	ctx.restore();
}

function drawBoid(ex)
{
	ctx.beginPath();
	ctx.moveTo(-6, -4);
	ctx.lineTo(-6, +4);
	ctx.lineTo(+6, +0);
	if (ex)
	{
		ctx.fillStyle = "#FF0000";
	}
	else
	{
		ctx.fillStyle = "#EEEEEE";
	}
	ctx.fill();
}

function createShip(id)
{
	var boid = new Character(id, clock);
	boids[id] = boid;
	return boid;
}

function updateShip(id, x, y, rot)
{
	var boid = boids[id];
	boid.pushInterpolationInfo({
		time: nextTime,
		position: new THREE.Vector3(x, y, 0),
		orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
	});
}

var t = 0;
var lt = 0;
var averageDelta = 0.2;
var nextTime = 0;

function onShipUpdate(data, buffer)
{
	var dataView = new DataView(buffer);
	var i = 3;
	var nb = 0;
	while (i < buffer.byteLength)
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
		i += 14;
		nb++;
	}
//console.log("nbChipsUpdated\t"+nb);

	lt = t;
	t = clock.getElapsedTime();
	var delta = (t - lt);
	averageDelta += (delta - averageDelta) * 0.2;
console.log("time\t"+t + "\t\t" + delta);
	nextTime = t + 0.2;//averageDelta;
}

function onShipRemoved(data)
{
	delete boids[data];
}

function onShipAdded(data)
{
	var id = data[0];
	var x = data[1];
	var y = data[2];
	var rot = data[3];

	var boid = createShip(id);
	boid.pushInterpolationInfo({
		time: clock.getElapsedTime(),
		position: new THREE.Vector3(x, y, 0),
		orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
	});
}

var canvas = document.querySelector("canvas");
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
var width = canvas.offsetWidth;
var height = canvas.offsetHeight;
var ctx = canvas.getContext('2d');
var clock = new THREE.Clock();
var worldZoom = 3;

function onResize(event) {
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	width = canvas.offsetWidth;
	height = canvas.offsetHeight;
};
window.onresize = onResize;
window.onload = onResize;
onResize();

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

var boids = {};

function requestRender()
{
	render();
	window.requestAnimationFrame(requestRender);
}

function render()
{
	var delta = clock.getElapsedTime();
	clearCanvas();
	drawOrigin();
	var euler = new THREE.Euler();
	for (var id in boids)
	{
		var boid = boids[id];
		boid.update(delta);
		var x = boid.root.position.x;
		var y = boid.root.position.y;
		var rot = euler.setFromQuaternion(boid.root.quaternion, 'YZX').y;
		placeBoid(x, y, rot, boid.ex);
		drawPoints(boid);
	}
}

function computeX(x)
{
	return width / 2 + worldZoom * x;
}

function computeY(y)
{
	return height / 2 + worldZoom * y;
}

requestRender();
