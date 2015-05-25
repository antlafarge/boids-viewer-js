function Character(id, clock)
{
	this.id = id;
	this.name = "";

	this.root = new THREE.Object3D();

	this.clock = clock;

    this.interpData = [];
    this.delay = 0.2;
    this.ex_interp = 0.1;

    this.moveOffset = new THREE.Vector3();
}

Character.prototype.update = function(delta)
{
	this.updateInterp2(delta);
};

Character.prototype.updateNoInterp = function(delta)
{
	var data = this.interpData[this.interpData.length - 1];
	this.root.position.copy(data.position);
	this.root.quaternion.copy(data.orientation);
};

Character.prototype.updateInterp = function(delta)
{
	if (this.interpData.length == 1)
	{
		// when only 1 info, set this info
		var data = this.interpData[0];
		this.root.position.copy(data.position);
		this.root.quaternion.copy(data.orientation);
	}
	else if (this.interpData.length > 1)
	{
		// when more than 1 info, interp
		var i0 = this.interpData[0];
		var i1 = this.interpData[1];

		// time	
		var elapsedTime = ((new Date()) - i1.date) / 1000;
		var maxTime = (i1.date - i0.date) / 1000;
		var factor = elapsedTime / maxTime;

		// position
		var dir = i1.position.clone().sub(i0.position);
		dir.multiplyScalar(factor);
		this.root.position.copy(i0.position).add(dir);

		// orientation
		if (factor < 1)
		{
			THREE.Quaternion.slerp(i0.orientation, i1.orientation, this.root.quaternion, factor);
		}
		else
		{
			this.root.quaternion.copy(i1.orientation);
		}

		// clean
		if (elapsedTime >= maxTime)
		{
			this.interpData.shift();
		}
	}
}

Character.prototype.updateInterp2 = function(delta)
{
	// get current time
	var time = this.clock.getElapsedTime();

	// clean old updates (older than 1 second)
	while (this.interpData.length && (time - this.interpData[0].time) > 1)
	{
		this.interpData.shift();
	}

	// INTERP
	if (this.interpData.length < 2)
	{
		return;
	}

	var targetTime = time - this.delay;
	var i0, i1;
	var i = this.interpData.length - 1;
	while (i--)
	{
		i0 = this.interpData[i];
		i1 = this.interpData[i + 1];
		if (targetTime >= i0 && targetTime <= i1.time)
		{
			break;
		}
	}

	var timeTotal = (i1.time - i0.time);
	var timePassed = Math.min(targetTime - i0.time, timeTotal + this.ex_interp);
	var factor = Math.max(timePassed / timeTotal, 0);

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
