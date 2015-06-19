function NetGraph(elementId)
{
	this.canvas = document.querySelector("canvas#netgraph");
	this.ctx = this.canvas.getContext('2d');
	var fontSize = 1;
	ctx.font = fontSize+"px serif";

	this.data = [];

	this.min = +Infinity;
	this.max = -Infinity;

	this.canvasTmp = document.createElement("Canvas");
	this.ctxTmp = this.canvasTmp.getContext('2d');
}

NetGraph.prototype.onresize = function()
{
	if (this.canvas.offsetWidth !== this.width || this.canvas.offsetHeight !== this.height)
	{
		this.width = this.canvas.offsetWidth;
		this.height = this.canvas.offsetHeight;
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.canvasTmp.width = this.width;
		this.canvasTmp.height = this.height;
	}
}

NetGraph.prototype.push = function(data)
{
	this.data.push(data);

	while (this.data.length > this.width)
	{
		this.data.shift();
	}

	var min = +Infinity;
	var max = -Infinity;

	for (var i = 0; i < this.data.length; i++)
	{
		var data = this.data[i];
		if (data < min)
		{
			min = data;
		}
		if (data > max)
		{
			max = data;
		}
	}

	var lastMax = this.max;
	var changed = false;
	if (min !== this.min || max != this.max)
	{
		changed = true;
		this.min = min;
		this.max = max;
	}

	this.ctx.restore();
	this.ctx.save();

	this.ctxTmp.clearRect(0, 0, this.canvasTmp.width, this.canvasTmp.height);
	this.ctxTmp.drawImage(this.canvas, 0, 0);

	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

	this.ctx.save();
	this.ctx.translate(1, 0);
	if (changed)
	{
		this.ctx.scale(1, lastMax / this.max);
	}
	this.ctx.drawImage(this.canvasTmp, 0, 0);
	this.ctx.restore();

	this.ctx.translate(0.5, 0.5);
	this.ctx.scale(1, this.canvas.height / this.max);
	
	this.ctx.lineWidth = 1;
	this.ctx.strokeStyle = "#00FF00";
	this.ctx.beginPath();
	this.ctx.moveTo(0, 0);
	this.ctx.lineTo(0, data);
	this.ctx.stroke();
}
