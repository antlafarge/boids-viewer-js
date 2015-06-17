function Average()
{
	this.value = 0;
	this.count = 0;
}

Average.prototype.push = function(newValue)
{
	this.count++;
	this.value = (this.count * this.value + newValue) / (this.count + 1);
}
