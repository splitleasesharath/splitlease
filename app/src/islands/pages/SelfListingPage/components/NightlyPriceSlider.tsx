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
 * NightlyPriceSlider - Shadow DOM based pricing slider
 *
 * EXACT PORT of the working Bubble implementation.
 * The key to smooth dragging is keeping it SIMPLE:
 * - Direct synchronous updates on every input event
 * - No RAF batching, no debouncing, no drag state tracking
 * - Let the browser handle native slider behavior
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

    // Build UI inside Shadow DOM
    root.innerHTML = `
      <style>
        :host { all: initial; }
        .app{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827; background:#fff; max-width:100%; width:100%; margin:0; padding:12px; box-sizing:border-box; }
        .row{ display:grid; grid-template-columns: 1fr auto auto; gap:16px; align-items:start; margin: 8px 0 16px; }
        .field{ display:flex; flex-direction:column; gap:6px; min-width:0; }
        .label{ font-size:13px; color:#6b7280; }
        .num{ font: inherit; padding:10px 12px; border-radius:12px; border:1px solid #e5e7eb; width:100%; box-sizing:border-box; }
        .spin{ display:inline-flex; align-items:center; gap:8px; width:100%; min-height:54px; }
        .spin .buttons{ display:flex; flex-direction:column; }
        .spin .btn{ width:32px; height:24px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; cursor:pointer; line-height:1; font-size:12px; }
        .spin .btn + .btn{ margin-top:6px; }
        .spin .num{ height:44px; }

        .track-wrap{ position:relative; height:64px; }
        .track{ position:absolute; left:0; right:0; top:50%; transform:translateY(-50%); height:10px; background:linear-gradient(#9ea0a3,#9ea0a3) center/100% 10px no-repeat, #c9c9c9; border-radius:999px; }
        .ranges{ position:absolute; inset:0; display:grid; place-items:center; pointer-events:none; }
        .ranges input[type=range]{ pointer-events:auto; -webkit-appearance:none; appearance:none; position:absolute; top:50%; transform:translateY(-50%); background:transparent; height:36px; width:auto; }
        #slw-r1{ left:0; width:49%; }
        #slw-r5{ right:0; width:49%; }
        .ranges input[type=range]::-webkit-slider-runnable-track{ height:10px; background:transparent; }
        .ranges input[type=range]::-moz-range-track{ height:10px; background:transparent; }
        .ranges input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:34px; height:34px; border-radius:10px; background:#5b3bb3; border:0; box-shadow:0 6px 16px rgba(0,0,0,.12); cursor:pointer; margin-top:-12px; }
        .ranges input[type=range]::-moz-range-thumb{ width:34px; height:34px; border-radius:10px; background:#5b3bb3; border:0; box-shadow:0 6px 16px rgba(0,0,0,.12); cursor:pointer; }
        .tag{ position:absolute; top:0; transform:translateX(-50%); color:#111827; font-size:12px; font-weight:700; white-space:nowrap; }
        .value{ position:absolute; bottom:-18px; transform:translateX(-50%); font-size:14px; font-weight:600; }

        .grid{ margin-top:20px; border:1px solid #f1f5f9; border-radius:14px; overflow-x:auto; -webkit-overflow-scrolling:touch; }
        table{ width:100%; min-width:420px; border-collapse:collapse; font-variant-numeric: tabular-nums; }
        th, td{ padding:12px 14px; text-align:right; border-top:1px solid #f1f5f9; }
        th:first-child, td:first-child{ text-align:left; }
        thead th{ background:#fafafa; color:#4b5563; font-weight:600; }

        @media (max-width: 640px){
          .row{ grid-template-columns: 1fr; gap:12px; }
          .spin{ gap:10px; }
          .spin .btn{ width:40px; height:32px; font-size:14px; }
          .track-wrap{ height:80px; }
          .ranges input[type=range]{ height:44px; }
          .ranges input[type=range]::-webkit-slider-thumb{ width:40px; height:40px; border-radius:12px; margin-top:-15px; }
          .ranges input[type=range]::-moz-range-thumb{ width:40px; height:40px; border-radius:12px; }
          .value{ bottom:-30px; font-size:15px; }
        }
        #slw-discount::-webkit-outer-spin-button,
        #slw-discount::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
        #slw-discount{ -moz-appearance:textfield; appearance:textfield; }
        #slw-p1::-webkit-outer-spin-button,
        #slw-p1::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
        #slw-p1{ -moz-appearance:textfield; appearance:textfield; }
      </style>

      <div class="app">
        <div class="row">
          <div class="field">
            <div class="label">1-night price</div>
            <div class="spin">
              <input id="slw-p1" class="num" type="number" min="0" step="1" inputmode="numeric" value="100" />
              <div class="buttons">
                <button class="btn" id="slw-p1-up" aria-label="Increase 1-night">▲</button>
                <button class="btn" id="slw-p1-down" aria-label="Decrease 1-night">▼</button>
              </div>
            </div>
          </div>
          <div class="field">
            <div class="label">Discount per additional night (0.700–1.000)</div>
            <div class="spin">
              <input id="slw-discount" class="num" type="number" min="0.7" max="1" step="0.001" inputmode="decimal" value="0.950" />
              <div class="buttons">
                <button class="btn" id="slw-discount-up" aria-label="Increase discount">▲</button>
                <button class="btn" id="slw-discount-down" aria-label="Decrease discount">▼</button>
              </div>
            </div>
          </div>
          <div class="field">
            <div class="label">5-night price</div>
            <div class="spin">
              <input id="slw-n5" class="num" type="text" inputmode="numeric" value="" readonly />
            </div>
          </div>
        </div>

        <div class="track-wrap">
          <div class="track"></div>
          <div class="ranges">
            <input id="slw-r1" type="range" min="0" max="600" step="1" value="100" aria-label="1-night price" />
            <input id="slw-r5" type="range" min="0" max="600" step="1" value="0" aria-label="5-night price" />

            <div id="slw-tag1" class="tag">1 night price</div>
            <div id="slw-val1" class="value">$100</div>
            <div id="slw-tag5" class="tag">5 night price</div>
            <div id="slw-val5" class="value">$0</div>
          </div>
        </div>

        <div class="grid">
          <table>
            <thead>
              <tr><th>Night</th><th>Price That Night</th><th>Cumulative Total</th></tr>
            </thead>
            <tbody id="slw-rows"></tbody>
          </table>
        </div>
      </div>
    `;

    // ============================================================
    // EXACT PORT OF BUBBLE CODE - simple and direct
    // Extended to 7 nights for table display
    // ============================================================
    const N = 7; // Extended to 7 nights
    const DISCOUNT_MIN = 0.7;
    const DISCOUNT_MAX = 1.0;

    const $ = (sel: string) => root.getElementById(sel);
    const fmt0 = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const roundUp = (n: number) => Math.ceil(n);

    const p1El = $('slw-p1') as HTMLInputElement;
    const discountEl = $('slw-discount') as HTMLInputElement;
    const n5El = $('slw-n5') as HTMLInputElement;
    const r1 = $('slw-r1') as HTMLInputElement;
    const r5 = $('slw-r5') as HTMLInputElement;
    const rows = $('slw-rows') as HTMLElement;
    const tag1 = $('slw-tag1') as HTMLElement;
    const tag5 = $('slw-tag5') as HTMLElement;
    const val1 = $('slw-val1') as HTMLElement;
    const val5 = $('slw-val5') as HTMLElement;
    const p1Up = $('slw-p1-up') as HTMLElement;
    const p1Down = $('slw-p1-down') as HTMLElement;
    const dUp = $('slw-discount-up') as HTMLElement;
    const dDown = $('slw-discount-down') as HTMLElement;

    let nightly: number[] = Array(N).fill(0);
    let currentDiscount = initialDecay;

    const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    // Calculate the nth night price given p1 and discount
    function getNthNightPrice(p1: number, d: number, n: number) {
      if (n === 1) return p1;
      return p1 * Math.pow(d, n - 1);
    }

    // Solve for discount given p1 and target 5th night price
    function solveDiscountFromN5(p1: number, n5Target: number) {
      if (p1 <= 0) return DISCOUNT_MIN;
      // n5 = p1 * d^4, so d = (n5/p1)^(1/4)
      const ratio = n5Target / p1;
      if (ratio <= 0) return DISCOUNT_MIN;
      const d = Math.pow(ratio, 1/4);
      return clamp(d, DISCOUNT_MIN, DISCOUNT_MAX);
    }

    function updateBounds() {
      const p1 = +r1.value || 0;
      // For n5 slider: min is p1 * 0.7^4, max is p1 * 1.0^4 = p1
      const minN5 = Math.round(p1 * Math.pow(DISCOUNT_MIN, 4));
      const maxN5 = Math.round(p1 * Math.pow(DISCOUNT_MAX, 4));
      r5.min = String(minN5);
      r5.max = String(Math.max(maxN5, minN5));
    }

    function rebuildFrom(p1: number, d: number) {
      nightly[0] = roundUp(+p1);
      for (let k = 1; k < N; k++) nightly[k] = roundUp(nightly[k - 1] * d);
      syncUI();
    }

    function placeTags() {
      const wrap = root.querySelector('.ranges') as HTMLElement;
      if (!wrap) return;
      const rectWrap = wrap.getBoundingClientRect();
      if (rectWrap.width === 0) return;

      const pad = 12;
      const minGap = 84;

      const posOn = (input: HTMLInputElement) => {
        const r = input.getBoundingClientRect();
        const min = +input.min, max = +input.max, val = +input.value;
        const t = (val - min) / (max - min || 1);
        return (r.left - rectWrap.left) + r.width * t;
      };

      let x1 = posOn(r1);
      let x5 = posOn(r5);

      const clampX = (x: number) => Math.max(pad, Math.min(rectWrap.width - pad, x));
      if (Math.abs(x1 - x5) < minGap) {
        const mid = (x1 + x5) / 2;
        x1 = mid - minGap / 2;
        x5 = mid + minGap / 2;
      }
      x1 = clampX(x1);
      x5 = clampX(x5);

      tag1.style.left = x1 + 'px'; val1.style.left = x1 + 'px';
      tag5.style.left = x5 + 'px'; val5.style.left = x5 + 'px';

      val1.textContent = fmt0(+r1.value);
      val5.textContent = fmt0(+r5.value);
    }

    function renderTable() {
      let cum = 0;
      const body: string[] = [];
      for (let i = 0; i < N; i++) {
        cum += nightly[i];
        body.push(`<tr><td>${i + 1}</td><td>${fmt0(nightly[i])}</td><td>${fmt0(cum)}</td></tr>`);
      }
      rows.innerHTML = body.join('');
    }

    function broadcast() {
      const roundedNightly = nightly.map(v => Math.round(v));
      const payload = {
        p1: roundedNightly[0],
        n1: roundedNightly[0],
        n2: roundedNightly[1],
        n3: roundedNightly[2],
        n4: roundedNightly[3],
        n5: roundedNightly[4],
        n6: roundedNightly[5],
        n7: roundedNightly[6],
        decay: +currentDiscount.toFixed(3),
        total: sum(roundedNightly)
      };

      // Call React callback via ref (stable reference)
      if (onPricesChangeRef.current) {
        onPricesChangeRef.current(payload);
      }
    }

    function syncUI() {
      const p1 = nightly[0];
      const n5 = nightly[4]; // 5th night price (index 4)
      p1El.value = String(Math.round(p1));
      discountEl.value = currentDiscount.toFixed(3);
      n5El.value = String(Math.round(n5));
      r1.value = String(Math.round(p1));
      updateBounds();
      const n5Clamped = clamp(n5, +r5.min, +r5.max);
      r5.value = String(Math.round(n5Clamped));
      placeTags();
      renderTable();
      broadcast();
    }

    // Commit handlers (Enter/blur)
    function commitP1() {
      const raw = (p1El.value || '').trim();
      if (!raw) return;
      const p1 = Math.max(0, parseFloat(raw));
      if (!isFinite(p1)) return;
      rebuildFrom(p1, currentDiscount);
    }

    function commitDiscount() {
      const raw = (discountEl.value || '').trim();
      if (!raw) return;
      let d = parseFloat(raw);
      if (!isFinite(d)) return;
      d = clamp(d, DISCOUNT_MIN, DISCOUNT_MAX);
      currentDiscount = d;
      const p1 = Math.max(0, parseFloat(p1El.value || r1.value || '0'));
      rebuildFrom(p1, d);
    }

    // Slider interactions
    function onDragP1(val: number) {
      const p1 = Math.max(0, val);
      updateBounds();
      // Keep the current n5 value clamped to new bounds
      const n5Fixed = clamp(+r5.value || 0, +r5.min, +r5.max);
      const d = solveDiscountFromN5(p1, n5Fixed);
      currentDiscount = d;
      rebuildFrom(p1, d);
      r5.value = String(Math.round(n5Fixed));
      placeTags();
    }

    function onDragN5(n5Val: number) {
      const p1 = +r1.value || 0;
      updateBounds();
      const n5 = clamp(n5Val, +r5.min, +r5.max);
      const d = solveDiscountFromN5(p1, n5);
      currentDiscount = d;
      rebuildFrom(p1, d);
      r1.value = String(Math.round(p1));
      placeTags();
    }

    // Events
    p1El.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') commitP1(); });
    p1El.addEventListener('blur', commitP1);
    discountEl.addEventListener('input', commitDiscount);
    discountEl.addEventListener('change', commitDiscount);
    discountEl.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') commitDiscount(); });
    discountEl.addEventListener('blur', commitDiscount);
    r1.addEventListener('input', () => onDragP1(parseFloat(r1.value)));
    r5.addEventListener('input', () => onDragN5(parseFloat(r5.value)));

    // Spinners
    p1Up.addEventListener('click', () => { p1El.value = String(Math.round(+p1El.value || 0) + 1); commitP1(); });
    p1Down.addEventListener('click', () => { p1El.value = String(Math.max(0, Math.round(+p1El.value || 0) - 1)); commitP1(); });
    dUp.addEventListener('click', () => {
      currentDiscount = clamp(currentDiscount + 0.001, DISCOUNT_MIN, DISCOUNT_MAX);
      discountEl.value = currentDiscount.toFixed(3);
      const p1 = Math.max(0, parseFloat(p1El.value || r1.value || '0'));
      rebuildFrom(p1, currentDiscount);
    });
    dDown.addEventListener('click', () => {
      currentDiscount = clamp(currentDiscount - 0.001, DISCOUNT_MIN, DISCOUNT_MAX);
      discountEl.value = currentDiscount.toFixed(3);
      const p1 = Math.max(0, parseFloat(p1El.value || r1.value || '0'));
      rebuildFrom(p1, currentDiscount);
    });

    // Resize observer
    const ro = new ResizeObserver(() => placeTags());
    ro.observe(root.host);

    // Initialize
    currentDiscount = initialDecay;
    nightly = Array(N).fill(0);
    nightly[0] = initialP1;
    for (let i = 1; i < N; i++) nightly[i] = roundUp(nightly[i - 1] * initialDecay);
    r1.value = String(Math.round(initialP1));
    r5.value = String(Math.round(nightly[4])); // 5th night price
    syncUI();

    return () => {
      ro.disconnect();
    };
  }, []); // Empty deps - only run once on mount

  return <div ref={containerRef} style={{ width: '100%', minHeight: '400px' }} />;
};
