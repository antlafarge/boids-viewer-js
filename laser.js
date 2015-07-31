function Laser(position, target, hit)
{
	this.position = position.clone();
	this.target = target.clone();
	if (hit)
	{
		this.target.sub(position).add(position);
	}
	else
	{
		var failFactor = 5;
		var failVector = new THREE.Vector3((Math.random() - 0.5) * failFactor, (Math.random() - 0.5) * failFactor).normalize();
		this.target.add(failVector).sub(position).normalize().multiplyScalar(1000).add(position);
	}
	this.disappear = false;
	this.rot = 0;
	this.alpha = 0;
}

Laser.prototype.update = function(delta, time)
{
	if (!this.disappear)
	{
		this.alpha += (128*delta);
		if (this.alpha > 1)
		{
			this.alpha = 1;
			this.disappear = true;
		}
	}
	else
	{
		this.alpha -= (2*delta);
		if (this.alpha < 0)
		{
			return true;
		}
	}
};

Laser.prototype.draw = function()
{
	ctx.lineWidth = 0.2;
	ctx.strokeStyle = "#FFF";
	ctx.beginPath();
	ctx.moveTo(this.position.x, this.position.y);
	ctx.lineTo(this.target.x, this.target.y);
	ctx.globalAlpha = this.alpha;
	ctx.stroke();
	ctx.globalAlpha = 1;
};
