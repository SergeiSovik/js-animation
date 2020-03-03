/*
 * Copyright 2000-2020 Sergei Sovik <sergeisovik@yahoo.com>
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

/**
 * @abstract
 */
export class Animation {
	/**
	 * @param {number=} fTimeStart 
	 * @param {number=} fInterval 
	 * @param {number=} fDirection
	 * @param {number=} fCount
	 * @param {CurveFunction=} oCurveFunction 
	 * @param {function(number):number=} fnTimeFunction
	 */
	constructor(fTimeStart, fInterval, fDirection, fCount, oCurveFunction, fnTimeFunction) {
		/** @private @type {number} */ this.fTimeStart = 0;
		/** @private @type {number} */ this.fTimeEnd = 0;
		/** @private @type {number | null} */ this.fTimePause = null;
		/** @private @type {number} */ this.fInterval = 1;
		/** @private @type {number} */ this.fDirection = 1;
		/** @private @type {number} */ this.fCount = 1;

		/** @protected @type {boolean} */ this.bRunning = false;
		/** @protected @type {boolean} */ this.bStarted = false;
		/** @protected @type {boolean} */ this.bEnded = false;
		/** @protected @type {boolean} */ this.bRequestEnd = false;

		/** @private @type {number | null} */ this.fNextValue = null;
		/** @private @type {number | null} */ this.fLastValue = null;

		/** @private @type {CurveFunction} */ this.oCurveFunction = CurveLinear;
		/** @private */ this.fnTimeFunction = fnTimeFunction || null;

		/** @private */ this.evAnimation = this.onAnimation.bind(this);

		if (fTimeStart !== undefined) {
			this.start(fTimeStart, fInterval || 1000, fDirection || NaN, fCount || Infinity, oCurveFunction || CurveLinear);
		}
	}

	/**
	 * @param {function(number):number | null} fnTimeFunction
	 */
	setTimeFunciton(fnTimeFunction) {
		this.fnTimeFunction = fnTimeFunction;
	}

	/**
	 * @param {number} fTimeStart 
	 * @param {number} fInterval 
	 * @param {number} fDirection
	 * @param {number} fCount
	 * @param {CurveFunction=} oCurveFunction 
	 */
	start(fTimeStart, fInterval, fDirection, fCount, oCurveFunction) {
		this.fTimeStart = fTimeStart;

		if (isFinite(fCount)) {
			this.fTimeEnd = fTimeStart + fInterval * Math.abs(fCount);
		} else {
			this.fTimeEnd = Infinity;
		}

		this.fTimePause = null;
		this.fInterval = fInterval;
		this.fDirection = fDirection;
		this.fCount = fCount;

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
			this.onPause();
		}
	}

	/**
	 * @param {number=} fTime
	 */
	resume(fTime) {
		if (this.fTimePause !== null) {
			let fTimeResume = fTime || getTickCounter();
			
			if (isFinite(this.fCount)) {
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

			this.onResume();
		}
	}

	/**
	 * @param {number} fTime
	 * @returns {number | null}
	 */
	next(fTime) {
		if ((this.bEnded) || (this.fTimePause !== null))
			return this.fNextValue;

		let bFinite = isFinite(this.fCount);
		let fDirection = isNaN(this.fDirection) ? 0 : Math.sign(this.fDirection);

		if (bFinite) {
			if (fTime <= this.fTimeStart)
				return (this.fNextValue = (fDirection >= 0) ? 0 : 1);
		}
		
		if (!this.bStarted) {
			this.bStarted = true;
			this.onStart();
		}

		let fPercent = (fTime - this.fTimeStart) / this.fInterval;
		let fPercentFraction = fPercent - Math.floor(fPercent);
		/** @type {number} */ let fNext;

		if (fDirection == 0) {
			fNext = 1 - Math.abs(fPercentFraction * 2 - 1);
		} else if (fDirection > 0) {
			fNext = fPercentFraction;
		} else {
			fNext = 1 - fPercentFraction;
		}	

		if ((this.bRequestEnd) || ((bFinite) && (fTime >= this.fTimeEnd))) {
			if (!this.bRequestEnd)
				fNext = (fDirection > 0) ? 1 : 0;

			if (!this.bEnded) {
				this.bEnded = true;
				this.onStop();
				unregisterAnimation(this.evAnimation);
				this.bRunning = false;
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
		if (this.fnTimeFunction !== null) {
			let fUpdateValue = this.fnTimeFunction(fNextValue || 0);
			//console.log(fNextValue.toFixed(3), fUpdateValue.toFixed(3))
			fNextValue = fUpdateValue;
		}
		let fValue = this.oCurveFunction.getY(fNextValue || 0);
		if (this.fLastValue !== fValue) {
			this.fLastValue = fValue;
			this.onAnimate(fNextValue || 0, fValue);
		}
	}

	/**
	 * @abstract
	 * @param {number} fX
	 * @param {number} fY
	 */
	onAnimate(fX, fY) {}

	onStart() {}
	onStop() {}
	onPause() {}
	onResume() {}
}
