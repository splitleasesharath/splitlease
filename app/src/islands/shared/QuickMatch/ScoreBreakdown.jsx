/**
 * ScoreBreakdown Component
 *
 * Visual breakdown of the match score by criterion.
 * Shows each scoring category with score/max and progress bar.
 *
 * @param {object} props
 * @param {object} props.breakdown - Score breakdown object from formatMatchResult
 * @param {number} props.totalScore - Total match score
 * @param {number} props.maxPossibleScore - Maximum possible score (default: 95)
 * @param {boolean} props.compact - Whether to show compact version
 */
import React from 'react';

export function ScoreBreakdown({ breakdown, totalScore, maxPossibleScore = 95, compact = false }) {
  if (!breakdown) {
    return null;
  }

  // Calculate percentage for progress bar
  const getPercent = (score, max) => {
    if (!max || max === 0) return 0;
    return Math.round((score / max) * 100);
  };

  // Get color class based on percentage
  const getColorClass = (percent) => {
    if (percent >= 80) return 'qm-score-bar--excellent';
    if (percent >= 60) return 'qm-score-bar--good';
    if (percent >= 40) return 'qm-score-bar--fair';
    return 'qm-score-bar--poor';
  };

  // Order of criteria to display
  const criteriaOrder = ['borough', 'price', 'schedule', 'weeklyStay', 'duration', 'host'];

  const overallPercent = getPercent(totalScore, maxPossibleScore);

  return (
    <div className={`qm-score-breakdown ${compact ? 'qm-score-breakdown--compact' : ''}`}>
      {/* Overall Score */}
      <div className="qm-score-overall">
        <div className="qm-score-overall-header">
          <span className="qm-score-overall-label">Match Score</span>
          <span className="qm-score-overall-value">
            {Math.round(totalScore)}/{maxPossibleScore}
          </span>
        </div>
        <div className="qm-score-bar qm-score-bar--overall">
          <div
            className={`qm-score-bar-fill ${getColorClass(overallPercent)}`}
            style={{ width: `${overallPercent}%` }}
            role="progressbar"
            aria-valuenow={totalScore}
            aria-valuemin={0}
            aria-valuemax={maxPossibleScore}
            aria-label={`Overall score: ${totalScore} out of ${maxPossibleScore}`}
          />
        </div>
        <span className="qm-score-overall-percent">{overallPercent}%</span>
      </div>

      {/* Individual Criteria */}
      {!compact && (
        <div className="qm-score-criteria">
          {criteriaOrder.map((key) => {
            const criterion = breakdown[key];
            if (!criterion) return null;

            const percent = getPercent(criterion.score, criterion.max);

            return (
              <div key={key} className="qm-score-criterion">
                <div className="qm-criterion-header">
                  <span className="qm-criterion-label">{criterion.label}</span>
                  <span className="qm-criterion-score">
                    {criterion.score}/{criterion.max}
                  </span>
                </div>
                <div className="qm-score-bar">
                  <div
                    className={`qm-score-bar-fill ${getColorClass(percent)}`}
                    style={{ width: `${percent}%` }}
                    role="progressbar"
                    aria-valuenow={criterion.score}
                    aria-valuemin={0}
                    aria-valuemax={criterion.max}
                    aria-label={`${criterion.label}: ${criterion.score} out of ${criterion.max}`}
                  />
                </div>
                {criterion.description && (
                  <span className="qm-criterion-desc">{criterion.description}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
