function Missile(position, targetRef, targetId, hit, hitCallback)
{
	this.position = position.clone();
	this.targetRef = targetRef;
	this.disappear = false;
	this.lost = false;
	this.lostTime = 5000;
	this.speed = 32;
	this.targetId = targetId;
	this.hit = hit;
	this.offset = position.clone();
	this.lastOffset = position.clone();
	this.hitCallback = hitCallback;
}

Missile.prototype.update = function(delta, time)
{
	if (!this.lost)
	{
		this.lastOffset.copy(this.offset);
		this.offset = this.offset.copy(this.targetRef).sub(this.position);
		var length = this.offset.length();
		this.offset.normalize().multiplyScalar(this.speed*delta);
		var length2 = this.offset.length();
		if (length > length2)
		{
			this.position.add(this.offset);
		}
		else
		{
			this.lost = true;
			this.lastOffset.normalize();
			if (this.hit)
			{
				this.hitCallback();
				return true;
			}
		}
	}
	else
	{
		this.position.add(this.offset.copy(this.lastOffset).multiplyScalar(this.speed*delta));
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
	ctx.fillStyle = "#FFFFFF";
	ctx.fillRect(this.position.x, this.position.y, dotSize, dotSize);
};
