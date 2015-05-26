function clearCanvas()
{
	ctx.fillStyle = "#222222";
	ctx.fillRect(0, 0, width, height);
}

function drawOrigin()
{
	size = 10;

	ctx.beginPath();
	ctx.moveTo(width / 2 - size, height / 2);
	ctx.lineTo(width / 2 + size, height / 2);
	ctx.strokeStyle = "#FF0000";
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(width / 2, height / 2 - size);
	ctx.lineTo(width / 2, height / 2 + size);
	ctx.strokeStyle = "#FF0000";
	ctx.stroke();
}

function placeBoid(x, y, rot)
{
	ctx.save();
	ctx.translate(width / 2 + x, height / 2 + y);
	ctx.rotate(rot);
	drawBoid();
	ctx.restore();
}

function drawBoid()
{
	ctx.beginPath();
	ctx.moveTo(-6, -4);
	ctx.lineTo(-6, +4);
	ctx.lineTo(+6, +0);
	ctx.fillStyle = "#DDDDDD";
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
		time: clock.getElapsedTime(),
		position: new THREE.Vector3(x, y, 0),
		orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
	});
	boid.rot = rot;
}

function onShipUpdate(data, buffer)
{
	var dataView = new DataView(buffer);
	var i = 3;
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
	}
}

function onShipRemoved(data, buffer)
{
	var dataView = new DataView(buffer);
	var id = dataView.getUint16(0, true);
	delete boids[id];
}

function onShipAdded(data)
{
	var boid = createShip(data.id);
	boid.pushInterpolationInfo({
		time: clock.getElapsedTime(),
		position: new THREE.Vector3(data.x, data.y, 0),
		orientation: (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), data.rot)
	});
	boid.rot = data.rot;
}

var canvas = document.querySelector("canvas");
var width = canvas.width = canvas.offsetWidth;
var height = canvas.height = canvas.offsetHeight;
var ctx = canvas.getContext('2d');
var clock = new THREE.Clock();

function onResize(event) {
	width = canvas.width = canvas.offsetWidth;
	heihght = canvas.height = canvas.offsetHeight;
};
window.onresize = onResize;
window.onload = onResize;

var config = Stormancer.Configuration.forAccount("997bc6ac-9021-2ad6-139b-da63edee8c58", "boids-demo");
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
	for (var id in boids)
	{
		var boid = boids[id];
		boid.update(delta);
		var x = boid.root.position.x;
		var y = boid.root.position.y;
		var rot = (new THREE.Euler()).setFromQuaternion(boid.root.quaternion, 'YZX').y;
		placeBoid(x, y, rot);
	}
}
/*
createShip(0);
updateShip(0, 0, 0, 0);
boids[0].interpData[0].time = clock.getElapsedTime() - 0.2;
updateShip(0, 10, 0, Math.PI / 4);
boids[0].interpData[1].time = clock.getElapsedTime() - 0.1;
updateShip(0, 10, 10, Math.PI / 2);
boids[0].interpData[1].time = clock.getElapsedTime();
*/
requestRender();
