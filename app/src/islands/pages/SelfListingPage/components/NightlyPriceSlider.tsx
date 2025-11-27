import React, { useEffect, useRef, useState } from 'react';

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
    decay: number;
    total: number;
  }) => void;
}

export const NightlyPriceSlider: React.FC<NightlyPriceSliderProps> = ({
  initialP1 = 100,
  initialDecay = 0.95,
  n2,
  n3,
  n4,
  n5,
  onPricesChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Check if shadow root already exists, if not create it
    if (!shadowRootRef.current) {
      shadowRootRef.current = container.shadowRoot || container.attachShadow({ mode: 'open' });
    }

    const shadowRoot = shadowRootRef.current;

    // Build the Shadow DOM content
    shadowRoot.innerHTML = `
      <style>
        :host { all: initial; }
        .app{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827; background:#fff; max-width:100%; width:100%; margin:0; padding:12px; box-sizing:border-box; }
        .row{ display:grid; grid-template-columns: 1fr auto auto; gap:16px; align-items:end; margin: 8px 0 16px; }
        .field{ display:grid; gap:6px; min-width:0; }
        .label{ font-size:13px; color:#6b7280; }
        .num{ font: inherit; padding:10px 12px; border-radius:12px; border:1px solid #e5e7eb; width:100%; box-sizing:border-box; }
        .spin{ display:inline-flex; align-items:center; gap:8px; width:100%; }
        .spin .buttons{ display:flex; flex-direction:column; }
        .spin .btn{ width:32px; height:24px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; cursor:pointer; line-height:1; font-size:12px; }
        .spin .btn + .btn{ margin-top:6px; }

        .track-wrap{ position:relative; height:64px; }
        .track{ position:absolute; left:0; right:0; top:50%; transform:translateY(-50%); height:10px; background:linear-gradient(#9ea0a3,#9ea0a3) center/100% 10px no-repeat, #c9c9c9; border-radius:999px; }
        .ranges{ position:absolute; inset:0; display:grid; place-items:center; pointer-events:none; }
        .ranges input[type=range]{ pointer-events:auto; -webkit-appearance:none; appearance:none; position:absolute; top:50%; transform:translateY(-50%); background:transparent; height:36px; width:auto; touch-action:none; cursor:grab; }
        .ranges input[type=range]:active{ cursor:grabbing; }
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
        #slw-decay::-webkit-outer-spin-button,
        #slw-decay::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
        #slw-decay{ -moz-appearance:textfield; appearance:textfield; }
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
            <div class="label">Decay per additional night (0.700–1.000)</div>
            <div class="spin">
              <input id="slw-decay" class="num" type="number" min="0.7" max="1" step="0.001" inputmode="decimal" value="0.950" />
              <div class="buttons">
                <button class="btn" id="slw-decay-up" aria-label="Increase decay">▲</button>
                <button class="btn" id="slw-decay-down" aria-label="Decrease decay">▼</button>
              </div>
            </div>
          </div>
          <div class="field">
            <div class="label">5-night total</div>
            <input id="slw-total" class="num" type="text" inputmode="numeric" value="" readonly />
          </div>
        </div>

        <div class="track-wrap">
          <div class="track"></div>
          <div class="ranges">
            <input id="slw-r1" type="range" min="0" max="600" step="1" value="100" aria-label="1-night price" />
            <input id="slw-r5" type="range" min="0" max="2000" step="1" value="0" aria-label="5-night total" />

            <div id="slw-tag1" class="tag">1 night price</div>
            <div id="slw-val1" class="value">$100</div>
            <div id="slw-tag5" class="tag">5 night total</div>
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

    // JavaScript logic - create function that takes shadow root as parameter
    const initSlider = (shadowRoot: ShadowRoot) => {
      const N = 5;
      const DECAY_MIN = 0.7;
      const DECAY_MAX = 1.0;

      const root = shadowRoot;
      const $ = (sel: string) => root.getElementById(sel);
      const fmt0 = (n: number) => n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0});
      const roundUp = (n: number) => Math.ceil(n);

      const p1El = $('slw-p1') as HTMLInputElement;
      const decayEl = $('slw-decay') as HTMLInputElement;
      const totalEl = $('slw-total') as HTMLInputElement;
      const r1 = $('slw-r1') as HTMLInputElement;
      const r5 = $('slw-r5') as HTMLInputElement;
      const rows = $('slw-rows') as HTMLElement;
      const tag1 = $('slw-tag1') as HTMLElement;
      const tag5 = $('slw-tag5') as HTMLElement;
      const val1 = $('slw-val1') as HTMLElement;
      const val5 = $('slw-val5') as HTMLElement;
      const p1Up = $('slw-p1-up') as HTMLElement;
      const p1Down = $('slw-p1-down') as HTMLElement;
      const dUp = $('slw-decay-up') as HTMLElement;
      const dDown = $('slw-decay-down') as HTMLElement;

      let nightly: number[] = Array(N).fill(0);
      let currentDecay = initialDecay;
      let broadcastTimeoutId: number | null = null;

      // Drag state tracking for smooth slider movement
      let isDraggingR1 = false;
      let isDraggingR5 = false;
      let rafId: number | null = null;
      let pendingUpdate: (() => void) | null = null;

      // Store the last known total during r1 drag (don't update r5 slider during drag)
      let frozenTotalForR1Drag = 0;

      const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
      const sum = (arr: number[]) => arr.reduce((a,b)=>a+b,0);

      function sumSeries(p1: number, d: number) {
        if (Math.abs(1 - d) < 1e-10) return p1 * N;
        return p1 * (1 - Math.pow(d, N)) / (1 - d);
      }

      function solveDecay(p1: number, S: number) {
        if (p1 <= 0) return DECAY_MIN;
        const Smin = sumSeries(p1, DECAY_MIN);
        const Smax = sumSeries(p1, DECAY_MAX);
        const T = clamp(S, Smin, Smax);
        if (Math.abs(T - Smin) < 1e-6) return DECAY_MIN;
        if (Math.abs(T - Smax) < 1e-6) return DECAY_MAX;
        let lo = DECAY_MIN, hi = DECAY_MAX, mid: number;
        for (let i=0;i<50;i++) {
          mid = (lo+hi)/2;
          const Sm = sumSeries(p1, mid);
          if (Sm < T) lo = mid; else hi = mid;
        }
        return clamp((lo+hi)/2, DECAY_MIN, DECAY_MAX);
      }

      // Update bounds without triggering value changes
      function updateBoundsOnly() {
        const p1 = +r1.value || 0;
        const minTotal = sumSeries(p1, DECAY_MIN);
        const maxTotal = sumSeries(p1, DECAY_MAX);
        r5.min = String(Math.round(minTotal));
        r5.max = String(Math.round(Math.max(maxTotal, minTotal)));
      }

      function rebuildNightly(p1: number, d: number) {
        nightly[0] = roundUp(+p1);
        for (let k=1;k<N;k++) nightly[k] = roundUp(nightly[k-1] * d);
      }

      function placeTags() {
        const wrap = root.querySelector('.ranges') as HTMLElement;
        if (!wrap) return;
        const rectWrap = wrap.getBoundingClientRect();
        if (rectWrap.width === 0) return; // Not visible yet

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

        tag1.style.left = x1 + 'px';  val1.style.left = x1 + 'px';
        tag5.style.left = x5 + 'px';  val5.style.left = x5 + 'px';

        val1.textContent = fmt0(+r1.value);
        val5.textContent = fmt0(+r5.value);
      }

      function renderTable() {
        let cum = 0;
        const body: string[] = [];
        for (let i=0;i<N;i++) {
          cum += nightly[i];
          body.push(`<tr><td>${i+1}</td><td>${fmt0(nightly[i])}</td><td>${fmt0(cum)}</td></tr>`);
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
          decay: +currentDecay.toFixed(3),
          total: sum(roundedNightly)
        };

        // Dispatch to parent React component
        const event = new CustomEvent('nightly-prices-update', {
          detail: payload,
          bubbles: true,
          composed: true
        });
        root.host.dispatchEvent(event);
      }

      // Debounced broadcast for smoother dragging
      function broadcastDebounced() {
        if (broadcastTimeoutId !== null) {
          clearTimeout(broadcastTimeoutId);
        }
        broadcastTimeoutId = window.setTimeout(() => {
          broadcast();
          broadcastTimeoutId = null;
        }, 50); // Slower updates during drag for better performance
      }

      // RAF-based visual update to prevent jank
      function scheduleVisualUpdate(updateFn: () => void) {
        pendingUpdate = updateFn;
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            if (pendingUpdate) {
              pendingUpdate();
              pendingUpdate = null;
            }
          });
        }
      }

      // Update UI elements (text inputs, table) without touching sliders
      function updateTextUI() {
        const p1 = nightly[0];
        const total = sum(nightly);
        p1El.value = String(Math.round(p1));
        decayEl.value = currentDecay.toFixed(3);
        totalEl.value = String(Math.round(total));
      }

      // Full sync when not dragging
      function syncUI() {
        const p1 = nightly[0];
        const total = sum(nightly);

        updateTextUI();

        // Only update sliders when not being dragged
        if (!isDraggingR1) {
          r1.value = String(Math.round(p1));
        }

        updateBoundsOnly();

        if (!isDraggingR5) {
          r5.value = String(Math.round(total));
        }

        placeTags();
        renderTable();
        broadcast();
      }

      function commitP1() {
        const raw = (p1El.value||'').trim(); if (!raw) return;
        const p1 = Math.max(0, parseFloat(raw)); if (!isFinite(p1)) return;
        rebuildNightly(p1, currentDecay);
        syncUI();
      }

      function commitDecay() {
        const raw = (decayEl.value||'').trim(); if (!raw) return;
        let d = parseFloat(raw); if (!isFinite(d)) return;
        d = clamp(d, DECAY_MIN, DECAY_MAX);
        currentDecay = d;
        const p1 = Math.max(0, parseFloat(p1El.value||r1.value||'0'));
        rebuildNightly(p1, d);
        syncUI();
      }

      // Optimized drag handler for r1 (1-night price slider)
      function onDragP1() {
        const val = parseFloat(r1.value);
        const p1 = Math.max(0, val);

        // Use frozen total during drag to maintain consistency
        const targetTotal = isDraggingR1 ? frozenTotalForR1Drag : (+r5.value || sum(nightly));
        const d = solveDecay(p1, targetTotal);
        currentDecay = d;

        // Rebuild nightly values
        rebuildNightly(p1, d);

        // Schedule visual update via RAF - DO NOT update r5.value during drag
        scheduleVisualUpdate(() => {
          updateTextUI();
          updateBoundsOnly();
          // Only update tags and table, NOT the r5 slider value during drag
          placeTags();
          renderTable();
        });

        broadcastDebounced();
      }

      // Optimized drag handler for r5 (5-night total slider)
      function onDragTotal() {
        const Sval = parseFloat(r5.value);
        const p1 = +r1.value || nightly[0];

        // Calculate bounds
        const minTotal = sumSeries(p1, DECAY_MIN);
        const maxTotal = sumSeries(p1, DECAY_MAX);
        const S = clamp(Sval, minTotal, maxTotal);

        // Solve for decay
        const d = solveDecay(p1, S);
        currentDecay = d;

        // Rebuild nightly values
        rebuildNightly(p1, d);

        // Schedule visual update via RAF
        scheduleVisualUpdate(() => {
          updateTextUI();
          placeTags();
          renderTable();
        });

        broadcastDebounced();
      }

      // Drag state handlers for smooth slider movement
      function startDragR1(e: PointerEvent | MouseEvent | TouchEvent) {
        isDraggingR1 = true;
        // Freeze current total so r5 slider doesn't jump during drag
        frozenTotalForR1Drag = +r5.value || sum(nightly);

        // Use pointer capture for reliable drag tracking
        if ('setPointerCapture' in r1 && 'pointerId' in e) {
          r1.setPointerCapture((e as PointerEvent).pointerId);
        }

        // Add document-level listeners for drag end (works even if mouse leaves element)
        document.addEventListener('mouseup', endDragR1Global, { once: true });
        document.addEventListener('touchend', endDragR1Global, { once: true });
      }

      function endDragR1() {
        if (!isDraggingR1) return;
        isDraggingR1 = false;
        // Final sync: now update r5 slider to actual calculated total
        syncUI();
      }

      function endDragR1Global() {
        endDragR1();
      }

      function startDragR5(e: PointerEvent | MouseEvent | TouchEvent) {
        isDraggingR5 = true;

        // Use pointer capture for reliable drag tracking
        if ('setPointerCapture' in r5 && 'pointerId' in e) {
          r5.setPointerCapture((e as PointerEvent).pointerId);
        }

        // Add document-level listeners for drag end
        document.addEventListener('mouseup', endDragR5Global, { once: true });
        document.addEventListener('touchend', endDragR5Global, { once: true });
      }

      function endDragR5() {
        if (!isDraggingR5) return;
        isDraggingR5 = false;
        // Final sync and broadcast when drag ends
        syncUI();
      }

      function endDragR5Global() {
        endDragR5();
      }

      // Events for text inputs
      p1El.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') commitP1(); });
      p1El.addEventListener('blur', commitP1);
      decayEl.addEventListener('change', commitDecay);
      decayEl.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') commitDecay(); });
      decayEl.addEventListener('blur', commitDecay);

      // Drag start tracking for r1 - use pointerdown for unified mouse/touch handling
      r1.addEventListener('pointerdown', startDragR1);
      // Fallback for older browsers
      r1.addEventListener('mousedown', startDragR1 as EventListener);
      r1.addEventListener('touchstart', startDragR1 as EventListener, { passive: true });

      // Drag start tracking for r5
      r5.addEventListener('pointerdown', startDragR5);
      r5.addEventListener('mousedown', startDragR5 as EventListener);
      r5.addEventListener('touchstart', startDragR5 as EventListener, { passive: true });

      // NOTE: mouseup/touchend are handled at document level in startDrag functions
      // NOTE: mouseleave handlers REMOVED - they caused premature drag termination

      // Range slider input events - use native values directly
      r1.addEventListener('input', onDragP1);
      r5.addEventListener('input', onDragTotal);

      // Change event fires for keyboard navigation (arrow keys, etc.)
      // Drag end is handled via document-level listeners for pointer/mouse/touch
      r1.addEventListener('change', () => { if (!isDraggingR1) syncUI(); });
      r5.addEventListener('change', () => { if (!isDraggingR5) syncUI(); });

      // Spinners
      p1Up.addEventListener('click', () => { p1El.value = String(Math.round(+p1El.value||0) + 1); commitP1(); });
      p1Down.addEventListener('click', () => { p1El.value = String(Math.max(0, Math.round(+p1El.value||0) - 1)); commitP1(); });
      dUp.addEventListener('click', () => {
        currentDecay = clamp(currentDecay + 0.001, DECAY_MIN, DECAY_MAX);
        rebuildNightly(nightly[0], currentDecay);
        syncUI();
      });
      dDown.addEventListener('click', () => {
        currentDecay = clamp(currentDecay - 0.001, DECAY_MIN, DECAY_MAX);
        rebuildNightly(nightly[0], currentDecay);
        syncUI();
      });

      // Resize observer
      const ro = new ResizeObserver(() => placeTags());
      ro.observe(root.host);

      // Initialize
      const p1 = initialP1;
      const d = initialDecay;
      currentDecay = d;
      nightly = Array(N).fill(0);
      nightly[0] = p1;
      for (let i=1;i<N;i++) nightly[i] = roundUp(nightly[i-1]*d);
      r1.value = String(Math.round(p1));
      r5.value = String(Math.round(sumSeries(p1,d)));
      updateBoundsOnly();
      syncUI();
    };

    // Call the initialization function
    initSlider(shadowRoot);

    // Listen for price updates from Shadow DOM
    const handlePriceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (onPricesChange && customEvent.detail) {
        onPricesChange(customEvent.detail);
      }
    };

    container.addEventListener('nightly-prices-update', handlePriceUpdate);

    return () => {
      container.removeEventListener('nightly-prices-update', handlePriceUpdate);
    };
  }, [initialP1, initialDecay, onPricesChange]);

  return <div ref={containerRef} style={{ width: '100%', minHeight: '400px' }} />;
};
