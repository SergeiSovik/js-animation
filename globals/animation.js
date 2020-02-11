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
import { CurveFunction, CurveLinear, CurveEaseInOut } from "./../modules/function.js";

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

export class Animation {
	/**
	 * @param {number} fTimeStart 
	 * @param {number} fRepeatInterval 
	 * @param {number} fRepeatDirection
	 * @param {CurveFunction=} oCurveFunction 
	 * @param {Function=} fnStart
	 * @param {Function=} fnStop
	 */
	constructor(fTimeStart, fRepeatInterval, fRepeatDirection, oCurveFunction, fnStart, fnStop) {
		/** @private @type {number} */ this.fTimeStart;
		/** @private @type {number} */ this.fTimeEnd;
		/** @private @type {number | null} */ this.fTimePause;
		/** @private @type {number} */ this.fRepeatInterval;
		/** @private @type {number} */ this.fRepeatDirection;

		/** @private @type {boolean} */ this.bRunning = false;
		/** @private @type {boolean} */ this.bStarted;
		/** @private @type {boolean} */ this.bEnded;
		/** @private @type {boolean} */ this.bRequestEnd;

		/** @private @type {number | null} */ this.fNextValue;
		/** @private @type {number | null} */ this.fLastValue;

		/** @private @type {CurveFunction} */ this.oCurveFunction;

		/** @private */ this.fnStart = fnStart || null;
		/** @private */ this.fnStop = fnStop || null;

		/** @private */ this.evAnimation = this.onAnimation.bind(this);

		this.start(fTimeStart, fRepeatInterval, fRepeatDirection, oCurveFunction || CurveLinear);
	}

	/**
	 * @param {number} fTimeStart 
	 * @param {number} fRepeatInterval 
	 * @param {number} fRepeatDirection
	 * @param {CurveFunction=} oCurveFunction 
	 */
	start(fTimeStart, fRepeatInterval, fRepeatDirection, oCurveFunction) {
		this.fTimeStart = fTimeStart;

		if (isFinite(fRepeatDirection)) {
			this.fTimeEnd = fTimeStart + fRepeatInterval * Math.abs(fRepeatDirection);
		} else {
			this.fTimeEnd = Infinity;
		}

		this.fTimePause = null;
		this.fRepeatInterval = fRepeatInterval;
		this.fRepeatDirection = fRepeatDirection;

		this.bStarted = false;
		this.bEnded = false;
		this.bRequestEnd = false;

		this.fNextValue = null;

		this.oCurveFunction = oCurveFunction || CurveLinear;

		if (!this.bRunning) {
			this.bRunning = true;
			registerAnimation(this.evAnimation);
		}
	}

	stop() {
		this.bRequestEnd = true;
	}

	/**
	 * @param {number=} fTime 
	 */
	pause(fTime) {
		if (this.fTimePause === null) {
			this.fTimePause = fTime || getTickCounter();
		}
	}

	/**
	 * @param {number=} fTime
	 */
	resume(fTime) {
		if (this.fTimePause !== null) {
			let fTimeResume = fTime || getTickCounter();
			
			if (isFinite(this.fRepeatDirection)) {
				if (fTimeResume <= this.fTimeStart) {
					this.fTimePause = null;
					return;
				}

				if (this.fTimePause < this.fTimeStart) {
					this.fTimePause = this.fTimeStart;
				}
			}

			let fInterval = fTimeResume - this.fTimePause;
			this.fTimePause = null;
			this.fTimeStart += fInterval;
		}
	}

	/**
	 * @param {number} fTime
	 * @returns {number | null}
	 */
	next(fTime) {
		if ((this.bEnded) || (this.fTimePause !== null))
			return this.fNextValue;

		let bFinite = isFinite(this.fRepeatDirection);
		let bForward = Math.sign(this.fRepeatDirection) >= 0;

		if (bFinite) {
			if (fTime <= this.fTimeStart)
				return (this.fNextValue = bForward ? 0 : 1);
		}
		
		if (!this.bStarted) {
			this.bStarted = true;
			if (this.fnStart !== null) this.fnStart();
		}

		let fPercent = (fTime - this.fTimeStart) / this.fRepeatInterval;
		let fPercentFraction = fPercent - Math.floor(fPercent);
		/** @type {number} */ let fNext;

		if (isNaN(this.fRepeatDirection)) {
			fNext = 1 - Math.abs(fPercentFraction * 2 - 1);
		} else if (bForward) {
			fNext = fPercentFraction;
		} else {
			fNext = 1 - fPercentFraction;
		}	

		if ((this.bRequestEnd) || ((bFinite) && (fTime >= this.fTimeEnd))) {
			if (!this.bRequestEnd)
				fNext = bForward ? 1 : 0;

			if (!this.bEnded) {
				this.bEnded = true;
				if (this.fnStop !== null) this.fnStop();
				unregisterAnimation(this.evAnimation);
			}			
		}

		return (this.fNextValue = fNext);
	}

	/**
	 * @private
	 * @param {number} iAnimationTime 
	 * @param {number} iInterval 
	 */
	onAnimation(iAnimationTime, iInterval) {
		let fNextValue = this.next(iAnimationTime);
		let fValue = this.oCurveFunction.getY(fNextValue || 0);
		if (this.fLastValue !== fValue) {
			this.fLastValue = fValue;
		}
		console.log(iAnimationTime, fNextValue, fValue);
	}
}

new Animation(getTickCounter() + 100, 100, 1, CurveEaseInOut, null, null);
