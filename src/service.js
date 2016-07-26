/*
 * Copyright (c) 2013-2015 LG Electronics
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

//PalmService API featureset

var refs = {};

function LS2Request(uri, params) {
	this.uri = uri;
	params = params || {};
	if(params.method) {
		if(this.uri.charAt(this.uri.length-1) != "/") {
			this.uri += "/";
		}
		this.uri += params.method;
	}
	if(typeof params.onSuccess === 'function') {
		this.onSuccess = params.onSuccess;
	}
	if(typeof params.onFailure === 'function') {
	this.onFailure = params.onFailure;
	}
	if(typeof params.onComplete === 'function') {
	this.onComplete = params.onComplete;
	}
	this.params = (typeof params.parameters === 'object') ? params.parameters : {};
	this.subscribe = params.subscribe || false;
	if(this.subscribe) {
		this.params.subscribe = params.subscribe;
	}
	if(this.params.subscribe) {
		this.subscribe = this.params.subscribe;
	}
	this.resubscribe = params.resubscribe || false;
	this.send();
}

LS2Request.prototype.send = function() {
	if(!window.PalmServiceBridge) {
		this.onFailure && this.onFailure({errorCode:-1, errorText:"PalmServiceBridge not found.", returnValue: false});
		this.onComplete && this.onComplete({errorCode:-1, errorText:"PalmServiceBridge not found.", returnValue: false});
		console.error("PalmServiceBridge not found.");
		return;
	}
	if(this.ts && refs[this.ts]) {
		delete refs[this.ts];
	}
	this.bridge = new PalmServiceBridge();
	var self = this;
	this.bridge.onservicecallback = this.callback = function(msg) {
		var parsedMsg;
		if(self.cancelled) {
			return;
		}
		try {
			parsedMsg = JSON.parse(msg);
		} catch(e) {
			parsedMsg = {
				errorCode: -1,
				errorText: msg,
				returnValue: false
			};
		}
		if((parsedMsg.errorCode || parsedMsg.returnValue==false) && self.onFailure) {
			self.onFailure(parsedMsg);
			if(self.resubscribe && self.subscribe) {
				self.delayID = setTimeout(function() {
					self.send();
				}, LS2Request.resubscribeDelay);
			}
		} else if(self.onSuccess) {
			self.onSuccess(parsedMsg);
		}
		if(self.onComplete) {
			self.onComplete(parsedMsg);
		}
		if(!self.subscribe) {
			self.cancel();
		} else if(self.ts && refs[self.ts]) {
			delete refs[self.ts];
		}
	};
	self.ts = performance.now();
	refs[self.ts] = self;
	this.bridge.call(this.uri, JSON.stringify(this.params));
};

LS2Request.prototype.cancel = function() {
	this.cancelled = true;
	if(this.resubscribeJob) {
		clearTimeout(this.delayID)
	}
	if(this.bridge) {
		this.bridge.cancel();
		this.bridge = undefined;
	}
	if(this.ts && refs[this.ts]) {
		delete refs[this.ts];
	}
};

LS2Request.prototype.toString = function() {
	return "[LS2Request]";
};

LS2Request.resubscribeDelay = 10000;

/**
 * @namespace webOS.service
 */

/**
 * @callback webOS.service~successCallback
 * @param {object} response - JSON object containing the service's response data.
 */
 
/**
  * @callback webOS.service~failureCallback
  * @param {object} error - JSON object containing the service's error details.
  */
 
/**
  * @callback webOS.service~completeCallback
  * @param {object} response - JSON object containing the service's response data; one of either proper 
  *                            response data or error details.
  */

/**
 * @typedef webOS.service~RequestObject
 * @type {object}
 * @property {string} uri - Full service request URI, including method name.
 * @property {object} params - JSON object of the request parameters to send.
 * @property {boolean} subscribe - Whether or not a subscription is desired for this request.
 * @property {boolean} resubscribe - Whether or not the request should resubscribe after a failure has occured.
 * @property {webOS.service~successCallback} onSuccess - Callback for a successful response.
 * @property {webOS.service~failureCallback} onFailure - Callback for a failed response.
 * @property {webOS.service~completeCallback} onComplete - Callback for when a request is complete 
 *                                                         (regardless of success or failure).
 * @property {function} send - Sends off the request. Automatically called on creation. No arguments.
 * @property {function} cancel - Cancels the service request and any associated subscription. No arguments.
 */

webOS.service = {
	/** Creates and sends off a service request to the system
	 * @param {string} uri - Service URI. Accepts the normal service URI format, as well as the extended format with 
	 *                       the service method included.
	 * @param {object} [params] - Service request options.
	 * @param {string} [params.method] - Service method being called.
	 * @param {object} [params.parameters={}] - JSON object of the request parameters to send.
	 * @param {boolean} [params.subscribe=false] - Whether or not a subscription is desired for this request.
	 * @param {boolean} [params.resubscribe=false] - Whether or not the request should resubscribe after a failure 
	 *                                               has occured.
	 * @param {webOS.service~successCallback} [params.onSuccess] - Callback for a successful response.
	 * @param {webOS.service~failureCallback} [params.onFailure] - Callback for a failed response.
	 * @param {webOS.service~completeCallback} [params.onComplete] - Callback for when a request is complete 
	 *                                                        (regardless of success or failure).
	 * @return {webOS.service~RequestObject} Resulting request object. Can be used to cancel subscriptions.
	 */
	request: function (uri, params) {
		return new LS2Request(uri, params);
	},
	/**
	 * System service name prefix
	 * @type {string} 
	 */
	systemPrefix: "com.webos.",
	/**
	 * Service URI protocol
	 * @type {string} 
	 */
	protocol: "luna://"
};
//for unified service request usage between webOS.js and Cordova in enyo-webos components
navigator.service = {request:webOS.service.request};
//temporary fallback for previous syntax
navigator.service.Request = navigator.service.request;
 