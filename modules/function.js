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

import { getTickCounter } from "./../../../include/time.js";

/**
 * @abstract
 */
export class CurveFunction {
	/**
	 * @abstract
	 * @param {number} fX
	 * @returns {number}
	 */
	getY(fX) {}
}

export class PointCurveFunction extends CurveFunction {
	/**
	 * @param {number} fX 
	 * @param {number} fY 
	 */
	constructor(fX, fY) {
		super();
		this.fX = fX;
		this.fY = fY;
	}

	/**
	 * @param {number} fX
	 * @returns {number}
	 */
	getY(fX) {
		return this.fY;
	}
}

export class LinearCurveFunction extends CurveFunction {
	/**
	 * @param {number} fX1 
	 * @param {number} fY1 
	 * @param {number} fX2
	 * @param {number} fY2 
	 */
	constructor(fX1, fY1, fX2, fY2) {
		super();
		this.fX1 = fX1;
		this.fY1 = fY1;
		this.fX2 = fX2;
		this.fY2 = fY2;
		this.fXd = fX2 - fX1;
		this.fYd = fY2 - fY1;
	}

	/**
	 * @param {number} fX
	 * @returns {number}
	 */
	getY(fX) {
		return (this.fXd === 0) ? this.fY2 : (fX - this.fX1) * this.fYd / this.fXd + this.fY1;
	}
}

const BezierCurveFunctionFractions = 600;
const BezierCurveFunctionLUTCount = 600;

const aXtemp = /** @type {Array<number>} */ ( platform.FixedDoubleArray(BezierCurveFunctionFractions + 1) );
const aYtemp = /** @type {Array<number>} */ ( platform.FixedDoubleArray(BezierCurveFunctionFractions + 1) );

/**
 * Calculate factorial
 * @param {number} iValue 
 */
function factorial(iValue){
	let iResult = 1;
	for(let iIndex = iValue; iIndex > 0; iIndex--) {
		iResult *= iIndex;
	}
	return iResult;
}

/**
 * Calculate Bernstain basis
 * @param {number} iIndex 
 * @param {number} iLast 
 * @param {number} fFraction 
 */
function bernstein(iIndex, iLast, fFraction){
	let iResult = factorial(iLast) / (factorial(iIndex) * factorial(iLast - iIndex));
	iResult *= Math.pow(fFraction, iIndex);
	iResult *= Math.pow(1 - fFraction, iLast - iIndex);
	return iResult;
}

export class BezierCurveFunction extends CurveFunction {
	/**
	 * @param {Array<number>} aPoints
	 */
	constructor(aPoints) {
		super();

		/** Bezier Lookup Table */
		this.aYlut = /** @type {Array<number>} */ ( platform.FixedDoubleArray(BezierCurveFunctionLUTCount + 1) );

		this.iCount = aPoints.length >> 1;
		
		this.aX = /** @type {Array<number>} */ ( platform.FixedDoubleArray(this.iCount) );
		this.aY = /** @type {Array<number>} */ ( platform.FixedDoubleArray(this.iCount) );

		for (let iIndex = this.iCount - 1; iIndex >= 0; iIndex--) {
			this.aX[iIndex] = aPoints[iIndex * 2];
			this.aY[iIndex] = aPoints[iIndex * 2 + 1];
		}

		let iLast = this.iCount - 1;

		for (let iFraction = BezierCurveFunctionFractions; iFraction >= 0; iFraction--) {
				/** @type {number} */ let bX = 0;
			/** @type {number} */ let bY = 0;
			let fFraction = iFraction / BezierCurveFunctionFractions;
			for (let iIndex = iLast; iIndex >= 0; iIndex--) {
				let fBernsteinBasis = bernstein(iIndex, iLast, fFraction);
				let fX = fBernsteinBasis * this.aX[iIndex];
				let fY = fBernsteinBasis * this.aY[iIndex];
				bX += fX;
				bY += fY;
			}
			aXtemp[iFraction] = bX;
			aYtemp[iFraction] = bY;
		}
		
		for (let iIndex = BezierCurveFunctionLUTCount; iIndex >= 0; iIndex--) {
			this.aYlut[iIndex] = aYtemp[0];
		}
		
		let fX2 = aXtemp[BezierCurveFunctionFractions];
		let iIndexX2 = (fX2 * BezierCurveFunctionLUTCount) | 0;
		let fY2 = aYtemp[BezierCurveFunctionFractions];
		let iIndex2 = (iIndexX2 < 0) ? 0 : ((iIndexX2 > BezierCurveFunctionLUTCount) ? BezierCurveFunctionLUTCount : iIndexX2);
		
		if (iIndex2 < BezierCurveFunctionLUTCount) {
			for (let iIndex = iIndex2; iIndex <= BezierCurveFunctionLUTCount; iIndex++) {
				this.aYlut[iIndex] = fY2;
			}
		}
		
		for (let iFraction = BezierCurveFunctionFractions - 1; iFraction >= 0; iFraction--) {
			let fX1 = aXtemp[iFraction];
			let iIndexX1 = (fX1 * BezierCurveFunctionLUTCount) | 0;
			let fY1 = aYtemp[iFraction];
			let iIndex1 = (iIndexX1 < 0) ? 0 : ((iIndexX1 > BezierCurveFunctionLUTCount) ? BezierCurveFunctionLUTCount : iIndexX1);
			
			let fXd = fX2 - fX1;
			let fYd = fY2 - fY1;
			
			if (iIndex1 <= iIndex2) {
				for (let iIndex = iIndex1; iIndex <= iIndex2; iIndex++) {
					let fX = iIndex / BezierCurveFunctionLUTCount;
					this.aYlut[iIndex] = (fX - fX1) * fYd / fXd + fY1;
				}
			} else {
				for (let iIndex = iIndex2; iIndex <= iIndex1; iIndex++) {
					let fX = iIndex / BezierCurveFunctionLUTCount;
					this.aYlut[iIndex] = (fX - fX1) * fYd / fXd + fY1;
				}
			}
			
			fX2 = fX1;
			iIndexX2 = iIndexX1;
			fY2 = fY1;
			iIndex2 = iIndex1;
		}
		
		this.aYlut[0] = aYtemp[0];
		this.aYlut[BezierCurveFunctionLUTCount] = aYtemp[BezierCurveFunctionFractions];
	}

	/**
	 * @param {number} fX
	 * @returns {number}
	 */
	getY(fX) {
		let iLut = Math.round(fX * BezierCurveFunctionLUTCount) | 0;
		if (iLut < 0) iLut = 0; else if (iLut > BezierCurveFunctionLUTCount) iLut = BezierCurveFunctionLUTCount;
		return this.aYlut[iLut];
	}
}

const aFuncionPointsEaseIn = [ 0.0, 0.0, 0.42, 0.0, 1.0, 1.0, 1.0, 1.0 ];
const aFuncionPointsEaseOut = [ 0.0, 0.0, 0.0, 0.0, 0.58, 1.0, 1.0, 1.0 ];
const aFuncionPointsEaseInOut = [ 0.0, 0.0, 0.42, 0.0, 0.58, 1.0, 1.0, 1.0 ];

export const CurveLinear = new LinearCurveFunction(0.0, 0.0, 1.0, 1.0);
export const CurveEaseIn = new BezierCurveFunction(aFuncionPointsEaseIn);
export const CurveEaseOut = new BezierCurveFunction(aFuncionPointsEaseOut);
export const CurveEaseInOut = new BezierCurveFunction(aFuncionPointsEaseInOut);
