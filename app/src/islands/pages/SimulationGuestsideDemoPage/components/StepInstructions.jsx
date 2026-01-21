/**
 * StepInstructions Component
 *
 * Displays instructional text between simulation steps.
 * Only visible when the previous step is completed.
 */

import { Info } from 'lucide-react';

export function StepInstructions({ text, visible = false }) {
  if (!visible) return null;

  return (
    <div className="step-instructions">
      <Info className="step-instructions__icon" size={16} />
      <p className="step-instructions__text">{text}</p>
    </div>
  );
}

export default StepInstructions;
