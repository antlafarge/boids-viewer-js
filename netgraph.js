function NetGraph(elementId)
{
	this.canvas = document.querySelector("canvas#netgraph");
	this.ctx = this.canvas.getContext('2d');
	var fontSize = 1;
	ctx.font = fontSize+"px serif";

	this.frames = [];
	this.maxFrameSize = 1;
	this.maxPing = 1;
}

NetGraph.prototype.onresize = function()
{
	this.canvas.width = this.canvas.offsetWidth;
	this.canvas.height = this.canvas.offsetHeight;
	this.width = this.canvas.offsetWidth;
	this.height = this.canvas.offsetHeight;
	this.ctx.translate(0.5, 0.5);
}

NetGraph.prototype.push = function(frame)
{
	this.frames.push(frame);

	if (frame.ping > this.maxPing)
	{
		console.log(this.maxPing);
	}
	this.maxFrameSize = Math.max(frame.size, this.maxFrameSize);
	this.maxPing = Math.max(frame.ping, this.maxPing);

	while (this.frames.length > this.width)
	{
		this.frames.shift();
	}
}

NetGraph.prototype.clear = function()
{
	this.ctx.clearRect(0, 0, this.width, this.height);
}

NetGraph.prototype.render = function()
{
	this.clear();

	var length = this.frames.length;
	var end = this.width - length;

	this.ctx.lineWidth = 1;
	this.ctx.strokeStyle = "#FF0000";

	for (var i = 0; i < length; i++)
	{
		var frame = this.frames[i];
		this.ctx.beginPath();
		this.ctx.moveTo(end + i, parseInt(100 * frame.size / this.maxFrameSize));
		this.ctx.lineTo(end + i, this.height - 1);
		this.ctx.stroke();
	}

	this.ctx.lineWidth = 1;
	this.ctx.strokeStyle = "#00FF00";

	for (var i = 0; i < length; i++)
	{
		var frame = this.frames[i];
		this.ctx.beginPath();
		this.ctx.moveTo(end + i, parseInt(100 * frame.ping / this.maxPing));
		this.ctx.lineTo(end + i, this.height);
		this.ctx.stroke();
	}
}
