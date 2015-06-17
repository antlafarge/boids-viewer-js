function Checker()
{
}

Checker.variables = {};
Checker.addChecker = function(name, min, max)
{
	this.variables[name] = {
		min: (min || -Infinity),
		max: (max || +Infinity)
	};
}

Checker.check = function(name, value)
{
	if (!this.variables[name])
	{
		console.warn("'" + name + "' not added in Checker.");
		this.addChecker(name);
		return;
	}
	
	if (value < this.variables[name].min)
	{
		console.warn(name + " = " + value + " ( < " + this.variables[name].min + " )");
	}
	else if (value > this.variables[name].max)
	{
		console.warn(name + " = " + value + " ( > " + this.variables[name].max + " )");
	}
}
