/**
 * StepInstructions Component
 *
 * Displays the "between step" instructional text that appears after
 * a step is clicked but before the next step becomes active.
 * Tells users to return to the Google Doc for instructions.
 *
 * @module pages/SimulationHostsideDemoPage/components/StepInstructions
 */

import { BookOpen } from 'lucide-react';

/**
 * StepInstructions component
 *
 * @param {Object} props
 * @param {string} props.text - The instruction text to display
 * @param {boolean} props.visible - Whether to show the instructions
 */
export function StepInstructions({ text, visible }) {
  if (!visible || !text) return null;

  return (
    <div className="host-step-instructions">
      <BookOpen className="host-step-instructions__icon" size={16} />
      <p className="host-step-instructions__text">{text}</p>
    </div>
  );
}

export default StepInstructions;
