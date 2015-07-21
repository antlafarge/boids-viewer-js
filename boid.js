function Boid(id, teamId)
{
	this.id = id;
	this.netMobile = new NetMobile(id);
	this._euler = new THREE.Euler();
	this.teamId = teamId;
	this.team = null;
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
	ctx.rotate(rot);

	ctx.scale(0.5, 0.5);
	ctx.beginPath();
	ctx.moveTo(-3, -2);
	ctx.lineTo(-3, +2);
	ctx.lineTo(+3, +0);
	if (debug)
	{
		if (this.netMobile.desync)
		{
			ctx.fillStyle = "#FF0000";
		}
		else if (this.netMobile.ex)
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
		ctx.fillStyle = (this.team && this.team.color) || "#EEEEEE";
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
