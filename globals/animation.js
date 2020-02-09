/*
 * Copyright 2000-2020 Sergio Rando <segio.rando@yahoo.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

import { MessagePool } from "./../../js-message/globals/message.js"
import { evShow, evHide } from "./../../js-display/globals/display.js"

/** @type {function(function())} */
const fnRequestAnimFrame =
	platform.requestAnimationFrame ||
	platform.webkitRequestAnimationFrame ||
	platform.mozRequestAnimationFrame ||
	platform.oRequestAnimationFrame ||
	platform.msRequestAnimationFrame ||
	function(callback) { platform.setTimeout(callback, 1000 / 30); };

let bRunning = false;
let iFrameTime = 0;
let bInvalidFrame = false;
let iLastTime = 0;

/*
function onFrame() {
	let iTime = getTickCounter();
	this.iFrameTime = iTime;
	this.oCore.event(Event.evFrame, this.oContext, this.iLastTime == 0 ? 0 : (iTime - this.iLastTime));
	this.iLastTime = iTime;

	this.bInvalidFrame = false;
	this.requestFrame();
}

requestFrame() {
	if (!this.bInvalidFrame) {
		this.bInvalidFrame = true;
		this.fnRequestAnimFrame.call(window, this.onFrameCallback);
	}
}
*/

function onAnimationResume() {
	if (!bRunning) {
		bRunning = true;
	}
}

function onAnimationPause() {
	if (bRunning) {
		bRunning = false;
	}
}

MessagePool.register(evShow, onAnimationResume);
MessagePool.register(evHide, onAnimationPause);
