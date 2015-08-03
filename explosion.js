function Explosion(radiusMax)
{
	this.x = 0;
	this.y = 0;
	this.radius = 0;
	this.radiusMax = radiusMax || 5;
	this.disappear = false;
	this.alpha = 1;
	this.color = "#FFF";
}

Explosion.prototype.update = function(delta, time)
{
	if (!this.disappear)
	{
		this.radius += 128*delta;
		if (this.radius > this.radiusMax)
		{
			this.radius = this.radiusMax;
			this.disappear = true;
		}
	}
	else
	{
		this.radius += (2 * delta);
		this.alpha -= delta;
		if (this.alpha < 0)
		{
			this.alpha = 0;
			return true;
		}
	}
};

Explosion.prototype.draw = function()
{
	ctx.beginPath();
	ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI, false);
	ctx.fillStyle = this.color;
	//ctx.strokeStyle = "#000";
	ctx.globalAlpha = this.alpha;
	ctx.fill();
	//ctx.stroke();
	ctx.globalAlpha = 1;
};
