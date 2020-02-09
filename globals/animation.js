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
import { bindEvent } from "./../../../include/event.js"

/** @type {function(function())} */
const fnRequestAnimFrame =
	platform.requestAnimationFrame ||
	platform.webkitRequestAnimationFrame ||
	platform.mozRequestAnimationFrame ||
	platform.oRequestAnimationFrame ||
	platform.msRequestAnimationFrame ||
	function(callback) { platform.setTimeout(callback, 1000 / 30); };

const oVisibilityEventMap = {
	'focus': true,
	'focusin': true,
	'pageshow': true,
	'blur': false,
	'focusout': false,
	'pagehide': false
};

let sHiddenFunction = 'hidden';

/**
 * @this {*}
 * @param {Event | {type: string}} oEvent 
 */
function onVisibilityChange(oEvent) {
	oEvent = oEvent || window.event;
	/** @type {boolean} */ let bVisible;
	if (oEvent.type in oVisibilityEventMap)
		bVisible = oVisibilityEventMap[oEvent.type];
	else
		bVisible = this[sHiddenFunction] ? false : true;
	
	if (bVisible)
		MessagePool.post('evShow');
	else
		MessagePool.post('evHide');
}

// Modern Browsers
if (platform.document === undefined)
	onVisibilityChange.call(platform, {'type': 'blur'});
else if (sHiddenFunction in platform.document)
	platform.document.addEventListener('visibilitychange', onVisibilityChange);
else if ((sHiddenFunction = 'mozHidden') in document)
	platform.document.addEventListener('mozvisibilitychange', onVisibilityChange);
else if ((sHiddenFunction = 'webkitHidden') in document)
	platform.document.addEventListener('webkitvisibilitychange', onVisibilityChange);
else if ((sHiddenFunction = 'msHidden') in document)
	platform.document.addEventListener('msvisibilitychange', onVisibilityChange);
// IE <= 9:
else if ('onfocusin' in document)
	platform.document.onfocusin = platform.document.onfocusout = onVisibilityChange;
// Other Browsers:
else
	platform.onpageshow = platform.onpagehide = platform.onfocus = platform.onblur = onVisibilityChange;

// Detect initial state
if ((platform.document !== undefined) && (platform.document[sHiddenFunction] !== undefined))
	onVisibilityChange.call(platform.document, {'type': platform.document[sHiddenFunction] ? 'blur' : 'focus'});
