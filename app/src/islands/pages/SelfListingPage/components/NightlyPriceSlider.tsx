import React, { useState, useEffect, useCallback, useRef } from 'react';

interface NightlyPriceSliderProps {
  initialP1?: number;
  initialDecay?: number;
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
 * NightlyPriceSlider - Native React pricing slider with gradient legend
 *
 * Color Palette Style - displays 7 nights as gradient swatches from dark to light
 * instead of a table. Includes base rate input and long stay discount slider.
 *
 * Ported from SelfListingPageV2 for consistency and maintainability.
 */
export const NightlyPriceSlider: React.FC<NightlyPriceSliderProps> = ({
  initialP1 = 100,
  initialDecay = 0.95,
  onPricesChange
}) => {
  // Convert initial decay to discount percentage
  // decay = 1 - (discount/100)^0.25 approximately
  const initialDiscountPercent = Math.round((1 - initialDecay) * 100 / 0.25) || 20;

  const [baseRate, setBaseRate] = useState(initialP1);
  const [discountPercent, setDiscountPercent] = useState(Math.min(50, Math.max(0, initialDiscountPercent)));
  const nightlyPricesRef = useRef<number[]>([initialP1, initialP1, initialP1, initialP1, initialP1, initialP1, initialP1]);

  // Callback ref to avoid re-renders
  const onPricesChangeRef = useRef(onPricesChange);
  useEffect(() => {
    onPricesChangeRef.current = onPricesChange;
  }, [onPricesChange]);

  const N = 7;
  const DECAY_MIN = 0.7;
  const DECAY_MAX = 1.0;

  const fmt0 = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtShort = (n: number) => '$' + Math.round(n);
  const roundUp = (n: number) => Math.ceil(n);
  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

  const solveDecay = useCallback((p1: number, p5: number): number => {
    if (p1 <= 0) return 1.0;
    if (p5 >= p1) return 1.0;
    const ratio = p5 / p1;
    const d = Math.pow(ratio, 0.25);
    return clamp(d, DECAY_MIN, DECAY_MAX);
  }, []);

  // Calculate nightly prices based on base rate and discount
  const calculatePrices = useCallback(() => {
    const p5Target = baseRate * (1 - (discountPercent / 100));
    const decay = solveDecay(baseRate, p5Target);

    const prices: number[] = [roundUp(baseRate)];
    for (let i = 1; i < N; i++) {
      prices.push(roundUp(prices[i - 1] * decay));
    }

    nightlyPricesRef.current = prices;

    // Broadcast changes
    if (onPricesChangeRef.current) {
      const roundedNightly = prices.map(v => Math.round(v));
      onPricesChangeRef.current({
        p1: roundedNightly[0],
        n1: roundedNightly[0],
        n2: roundedNightly[1],
        n3: roundedNightly[2],
        n4: roundedNightly[3],
        n5: roundedNightly[4],
        n6: roundedNightly[5],
        n7: roundedNightly[6],
        decay: +decay.toFixed(3),
        total: roundedNightly.reduce((a, b) => a + b, 0)
      });
    }

    return { prices, decay };
  }, [baseRate, discountPercent, solveDecay]);

  // Recalculate whenever base rate or discount changes
  useEffect(() => {
    calculatePrices();
  }, [calculatePrices]);

  // Calculate derived values
  // prices[N-1] = price per night for an N-night stay
  // Total for N nights = N * prices[N-1]
  const prices = nightlyPricesRef.current;
  const fiveNightPricePerNight = prices[4]; // Price per night for 5-night stay
  const fiveNightTotal = 5 * fiveNightPricePerNight;
  const avgPrice = fiveNightPricePerNight; // For 5-night stay, avg = per night price
  const monthlyEstimate = fiveNightTotal * 4;
  const sevenNightTotal = 7 * prices[6]; // 7 nights × price per night for 7-night stay

  // Handle base rate input change
  const handleBaseRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 0) val = 0;
    setBaseRate(val);
  };

  // Handle discount slider change
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountPercent(parseInt(e.target.value));
  };

  return (
    <div className="nightly-price-slider">
      {/* Base Nightly Rate Input */}
      <div className="control-group" style={{ textAlign: 'center' }}>
        <label className="calc-label" style={{ display: 'block', marginBottom: '10px' }}>
          Base Nightly Rate
        </label>
        <div className="base-input-wrapper">
          <span className="currency-symbol">$</span>
          <input
            type="number"
            className="base-input"
            value={baseRate}
            onChange={handleBaseRateChange}
            min="0"
            step="1"
          />
        </div>
      </div>

      {/* Long Stay Discount Slider */}
      <div className="control-group">
        <div className="label-row">
          <span className="calc-label">Long Stay Discount</span>
          <span className="value-display">{discountPercent}%</span>
        </div>
        <div className="range-wrapper">
          <input
            type="range"
            min="0"
            max="50"
            value={discountPercent}
            onChange={handleDiscountChange}
          />
        </div>
        <div className="marks">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
        </div>
        <p className="calc-hint">
          Consecutive nights get progressively cheaper. A 5-night stay averages <strong>{fmt0(avgPrice)}</strong>/night.
        </p>
      </div>

      {/* Color Palette Display */}
      <div className="nights-display-wrapper">
        <div className="nights-display-header">Price per consecutive night</div>
        <div className="palette-container">
          <div className="palette-row">
            {[1, 2, 3, 4, 5, 6, 7].map(night => (
              <div key={night} className={`palette-swatch n${night}`}>
                <span className="swatch-number">Night {night}</span>
                <span className="swatch-price">{fmtShort(prices[night - 1])}</span>
                <span className="swatch-label">per night</span>
              </div>
            ))}
          </div>
        </div>
        <div className="formula-row">
          {prices.map((pricePerNight, idx) => {
            // Total for N nights = N * (price per night for that stay length)
            const nightCount = idx + 1;
            const total = nightCount * pricePerNight;
            return <div key={idx} className="formula-item">{fmtShort(total)}</div>;
          })}
        </div>
        <div className="formula-total-row">
          <div className="formula-total-label">7-Night Total</div>
          <div className="formula-total">{fmtShort(sevenNightTotal)}</div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="summary-row">
        <div className="summary-item">
          <div className="summary-label">5-Night Total</div>
          <div className="summary-value">{fmt0(fiveNightTotal)}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Est. Monthly (4 weeks)</div>
          <div className="summary-value">{fmt0(monthlyEstimate)}</div>
        </div>
      </div>

      {/* Smart Pricing explanation */}
      <details className="pricing-details">
        <summary>How does Smart Pricing work?</summary>
        <div className="details-content">
          We calculate a "decay curve" for your pricing. The first night is your full Base Rate.
          Each consecutive night gets slightly cheaper based on your Discount setting.
          <br /><br />
          This encourages guests to book longer blocks (like Mon-Fri) instead of just two nights,
          maximizing your occupancy and reducing turnover effort.
        </div>
      </details>
    </div>
  );
};
