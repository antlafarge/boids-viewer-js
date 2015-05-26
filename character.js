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
Character.ex_interp = 0.2;

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
	if (this.interpData.length < 2)
	{
		return;
	}

	// when more than 1 info, interp
	var i0 = this.interpData[0];
	var i1 = this.interpData[1];

	// time	
	var maxTime = (i1.time - i0.time) / 1000;
	var elapsedTime = Math.min((this.clock.getElapsedTime() - i1.time) / 1000, maxTime + Character.delay);
	var factor = Math.max(elapsedTime / maxTime, 0);

	this.ex = false;
	if (factor > 1)
	{
		this.ex = true;
	}

	// position
	var dir = i1.position.clone().sub(i0.position);
	dir.multiplyScalar(factor);
	this.root.position.copy(i0.position).add(dir);

	// orientation
	THREE.Quaternion.slerp(i0.orientation, i1.orientation, this.root.quaternion, factor);

	// clean
	if (elapsedTime >= maxTime)
	{
		this.interpData.shift();
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
