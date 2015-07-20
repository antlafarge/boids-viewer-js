function Missile(position, targetRef, targetId)
{
	this.position = position.clone();
	this.targetRef = targetRef;
	this.disappear = false;
	this.offset = this.position.clone();
	this.lost = false;
	this.lostTime = 10000;
	this.speed = 32;
	this.targetId = targetId;
}

Missile.prototype.update = function(delta, time)
{
	if (!this.lost)
	{
		this.offset = this.offset.copy(this.targetRef).sub(this.position);
		var length = this.offset.length();
		this.offset.normalize().multiplyScalar(this.speed*delta);
		this.position.add(this.offset);
		if (length < 2)
		{
			this.lost = true;
			if (missileEnd(this.targetId))
			{
				return true;
			}
		}
	}
	else
	{
		this.position.add(this.offset.normalize().multiplyScalar(this.speed*delta));
		this.lostTime -= delta;
		if (this.lostTime < 0)
		{
			return false;
		}
	}
};

Missile.prototype.draw = function()
{
	var dotSize = 1;
	ctx.fillStyle = "#777777";
	ctx.fillRect(this.position.x, this.position.y, dotSize, dotSize);
};
