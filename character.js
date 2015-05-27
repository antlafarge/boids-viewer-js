function Character(id, clock)
{
	this.id = id;
	this.name = "";

	this.root = new THREE.Object3D();

	this.clock = clock;

    this.interpData = [];

    this.ex = false;

    this.moveOffset = new THREE.Vector3();
}

Character.delay = 0.2;
Character.ex_interp = 1;
Character.historyDelay = 4;

Character.prototype.update = function(delta)
{
	this.updateInterp(delta);
};

Character.prototype.updateNoInterp = function(delta)
{
	var data = this.interpData.pop();
	if (data)
	{
		this.root.position.copy(data.position);
		this.root.quaternion.copy(data.orientation);
	}
};

Character.prototype.updateInterp = function(delta)
{
	// get current time
	var time = this.clock.getElapsedTime();

	// clean old updates (older than 1 second)
	while (this.interpData.length && (time - this.interpData[0].time) > Character.historyDelay)
	{
		this.interpData.shift();
	}

	if (this.interpData.length < 2)
	{
		return;
	}

	var targetTime = time - Character.delay;
	var i0, i1;
	var i = this.interpData.length - 1;
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
	var timePassed = Math.min(targetTime - i0.time, timeTotal + Character.ex_interp);
	var factor = Math.max(timePassed / timeTotal, 0);

	if (factor > 1)
	{
		this.ex = true;
	}
	else
	{
		this.ex = false;
	}

	this.moveOffset.subVectors(i1.position, i0.position);
	this.moveOffset.multiplyScalar(factor);
	this.root.position.addVectors(i0.position, this.moveOffset);

	THREE.Quaternion.slerp(i0.orientation, i1.orientation, this.root.quaternion, factor);
}

Character.prototype.pushInterpolationInfo = function(data)
{
	if (this.interpData.length === 0)
	{
		this.root.position.copy(data.position);
		this.root.quaternion.copy(data.orientation);
	}

	// push update in history
	this.interpData.push(data);
}
