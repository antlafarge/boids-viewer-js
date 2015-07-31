function Boid(id, teamId)
{
	this.id = id;
	this.team = teamId;
	this.pv = 1;
	this.status = null;
	this.weapons = [];
	
	this.data = null;

	this.netMobile = new NetMobile(id);
	this._euler = new THREE.Euler();
	this.color = null;
}

Boid.prototype.update = function(delta, time)
{
	this.netMobile.update(delta, time);
};

Boid.prototype.draw = function()
{
	var x = this.netMobile.root.position.x;
	var y = this.netMobile.root.position.y;
	var rot = this._euler.setFromQuaternion(this.netMobile.root.quaternion, 'YZX').y;
	if (debug)
	{
		this.drawPoints(this.netMobile);
	}

	ctx.save();
	ctx.translate(x, y);
	ctx.scale(0.5, 0.5);

	ctx.beginPath();
	ctx.fillStyle = "#000";
	ctx.fillRect(-5,5, 10,1);
	ctx.strokeStyle = "#000";
	ctx.strokeRect(-5,5, 10,1);
	ctx.fillStyle = "#00FF00";
	ctx.fillRect(-5,5, 10*this.pv,1);

	ctx.rotate(rot);
	ctx.beginPath();
	ctx.moveTo(-3, -2);
	ctx.lineTo(-3, +2);
	ctx.lineTo(+3, +0);
	ctx.fillStyle = (this.color || "#EEEEEE");
	ctx.fill();
	ctx.restore();
};

Boid.prototype.drawPoints = function()
{
	var dotSize = 0.5;
	ctx.fillStyle = "#777777";
	for (var i=this.netMobile.interpData.length-1; i>=0 && i < NetMobile.nbPointsToDraw; i--)
	{
		var interpFrame = this.netMobile.interpData[i];
		ctx.fillRect(interpFrame.position.x, interpFrame.position.y, dotSize, dotSize);
	}
};
