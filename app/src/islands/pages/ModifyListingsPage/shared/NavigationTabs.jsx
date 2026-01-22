/**
 * NavigationTabs - Left sidebar navigation for section switching
 *
 * @param {object} props - Component props
 * @param {Array<{key: string, label: string, icon?: string}>} props.sections - Navigation sections
 * @param {string} props.activeSection - Currently active section key
 * @param {function} props.onSectionChange - Handler for section change (receives section key)
 * @param {Object<string, boolean>} [props.completedSections] - Map of completed section keys
 */
export default function NavigationTabs({
  sections = [],
  activeSection,
  onSectionChange,
  completedSections = {}
}) {
  return (
    <nav style={styles.container}>
      <ul style={styles.list}>
        {sections.map((section, index) => {
          const isActive = activeSection === section.key;
          const isCompleted = completedSections[section.key];

          return (
            <li key={section.key} style={styles.listItem}>
              <button
                type="button"
                onClick={() => onSectionChange(section.key)}
                style={{
                  ...styles.button,
                  ...(isActive ? styles.buttonActive : {})
                }}
              >
                <span style={styles.indexBadge}>
                  {isCompleted ? (
                    <CheckIcon />
                  ) : (
                    index + 1
                  )}
                </span>
                <span style={styles.label}>{section.label}</span>
                {isActive && <ActiveIndicator />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CheckIcon() {
  return (
    <svg
      style={styles.checkIcon}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function ActiveIndicator() {
  return (
    <span style={styles.activeIndicator} />
  );
}

const styles = {
  container: {
    width: '100%'
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0
  },
  listItem: {
    marginBottom: '0.25rem'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#4b5563',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',
    position: 'relative'
  },
  buttonActive: {
    backgroundColor: '#eff6ff',
    color: '#1d4ed8'
  },
  indexBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.5rem',
    height: '1.5rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: '#e5e7eb',
    color: '#4b5563',
    borderRadius: '9999px',
    marginRight: '0.75rem',
    flexShrink: 0
  },
  checkIcon: {
    width: '0.875rem',
    height: '0.875rem',
    color: '#22c55e'
  },
  label: {
    flex: 1
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '0.25rem',
    height: '1.5rem',
    backgroundColor: '#52ABEC',
    borderRadius: '0.125rem'
  }
};
