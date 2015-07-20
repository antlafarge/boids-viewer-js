function Lazer(position, target)
{
	var rel = target.sub(position);
	this.position = position.clone();
	this.target = position.clone().add(rel.normalize().multiplyScalar(1000));
	this.disappear = false;
	this.rot = 0;
	this.alpha = 0;
}

Lazer.prototype.update = function(delta, time)
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

Lazer.prototype.draw = function()
{
	ctx.lineWidth = 0.2;
	ctx.strokeStyle = "rgba(255, 255, 255, "+this.alpha+")";
	ctx.beginPath();
	ctx.moveTo(this.position.x, this.position.y);
	ctx.lineTo(this.target.x, this.target.y);
	ctx.stroke();
	ctx.restore();
};
