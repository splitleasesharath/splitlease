import React, { useMemo, useCallback } from 'react';
import type {
  InformationalTextProps,
  InformationalTextVariant,
} from './InformationalText.types';
import { InformationalTextPropsSchema } from './InformationalText.schema';
import {
  InfoIcon,
  WarningIcon,
  SuccessIcon,
  ErrorIcon,
  DismissIcon,
} from './utils/icons';
import styles from './InformationalText.module.css';

/**
 * InformationalText Component
 *
 * A flexible, accessible component for displaying informational messages,
 * notices, tips, or contextual help text with various severity levels.
 *
 * @example
 * // Basic info message
 * <InformationalText variant="info">
 *   This is an informational message
 * </InformationalText>
 *
 * @example
 * // Dismissible warning with title
 * <InformationalText
 *   variant="warning"
 *   title="Important Notice"
 *   onDismiss={() => console.log('Dismissed')}
 * >
 *   Please review your settings
 * </InformationalText>
 *
 * @example
 * // Error with action buttons
 * <InformationalText
 *   variant="error"
 *   title="Error occurred"
 *   actions={[
 *     { label: 'Retry', onClick: handleRetry },
 *     { label: 'Details', onClick: showDetails }
 *   ]}
 * >
 *   Failed to save changes
 * </InformationalText>
 *
 * @example
 * // Success with custom icon
 * <InformationalText
 *   variant="success"
 *   icon={<CustomIcon />}
 * >
 *   Operation completed successfully
 * </InformationalText>
 *
 * @param props - Component props conforming to InformationalTextProps
 * @returns React element representing the informational text component
 *
 * @remarks
 * - Uses appropriate ARIA roles based on variant (alert for error/warning, status for info/success)
 * - Fully keyboard accessible with Tab, Enter, and Space support
 * - Meets WCAG 2.1 AA accessibility standards
 * - Optimized with React.memo to prevent unnecessary re-renders
 */
export const InformationalText = React.memo<InformationalTextProps>(
  (props) => {
    // Validate props at runtime with Zod
    const validatedProps = InformationalTextPropsSchema.parse(props);

    const {
      variant = 'info',
      size = 'medium',
      title,
      children,
      icon: customIcon,
      onDismiss,
      actions,
      className,
      'data-testid': dataTestId,
    } = validatedProps;

    /**
     * Determine the default icon based on variant
     * Memoized to prevent unnecessary recalculations
     */
    const defaultIcon = useMemo(() => {
      const iconMap: Record<InformationalTextVariant, React.ReactElement> = {
        info: <InfoIcon />,
        warning: <WarningIcon />,
        success: <SuccessIcon />,
        error: <ErrorIcon />,
      };
      return iconMap[variant];
    }, [variant]);

    /**
     * Use custom icon if provided, otherwise use default
     */
    const icon = customIcon ?? defaultIcon;

    /**
     * Determine ARIA role based on variant
     * error/warning = alert (assertive)
     * info/success = status (polite)
     */
    const ariaRole = useMemo(() => {
      return variant === 'error' || variant === 'warning' ? 'alert' : 'status';
    }, [variant]);

    /**
     * Determine ARIA live region politeness
     */
    const ariaLive = useMemo(() => {
      return variant === 'error' || variant === 'warning'
        ? 'assertive'
        : 'polite';
    }, [variant]);

    /**
     * Compute container class names
     * Memoized to prevent unnecessary recalculations
     */
    const containerClassName = useMemo(() => {
      const classes = [styles.container, styles[variant], styles[size]];
      if (className) {
        classes.push(className);
      }
      return classes.join(' ');
    }, [variant, size, className]);

    /**
     * Stable dismiss handler
     */
    const handleDismiss = useCallback(() => {
      onDismiss?.();
    }, [onDismiss]);

    /**
     * Create stable action handlers
     */
    const actionHandlers = useMemo(() => {
      return (
        actions?.map((action) => ({
          ...action,
          onClick: () => action.onClick(),
        })) ?? []
      );
    }, [actions]);

    return (
      <div
        className={containerClassName}
        role={ariaRole}
        aria-live={ariaLive}
        data-testid={dataTestId}
      >
        {/* Icon */}
        <div className={styles.iconWrapper}>{icon}</div>

        {/* Content */}
        <div className={styles.content}>
          {title && <h3 className={styles.title}>{title}</h3>}
          <div className={styles.body}>{children}</div>

          {/* Action buttons */}
          {actions && actions.length > 0 && (
            <div className={styles.actions}>
              {actionHandlers.map((action, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.actionButton}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  aria-label={action.ariaLabel}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            type="button"
            className={styles.dismissButton}
            onClick={handleDismiss}
            aria-label="Dismiss notification"
          >
            <DismissIcon />
          </button>
        )}
      </div>
    );
  }
);

InformationalText.displayName = 'InformationalText';
