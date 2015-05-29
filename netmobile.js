function NetMobile(id)
{
	this.id = id;
	this.name = "";

	this.root = new THREE.Object3D();

    this.interpData = [];

    this.ex = false;
    this.desync = false;

    this.moveOffset = new THREE.Vector3();
}

NetMobile.interp = true;
NetMobile.delay = 0.4;
NetMobile.ex_interp = 2;
NetMobile.historyDelay = 3;

NetMobile.prototype.update = function(delta, time)
{
	if (NetMobile.interp)
	{
		this.updateInterp(delta, time);
	}
	else
	{
		this.updateNoInterp(delta, time);
	}
};

NetMobile.prototype.updateNoInterp = function(delta, time)
{
	if (this.interpData.length)
	{
		var data = this.interpData.pop();
		this.root.position.copy(data.position);
		this.root.quaternion.copy(data.orientation);
	}
};

NetMobile.prototype.updateInterp = function(delta, time)
{
	// clean old updates (older than 1 second)
	while (this.interpData.length && (time - this.interpData[0].time) > NetMobile.historyDelay)
	{
		this.interpData.shift();
	}

	if (this.interpData.length < 2)
	{
		return;
	}

	var targetTime = time - NetMobile.delay;
	var i = this.interpData.length - 1;
	var i0, i1;
	while (i--)
	{
		i0 = this.interpData[i];
		i1 = this.interpData[i + 1];
		if (targetTime >= i0.time)
		{
			break;
		}
	}

	var timeTotal = (i1.time - i0.time);
	var timePassed = Math.min(targetTime - i0.time, timeTotal + NetMobile.ex_interp);
	var factor = Math.max(timePassed / timeTotal, 0);

	// lerp position
	this.root.position.lerpVectors(i0.position, i1.position, factor);

	// slerp orientation
	THREE.Quaternion.slerp(i0.orientation, i1.orientation, this.root.quaternion, factor);

	if (factor > 1)
	{
		this.ex = true;
		if (targetTime > i1.time + NetMobile.ex_interp)
		{
			this.desync = true;
		}
		else
		{
			this.desync = false;
		}
	}
	else
	{
		this.ex = false;
		this.desync = false;
	}
}

NetMobile.prototype.pushInterpData = function(data)
{
	if (this.interpData.length === 0)
	{
		this.root.position.copy(data.position);
		this.root.quaternion.copy(data.orientation);
	}

	// push update in history
	if (!this.interpData.length || data.time > this.interpData[this.interpData.length-1].time)
	{
		this.interpData.push(data);
	}
}
