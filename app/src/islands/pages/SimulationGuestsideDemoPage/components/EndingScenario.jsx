/**
 * EndingScenario Component
 *
 * Container for a branching path in the simulation.
 * Each ending scenario contains Steps C, D, and E for that path.
 *
 * When one path is selected, the other becomes dimmed.
 */

import StepButton from './StepButton.jsx';

export function EndingScenario({
  ending,
  title,
  currentStep,
  selectedPath,
  completedSteps,
  stepInProgress,
  onStepC,
  onStepD,
  onStepE,
  disabled = false
}) {
  const isThisPath = selectedPath === ending;
  const isOtherPathSelected = selectedPath !== null && selectedPath !== ending;

  // Determine which steps are completed for this ending
  const isCCompleted = completedSteps.includes(`C${ending}`);
  const isDCompleted = completedSteps.includes(`D${ending}`);
  const isECompleted = completedSteps.includes(`E${ending}`);

  // Determine which step is currently loading
  const isCLoading = stepInProgress === `C${ending}`;
  const isDLoading = stepInProgress === `D${ending}`;
  const isELoading = stepInProgress === `E${ending}`;

  // Determine which steps are active (can be clicked)
  const isCActive = currentStep === 'C' && !selectedPath && !disabled;
  const isDActive = currentStep === 'D' && isThisPath;
  const isEActive = currentStep === 'E' && isThisPath;

  return (
    <div className={`ending-scenario ending-scenario--${ending} ${isOtherPathSelected ? 'ending-scenario--dimmed' : ''}`}>
      <h3 className="ending-scenario__title">{title}</h3>

      <div className="ending-scenario__steps">
        <StepButton
          step="C"
          label={ending === 1 ? 'Host #2 Accepts your Proposal' : 'Host #3 Counteroffers your Proposal'}
          isActive={isCActive}
          isCompleted={isCCompleted}
          isLoading={isCLoading}
          onClick={onStepC}
          disabled={disabled || isOtherPathSelected || isCCompleted}
        />

        <StepButton
          step="D"
          label="Drafting of Lease & House Manual Created"
          isActive={isDActive}
          isCompleted={isDCompleted}
          isLoading={isDLoading}
          onClick={onStepD}
          disabled={!isCCompleted || isDCompleted}
        />

        <StepButton
          step="E"
          label="Signing of Lease & Initial Payment Made"
          isActive={isEActive}
          isCompleted={isECompleted}
          isLoading={isELoading}
          onClick={onStepE}
          disabled={!isDCompleted || isECompleted}
        />
      </div>
    </div>
  );
}

export default EndingScenario;
