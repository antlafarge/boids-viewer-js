function AuthenticatorService(client)
{
	this._client = client;
	this.authenticatorSceneName = "authenticator";
	this.loginRoute = "login";

	this.authenticatorSceneConnecter;
	this.authenticatorSceneGetter;
}

Stormancer.Client.prototype.authenticator = function()
{
	return new AuthenticatorService(this);
}

AuthenticatorService.prototype.loginAsViewer = function()
{
	return this.login({
		provider: "viewer"
	});
}

AuthenticatorService.prototype.login = function(authenticatorContext)
{
	return new Promise(function(resolve, reject) {
		this.ensureAuthenticatorSceneConnected().then(function() {
			var rpcService = this._authenticatorScene.getComponent("rpcService");

			var onvalue = function(packet) {
				var loginResult = packet.readObject();
				console.log(loginResult);
				if (!loginResult.Success)
				{
					throw "MatchMaker login failed: Invalid credential (" + loginResult.ErrorMsg + ")";
				}

				this.sceneResultPromise = this._client.getScene(loginResult.Token);
				this.sceneResultPromise.then(function(scene) {
					resolve(scene);
				}, function(error) {
					console.error(error)
				});
			}.bind(this);

			var onerror = function(error) {
				console.log("error", error)
				reject(error);
			};

			var oncomplete = function() {
				console.log("complete")
			};

			rpcService.rpc(this.loginRoute, authenticatorContext, onvalue, onerror, oncomplete, Stormancer.PacketPriority.HIGH_PRIORITY);

		}.bind(this));
	}.bind(this));
}

AuthenticatorService.prototype.ensureAuthenticatorSceneConnected = function(login, password)
{
	this.ensureAuthenticatorSceneExists();

	if (this.authenticatorSceneConnecter == null)
	{
		this.authenticatorSceneConnecter = new Promise(function(resolve, reject) {
			this.authenticatorSceneGetter.then(function(scene) {
				console.log("connected");
	        	return scene.connect().then(function() {
	        		resolve(scene);
	        	});
		    });
		}.bind(this));
	}

	return this.authenticatorSceneConnecter;
}

AuthenticatorService.prototype.ensureAuthenticatorSceneExists = function(login, password)
{
	if (this.authenticatorSceneGetter == null)
	{
		this.getAuthenticatorScene().then(function(scene) {
			return this._authenticatorScene = scene;
		}.bind(this));
	}

	return this.authenticatorSceneGetter;
}

AuthenticatorService.prototype.getAuthenticatorScene = function()
{
	return this.authenticatorSceneGetter = this._client.getPublicScene(this.authenticatorSceneName);
}

AuthenticatorService.prototype.logout = function()
{
	return this.ensureAuthenticatorSceneConnected().then(function() {
		console.log("connected")
		if (this._authenticatorScene)
		{
			if (this._authenticatorScene.connected)
			{
				this._authenticatorScene.disconnect();
			}
			this._authenticatorScene = null;
		}
	}.bind(this));
}
