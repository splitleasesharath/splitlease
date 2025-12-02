/**
 * Proposal Selector Component
 *
 * Dropdown for selecting between multiple proposals.
 * Shows proposal count inline with title (matching Bubble: "My Proposals (4)")
 * and allows quick switching between proposals.
 *
 * Note: Count excludes deleted proposals and proposals cancelled by guest
 * (filtering handled in userProposalQueries.js)
 */

export default function ProposalSelector({ proposals, selectedId, onSelect, count }) {
  if (!proposals || proposals.length === 0) {
    return null;
  }

  const handleChange = (e) => {
    onSelect(e.target.value);
  };

  return (
    <div className="proposal-selector">
      <div className="selector-header">
        <h2>My Proposals ({count})</h2>
      </div>

      <select
        className="proposal-dropdown"
        value={selectedId || ''}
        onChange={handleChange}
      >
        {proposals.map((proposal) => (
          <option key={proposal.id} value={proposal.id}>
            {proposal.label}
          </option>
        ))}
      </select>
    </div>
  );
}
