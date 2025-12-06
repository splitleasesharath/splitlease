import React, { useEffect, useRef } from 'react';

interface NightlyPriceSliderProps {
  initialP1?: number;
  initialDecay?: number;
  n2?: number;
  n3?: number;
  n4?: number;
  n5?: number;
  onPricesChange?: (data: {
    p1: number;
    n1: number;
    n2: number;
    n3: number;
    n4: number;
    n5: number;
    n6: number;
    n7: number;
    decay: number;
    total: number;
  }) => void;
}

/**
 * NightlyPriceSlider - Shadow DOM based pricing slider with gradient legend
 *
 * Color Palette Style - displays 7 nights as gradient swatches from dark to light
 * instead of a table. Includes base rate input and long stay discount slider.
 */
export const NightlyPriceSlider: React.FC<NightlyPriceSliderProps> = ({
  initialP1 = 100,
  initialDecay = 0.95,
  onPricesChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const initializedRef = useRef(false);

  // Keep callback ref updated without triggering re-init
  const onPricesChangeRef = useRef(onPricesChange);
  useEffect(() => {
    onPricesChangeRef.current = onPricesChange;
  }, [onPricesChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    // Only initialize once
    if (initializedRef.current) return;
    initializedRef.current = true;

    const container = containerRef.current;
    shadowRootRef.current = container.attachShadow({ mode: 'open' });
    const root = shadowRootRef.current;

    // Build UI inside Shadow DOM - Color Palette Style
    root.innerHTML = `
      <style>
        :host { all: initial; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }

        .control-group { margin-bottom: 24px; }
        .label-row { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: baseline; }
        .label { font-size: 14px; font-weight: 600; color: #374151; }
        .value-display { font-size: 14px; font-weight: 700; color: #5b3bb3; }

        .base-input-wrapper { position: relative; max-width: 200px; margin: 0 auto 24px; }
        .currency-symbol { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 20px; font-weight: 600; color: #9ca3af; }
        .base-input {
          width: 100%; padding: 12px 12px 12px 32px; font-size: 24px; font-weight: 700;
          text-align: center; border: 2px solid #e5e7eb; border-radius: 16px;
          color: #111827; outline: none; transition: border-color 0.2s; box-sizing: border-box;
        }
        .base-input:focus { border-color: #5b3bb3; }

        .range-wrapper { position: relative; height: 40px; display: flex; align-items: center; }
        input[type=range] {
          -webkit-appearance: none; width: 100%; background: transparent; cursor: pointer;
        }
        input[type=range]:focus { outline: none; }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%; height: 8px; cursor: pointer; background: #e5e7eb; border-radius: 4px;
        }
        input[type=range]::-webkit-slider-thumb {
          height: 24px; width: 24px; border-radius: 50%; background: #5b3bb3;
          cursor: pointer; -webkit-appearance: none; margin-top: -8px;
          box-shadow: 0 2px 6px rgba(91, 59, 179, 0.3); border: 2px solid #fff;
        }
        input[type=range]::-moz-range-track {
          width: 100%; height: 8px; cursor: pointer; background: #e5e7eb; border-radius: 4px;
        }
        input[type=range]::-moz-range-thumb {
          height: 24px; width: 24px; border-radius: 50%; background: #5b3bb3;
          cursor: pointer; box-shadow: 0 2px 6px rgba(91, 59, 179, 0.3); border: 2px solid #fff;
        }
        .marks { display: flex; justify-content: space-between; margin-top: -5px; padding: 0 2px; }
        .mark { font-size: 11px; color: #9ca3af; }

        /* Color Palette Style - No gaps, side by side */
        .nights-display-wrapper {
          margin-top: 24px;
        }
        .nights-display-header {
          text-align: center;
          margin-bottom: 12px;
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
        }

        /* Color palette container */
        .palette-container {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .palette-row {
          display: flex;
        }

        .palette-swatch {
          flex: 1;
          min-height: 70px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 0;
        }

        /* Gradient colors - dark grey to white */
        .palette-swatch.n1 { background: #374151; color: white; }
        .palette-swatch.n2 { background: #4b5563; color: white; }
        .palette-swatch.n3 { background: #6b7280; color: white; }
        .palette-swatch.n4 { background: #9ca3af; color: white; }
        .palette-swatch.n5 { background: #d1d5db; color: #374151; }
        .palette-swatch.n6 { background: #e5e7eb; color: #374151; }
        .palette-swatch.n7 { background: #f3f4f6; color: #374151; }

        .swatch-number {
          font-size: 10px;
          font-weight: 600;
          line-height: 1;
          opacity: 0.75;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .swatch-price {
          font-size: 15px;
          font-weight: 800;
          line-height: 1;
        }

        .swatch-label {
          font-size: 8px;
          font-weight: 600;
          line-height: 1;
          opacity: 0.65;
          margin-top: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        /* Cumulative totals row */
        .formula-row {
          display: flex;
          margin-top: 8px;
        }

        .formula-item {
          flex: 1;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
        }

        .formula-total-row {
          margin-top: 12px;
          padding: 12px 16px;
          background: #f9fafb;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .formula-total-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
        }

        .formula-total {
          font-size: 18px;
          font-weight: 800;
          color: #374151;
        }

        /* Summary totals */
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          padding: 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-label {
          font-size: 11px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .summary-value {
          font-size: 20px;
          color: #374151;
          font-weight: 800;
        }

        details { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
        summary {
          font-size: 13px; font-weight: 600; color: #6b7280; cursor: pointer; list-style: none;
          display: flex; align-items: center; gap: 6px;
        }
        summary::-webkit-details-marker { display: none; }
        summary:hover { color: #374151; }
        summary::before { content: '▸'; display: inline-block; transition: transform 0.2s; }
        details[open] summary::before { transform: rotate(90deg); }
        .details-content {
          margin-top: 10px; font-size: 13px; line-height: 1.5; color: #6b7280;
          background: #f9fafb; padding: 12px; border-radius: 8px;
        }

        /* Hide number input spinners */
        .base-input::-webkit-outer-spin-button,
        .base-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .base-input { -moz-appearance: textfield; appearance: textfield; }
      </style>

      <div class="app">
        <div class="control-group" style="text-align:center;">
          <label class="label" style="display:block; margin-bottom:10px;">Base Nightly Rate</label>
          <div class="base-input-wrapper">
            <span class="currency-symbol">$</span>
            <input id="inp-base" class="base-input" type="number" min="0" step="1" value="100">
          </div>
        </div>

        <div class="control-group">
          <div class="label-row">
            <span class="label">Long Stay Discount</span>
            <span class="value-display" id="disp-discount">20%</span>
          </div>
          <div class="range-wrapper">
            <input id="inp-discount" type="range" min="0" max="50" step="1" value="20">
          </div>
          <div class="marks">
            <span class="mark">0%</span>
            <span class="mark">25%</span>
            <span class="mark">50%</span>
          </div>
          <p style="font-size:12px; color:#6b7280; margin-top:8px; line-height:1.4;">
            Consecutive nights get progressively cheaper. A 5-night stay averages
            <strong id="disp-avg-price" style="color:#5b3bb3;">$85</strong>/night.
          </p>
        </div>

        <!-- Color Palette Display -->
        <div class="nights-display-wrapper">
          <div class="nights-display-header">Price per consecutive night</div>
          <div class="palette-container">
            <div class="palette-row" id="palette-row"></div>
          </div>
          <div class="formula-row" id="formula-row"></div>
          <div class="formula-total-row">
            <div class="formula-total-label">7-Night Total</div>
            <div class="formula-total" id="formula-total"></div>
          </div>
        </div>

        <!-- Summary based on 5-night stay -->
        <div class="summary-row">
          <div class="summary-item">
            <div class="summary-label">5-Night Total</div>
            <div class="summary-value" id="val-five-night">$0</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Est. Monthly (4 weeks)</div>
            <div class="summary-value" id="val-monthly">$0</div>
          </div>
        </div>

        <details>
          <summary>How does Smart Pricing work?</summary>
          <div class="details-content">
            We calculate a "decay curve" for your pricing. The first night is your full Base Rate. Each consecutive night gets slightly cheaper based on your Discount setting.
            <br><br>
            This encourages guests to book longer blocks (like Mon-Fri) instead of just two nights, maximizing your occupancy and reducing turnover effort.
          </div>
        </details>
      </div>
    `;

    // ============================================================
    // Pricing calculator with gradient legend
    // ============================================================
    const N = 7;
    const DECAY_MIN = 0.7;
    const DECAY_MAX = 1.0;

    const $ = (sel: string) => root.getElementById(sel);
    const fmt0 = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const fmtShort = (n: number) => '$' + Math.round(n);
    const roundUp = (n: number) => Math.ceil(n);
    const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const inpBase = $('inp-base') as HTMLInputElement;
    const inpDiscount = $('inp-discount') as HTMLInputElement;
    const dispDiscount = $('disp-discount') as HTMLElement;
    const dispAvgPrice = $('disp-avg-price') as HTMLElement;
    const paletteRow = $('palette-row') as HTMLElement;
    const formulaRow = $('formula-row') as HTMLElement;
    const formulaTotal = $('formula-total') as HTMLElement;
    const valFiveNight = $('val-five-night') as HTMLElement;
    const valMonthly = $('val-monthly') as HTMLElement;

    // Convert initial decay to discount percentage
    // decay = 1 - (discount/100)^0.25 approximately
    // We use discount percentage where 20% means night 5 is ~20% cheaper than night 1
    const initialDiscountPercent = Math.round((1 - initialDecay) * 100 / 0.25) || 20;

    let baseRate = initialP1;
    let discountPercent = Math.min(50, Math.max(0, initialDiscountPercent));
    let nightlyPrices: number[] = Array(N).fill(0);

    function solveDecay(p1: number, p5: number): number {
      if (p1 <= 0) return 1.0;
      if (p5 >= p1) return 1.0;
      const ratio = p5 / p1;
      const d = Math.pow(ratio, 0.25);
      return clamp(d, DECAY_MIN, DECAY_MAX);
    }

    function calculateCurve(): number {
      const p5Target = baseRate * (1 - (discountPercent / 100));
      const decay = solveDecay(baseRate, p5Target);

      nightlyPrices[0] = roundUp(baseRate);
      for (let i = 1; i < N; i++) {
        nightlyPrices[i] = roundUp(nightlyPrices[i - 1] * decay);
      }

      const sum5 = nightlyPrices.slice(0, 5).reduce((a, b) => a + b, 0);
      dispAvgPrice.textContent = fmt0(sum5 / 5);

      return decay;
    }

    function renderPaletteDisplay() {
      let paletteHTML = '';
      let formulaHTML = '';
      let cumulativeTotal = 0;

      for (let i = 0; i < N; i++) {
        const nightCount = i + 1;
        cumulativeTotal += nightlyPrices[i];
        paletteHTML += `
          <div class="palette-swatch n${nightCount}">
            <span class="swatch-number">Night ${nightCount}</span>
            <span class="swatch-price">${fmtShort(nightlyPrices[i])}</span>
            <span class="swatch-label">per night</span>
          </div>
        `;
        formulaHTML += `<div class="formula-item">${fmtShort(cumulativeTotal)}</div>`;
      }

      paletteRow.innerHTML = paletteHTML;
      formulaRow.innerHTML = formulaHTML;
      formulaTotal.textContent = fmtShort(cumulativeTotal);
    }

    function calculateSummary() {
      // Calculate 5-night total
      const fiveNightTotal = nightlyPrices.slice(0, 5).reduce((a, b) => a + b, 0);
      valFiveNight.textContent = fmt0(fiveNightTotal);

      // Estimate monthly (4 weeks of 5-night stays)
      valMonthly.textContent = fmt0(fiveNightTotal * 4);

      return fiveNightTotal;
    }

    function broadcast() {
      const decay = calculateCurve();
      const roundedNightly = nightlyPrices.map(v => Math.round(v));
      const payload = {
        p1: roundedNightly[0],
        n1: roundedNightly[0],
        n2: roundedNightly[1],
        n3: roundedNightly[2],
        n4: roundedNightly[3],
        n5: roundedNightly[4],
        n6: roundedNightly[5],
        n7: roundedNightly[6],
        decay: +decay.toFixed(3),
        total: sum(roundedNightly)
      };

      if (onPricesChangeRef.current) {
        onPricesChangeRef.current(payload);
      }
    }

    function updateUI() {
      calculateCurve();
      dispDiscount.textContent = discountPercent + '%';
      renderPaletteDisplay();
      calculateSummary();
      broadcast();
    }

    // Event listeners
    inpBase.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      let val = parseFloat(target.value);
      if (isNaN(val) || val < 0) val = 0;
      baseRate = val;
      updateUI();
    });

    inpDiscount.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      discountPercent = parseFloat(target.value);
      updateUI();
    });

    // Initialize with props
    baseRate = initialP1;
    inpBase.value = String(initialP1);
    inpDiscount.value = String(discountPercent);
    updateUI();

  }, []); // Empty deps - only run once on mount

  return <div ref={containerRef} style={{ width: '100%', minHeight: '320px' }} />;
};
