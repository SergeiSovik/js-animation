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

import { getTickCounter } from "./../../../include/time.js"
import { Animation } from "./../globals/animation.js"
import { CurveEaseInOut } from "./function.js"

export class AniShow extends Animation {
	/**
	 * @param {HTMLElement} domTarget 
	 * @param {number} uSpeed
	 * @param {string} sDisplayType
	 */
	constructor(domTarget, uSpeed, sDisplayType) {
		super();
		this.domTarget = domTarget;
		this.uSpeed = uSpeed;
		this.sDisplayType = sDisplayType;
	}

	/** @override */
	start() {
		super.start(getTickCounter(), this.uSpeed, 1, 1, CurveEaseInOut);
	}

	/**
	 * @param {number} fX
	 * @param {number} fY
	 */
	onAnimate(fX, fY) {
		this.domTarget.style.opacity = fY;
	}

	/** @override */
	onStart() {
		this.domTarget.style.display = this.sDisplayType;
	}
}

export class AniHide extends Animation {
	/**
	 * @param {HTMLElement} domTarget 
	 * @param {number} uSpeed
	 */
	constructor(domTarget, uSpeed) {
		super();
		this.domTarget = domTarget;
		this.uSpeed = uSpeed;
	}

	/** @override */
	start() {
		super.start(getTickCounter(), this.uSpeed, 1, 1, CurveEaseInOut);
	}

	/**
	 * @param {number} fX
	 * @param {number} fY
	 */
	onAnimate(fX, fY) {
		this.domTarget.style.opacity = 1 - fY;
	}

	/** @override */
	onStop() {
		this.domTarget.style.display = 'none';
	}
}

export class AniShowHide {
	/**
	 * @param {HTMLElement} domTarget 
	 * @param {number} uSpeed
	 * @param {string} sDisplayType
	 * @param {boolean} bVisible
	 */
	constructor(domTarget, uSpeed, sDisplayType, bVisible) {
		this.aniShow = new AniShow(domTarget, uSpeed, sDisplayType);
		this.aniHide = new AniHide(domTarget, uSpeed);

		this.bVisible = bVisible;
	}

	show() {
		if (!this.bVisible) {
			this.bVisible = true;
			this.aniHide.stop();
			this.aniShow.start();
		}
	}

	hide() {
		if (this.bVisible) {
			this.bVisible = false;
			this.aniShow.stop();
			this.aniHide.start();
		}
	}
}
