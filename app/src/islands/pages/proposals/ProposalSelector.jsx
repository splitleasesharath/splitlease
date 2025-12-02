/**
 * Proposal Selector Component
 *
 * Dropdown for selecting between multiple proposals.
 * Shows proposal count and allows quick switching between proposals.
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
        <h2>My Proposals</h2>
        <span className="proposal-count">{count}</span>
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
