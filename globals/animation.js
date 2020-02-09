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
import { getTickCounter } from "./../../../include/time.js"
import { CurveFunction, CurveLinear, TimeFunction, TimeForward, TimeValue } from "./../modules/function.js";

export const evAnimation = 'evAnimation';

/** @type {function(function())} */
const fnRequestAnimFrame =
	platform.requestAnimationFrame ||
	platform.webkitRequestAnimationFrame ||
	platform.mozRequestAnimationFrame ||
	platform.oRequestAnimationFrame ||
	platform.msRequestAnimationFrame ||
	function(callback) { platform.setTimeout(callback, 1000 / 30); };

let bRunning = false;
let iAnimationTime = 0;
let bInvalidAnimation = false;
let iLastTime = 0;

function onAnimation() {
	let iTime = getTickCounter();
	iAnimationTime = iTime;
	MessagePool.recv(evAnimation, iAnimationTime, iLastTime === 0 ? 0 : (iTime - iLastTime));
	iLastTime = iTime;

	bInvalidAnimation = false;
	requestAnimation();
}

function requestAnimation() {
	if ((bRunning) && (!bInvalidAnimation)) {
		if (MessagePool.has(evAnimation)) {
			bInvalidAnimation = true;
			fnRequestAnimFrame.call(window, onAnimation);
		} else {
			iLastTime = 0;
		}
	}
}

function onAnimationResume() {
	if (!bRunning) {
		bRunning = true;
		requestAnimation();
	}
}

function onAnimationPause() {
	if (bRunning) {
		bRunning = false;
	}
}

MessagePool.register(evShow, onAnimationResume);
MessagePool.register(evHide, onAnimationPause);
MessagePool.excludeLog(false, evAnimation);

/**
 * Register animation handler
 * @param {Function} fnHandler function(iAnimationTime, iInterval)
 */
export function registerAnimation(fnHandler) {
	MessagePool.register(evAnimation, fnHandler);
	requestAnimation();
}

/**
 * Unregister animation handler
 * @param {Function} fnHandler function(iAnimationTime, iInterval)
 */
export function unregisterAnimation(fnHandler) {
	MessagePool.unregister(evAnimation, fnHandler);
}

export class ValueAnimator {
	/**
	 * 
	 * @param {number} fStartTime 
	 * @param {number} fDuration 
	 * @param {CurveFunction=} oCurveFunction 
	 * @param {TimeFunction=} oTimeFunction
	 */
	constructor(fStartTime, fDuration, oCurveFunction, oTimeFunction) {
		this.evStart = this.onStart.bind(this);
		this.evStop = this.onStop.bind(this);
		
		this.oTimeValue = new TimeValue(fStartTime, fDuration, this.evStart, this.evStop);

		this.oCurveFunction = oCurveFunction || CurveLinear;
		this.oTimeFunction = oTimeFunction || TimeForward;

		this.evAnimation = this.onAnimation.bind(this);

		/** @type {number | null} */ this.fLastValue = null;
		
		registerAnimation(this.evAnimation);
	}

	stop() {
		this.oTimeValue.stop();
	}

	pause() {
		this.oTimeValue.pause();
	}

	resume() {
		this.oTimeValue.resume();
	}

	/**
	 * @private
	 * @param {number} iAnimationTime 
	 * @param {number} iInterval 
	 */
	onAnimation(iAnimationTime, iInterval) {
		let fPercent = this.oTimeFunction(this.oTimeValue, iAnimationTime);
		let fValue = this.oCurveFunction.getY(fPercent || 0);
		if (this.fLastValue !== fValue) {
			this.fLastValue = fValue;
		}
		console.log(iAnimationTime, fPercent, fValue);
	}

	/**
	 * @private
	 */
	onStart() {

	}

	/**
	 * @private
	 */
	onStop() {
		unregisterAnimation(this.evAnimation);
	}
}

//new ValueAnimator(getTickCounter() + 100, 100, CurveEaseInOut, TimeForward);
