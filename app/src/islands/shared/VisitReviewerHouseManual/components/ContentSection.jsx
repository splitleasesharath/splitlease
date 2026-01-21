/**
 * ContentSection Component
 *
 * A collapsible section that renders different content types.
 * Handles text, WiFi credentials, rules lists, checklists, and contacts.
 *
 * @param {Object} props
 * @param {Object} props.section - Section data
 * @param {string} props.section.id - Section ID
 * @param {string} props.section.title - Section title
 * @param {string} props.section.type - Content type (text, wifi, rules, checklist, contacts)
 * @param {*} props.section.content - Section content
 * @param {boolean} props.isExpanded - Whether section is expanded
 * @param {function} props.onToggle - Toggle handler
 * @param {function} [props.onMapView] - Called when map is viewed
 * @param {function} [props.onNarrationPlay] - Called when narration is played
 */

import { useState, useCallback } from 'react';

const ContentSection = ({
  section,
  isExpanded,
  onToggle,
  onMapView = null,
  onNarrationPlay = null,
}) => {
  const { id, title, type, content } = section;

  // Get icon for section type
  const sectionIcon = getSectionIcon(id, type);

  return (
    <div className={`vrhm-section ${isExpanded ? 'vrhm-section--expanded' : ''}`}>
      <button
        type="button"
        className="vrhm-section__header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`section-content-${id}`}
      >
        <div className="vrhm-section__header-left">
          <span className="vrhm-section__icon" aria-hidden="true">
            {sectionIcon}
          </span>
          <h4 className="vrhm-section__title">{title}</h4>
        </div>
        <span className="vrhm-section__toggle" aria-hidden="true">
          &#9660;
        </span>
      </button>

      <div
        id={`section-content-${id}`}
        className={`vrhm-section__content ${
          !isExpanded ? 'vrhm-section__content--collapsed' : ''
        }`}
      >
        <SectionContent
          type={type}
          content={content}
          sectionId={id}
          onMapView={onMapView}
          onNarrationPlay={onNarrationPlay}
        />
      </div>
    </div>
  );
};

/**
 * Renders content based on section type.
 */
const SectionContent = ({
  type,
  content,
  sectionId,
  onMapView,
  onNarrationPlay,
}) => {
  if (!content) {
    return <p className="vrhm-text-content">No information available.</p>;
  }

  switch (type) {
    case 'wifi':
      return (
        <WiFiContent
          content={content}
        />
      );

    case 'rules':
      return <RulesContent content={content} />;

    case 'checklist':
      return <ChecklistContent content={content} />;

    case 'contacts':
      return <ContactsContent content={content} />;

    case 'text':
    default:
      return <TextContent content={content} />;
  }
};

/**
 * Plain text content renderer.
 */
const TextContent = ({ content }) => {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  return <div className="vrhm-text-content">{text}</div>;
};

/**
 * WiFi credentials renderer with copy functionality.
 */
const WiFiContent = ({ content }) => {
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = useCallback(async (field, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.warn('Failed to copy:', err);
    }
  }, []);

  const { networkName, password, photo } = content;

  return (
    <div className="vrhm-wifi">
      {networkName && (
        <div className="vrhm-wifi__row">
          <span className="vrhm-wifi__label">Network:</span>
          <span className="vrhm-wifi__value">{networkName}</span>
          <button
            type="button"
            className="vrhm-wifi__copy-btn"
            onClick={() => handleCopy('network', networkName)}
          >
            {copiedField === 'network' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {password && (
        <div className="vrhm-wifi__row">
          <span className="vrhm-wifi__label">Password:</span>
          <span className="vrhm-wifi__value">{password}</span>
          <button
            type="button"
            className="vrhm-wifi__copy-btn"
            onClick={() => handleCopy('password', password)}
          >
            {copiedField === 'password' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {photo && (
        <img
          src={photo}
          alt="WiFi instructions"
          className="vrhm-wifi__photo"
        />
      )}
    </div>
  );
};

/**
 * Rules list renderer.
 */
const RulesContent = ({ content }) => {
  // Handle both array and string formats
  if (Array.isArray(content)) {
    return (
      <div className="vrhm-rules">
        <ul className="vrhm-rules__list">
          {content.map((rule, index) => (
            <li key={index} className="vrhm-rules__item">
              <span className="vrhm-rules__bullet">&#8226;</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // String format - render as text
  return <TextContent content={content} />;
};

/**
 * Checklist renderer with checkboxes.
 */
const ChecklistContent = ({ content }) => {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleItem = useCallback((index) => {
    setCheckedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  // Handle both array and string formats
  if (Array.isArray(content)) {
    return (
      <div className="vrhm-checklist">
        <ul className="vrhm-checklist__list">
          {content.map((item, index) => {
            const isChecked = checkedItems[index];
            const itemText = typeof item === 'string' ? item : item.text || item.label;

            return (
              <li
                key={index}
                className="vrhm-checklist__item"
                onClick={() => toggleItem(index)}
                style={{ cursor: 'pointer' }}
              >
                <span
                  className={`vrhm-checklist__checkbox ${
                    isChecked ? 'vrhm-checklist__checkbox--checked' : ''
                  }`}
                >
                  {isChecked ? '&#10003;' : ''}
                </span>
                <span style={{ textDecoration: isChecked ? 'line-through' : 'none' }}>
                  {itemText}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // String format - render as text
  return <TextContent content={content} />;
};

/**
 * Emergency contacts renderer.
 */
const ContactsContent = ({ content }) => {
  // Handle both array and string formats
  if (Array.isArray(content)) {
    return (
      <div className="vrhm-contacts">
        <div className="vrhm-contacts__list">
          {content.map((contact, index) => (
            <div key={index} className="vrhm-contacts__item">
              {contact.name && (
                <span className="vrhm-contacts__name">{contact.name}</span>
              )}
              {contact.role && (
                <span className="vrhm-contacts__role">{contact.role}</span>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="vrhm-contacts__phone">
                  {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="vrhm-contacts__email">
                  {contact.email}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // String format - render as text
  return <TextContent content={content} />;
};

/**
 * Get icon for a section based on ID or type.
 */
function getSectionIcon(id, type) {
  const iconMap = {
    wifi: '&#128246;', // WiFi symbol
    checkin: '&#128682;', // Door
    checkout: '&#128682;', // Door
    rules: '&#128220;', // Scroll
    kitchen: '&#127869;', // Fork and knife
    laundry: '&#129505;', // Washing
    hvac: '&#127777;', // Thermometer
    parking: '&#128664;', // Car
    trash: '&#128465;', // Wastebasket
    checklist: '&#9745;', // Checkbox
    emergency: '&#128286;', // Emergency
    local: '&#127961;', // Buildings
    notes: '&#128221;', // Note
  };

  // Try ID first, then type
  const icon = iconMap[id] || iconMap[type] || '&#128196;'; // Default: document

  return <span dangerouslySetInnerHTML={{ __html: icon }} />;
}

export default ContentSection;
