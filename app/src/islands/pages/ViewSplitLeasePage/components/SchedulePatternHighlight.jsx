/**
 * Calculate actual weeks from reservation span based on schedule pattern
 */
export function calculateActualWeeks(reservationSpan, weeksOffered) {
  // Normalize the pattern string for comparison
  const pattern = (weeksOffered || 'Every week').toLowerCase().trim();

  // Every week or nightly/monthly patterns - no highlighting needed
  if (pattern === 'every week' || pattern === '') {
    return {
      actualWeeks: reservationSpan,
      cycleDescription: null,
      showHighlight: false
    };
  }

  // One week on, one week off - 2 week cycle, guest gets 1 week per cycle
  if (pattern.includes('one week on') && pattern.includes('one week off')) {
    const cycles = reservationSpan / 2;
    const actualWeeks = Math.floor(cycles); // 1 week per 2-week cycle
    return {
      actualWeeks,
      cycleDescription: '1 week on, 1 week off',
      showHighlight: true,
      weeksOn: 1,
      weeksOff: 1
    };
  }

  // Two weeks on, two weeks off - 4 week cycle, guest gets 2 weeks per cycle
  if (pattern.includes('two weeks on') && pattern.includes('two weeks off')) {
    const cycles = reservationSpan / 4;
    const actualWeeks = Math.floor(cycles * 2); // 2 weeks per 4-week cycle
    return {
      actualWeeks,
      cycleDescription: '2 weeks on, 2 weeks off',
      showHighlight: true,
      weeksOn: 2,
      weeksOff: 2
    };
  }

  // One week on, three weeks off - 4 week cycle, guest gets 1 week per cycle
  if (pattern.includes('one week on') && pattern.includes('three weeks off')) {
    const cycles = reservationSpan / 4;
    const actualWeeks = Math.floor(cycles); // 1 week per 4-week cycle
    return {
      actualWeeks,
      cycleDescription: '1 week on, 3 weeks off',
      showHighlight: true,
      weeksOn: 1,
      weeksOff: 3
    };
  }

  // Default: treat as every week
  return {
    actualWeeks: reservationSpan,
    cycleDescription: null,
    showHighlight: false
  };
}

/**
 * Component to display schedule pattern info when applicable
 */
export function SchedulePatternHighlight({ pattern, reservationSpan }) {
  const patternInfo = pattern || calculateActualWeeks(reservationSpan, '');

  if (!patternInfo.showHighlight) {
    return null;
  }

  return (
    <div className="schedule-highlight">
      <div className="schedule-highlight-header">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#7C3AED"
          strokeWidth="2"
        >
          <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
        <span className="schedule-highlight-title">
          {patternInfo.cycleDescription}
        </span>
      </div>
      <div className="schedule-highlight-content">
        <span className="schedule-highlight-actual">{patternInfo.actualWeeks} actual weeks</span>
        <span className="schedule-highlight-span"> of stay within {reservationSpan}-week span</span>
      </div>
    </div>
  );
}
