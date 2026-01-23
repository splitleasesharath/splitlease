/**
 * ResponseList - Scrollable list of survey responses (left panel)
 *
 * Props:
 * - responses: Array of adapted response objects
 * - selectedId: Currently selected response ID
 * - onSelect: Handler for selecting a response
 */

import ResponseListItem from './ResponseListItem';

export default function ResponseList({ responses, selectedId, onSelect }) {
  return (
    <div className="er-response-list">
      {responses.map((response) => (
        <ResponseListItem
          key={response.id}
          response={response}
          isSelected={response.id === selectedId}
          onSelect={() => onSelect(response.id)}
        />
      ))}
    </div>
  );
}
