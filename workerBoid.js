importScripts("libs/three.min.js");
importScripts("libs/stormancer.js");

var accountId;
var applicationName;
var sceneName;

var config;
var client;
var scene;

var boids = [];
var firstUpdateDataReceived = false;
var timer = new THREE.Clock();
var renderDeltaClock = new THREE.Clock();
var myBoid = {};
var center = new THREE.Vector3();

self.addEventListener('message', function(e) {
	accountId = e.data.accountId;
	applicationName = e.data.applicationName;
	sceneName = e.data.sceneName;
	start();
});

function start()
{
	config = Stormancer.Configuration.forAccount(accountId, applicationName);
	client = new Stormancer.Client(config);
	client.getPublicScene(sceneName, {isObserver:true}).then(function(sc) {
	    scene = sc;
	    return scene.connect().then(function() {
	    	self.postMessage("connected!");
	    });
	});
}

function onClock(dataView)
{
	var serverTime = dataView.getUint32();
	var lastTimestamp = dataView.getUint32();
	var timestamp = Date.now();
	var latency = (timestamp - lastTimestamp) / 2;
	timer.elapsedTime = serverTime - latency;
}
