import { Loader2 } from 'lucide-react';

/**
 * Reusable Button Component
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button text content
 * @param {'primary' | 'secondary' | 'ghost' | 'outline'} [props.variant='primary'] - Button style variant
 * @param {'small' | 'medium' | 'large'} [props.size='medium'] - Button size
 * @param {boolean} [props.loading=false] - Show loading state with spinner
 * @param {boolean} [props.disabled=false] - Disable button interaction
 * @param {boolean} [props.fullWidth=false] - Make button full width
 * @param {React.ReactElement} [props.icon] - Icon element to display
 * @param {'left' | 'right'} [props.iconPosition='left'] - Position of icon relative to text
 * @param {Function} [props.onClick] - Click handler function
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.type='button'] - HTML button type attribute
 * @returns {React.ReactElement} Button element
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  onClick,
  className = '',
  type = 'button',
}) {
  // Validate variant prop
  const validVariants = ['primary', 'secondary', 'ghost', 'outline'];
  const buttonVariant = validVariants.includes(variant) ? variant : 'primary';

  // Validate size prop
  const validSizes = ['small', 'medium', 'large'];
  const buttonSize = validSizes.includes(size) ? size : 'medium';

  // Validate iconPosition prop
  const validIconPositions = ['left', 'right'];
  const finalIconPosition = validIconPositions.includes(iconPosition) ? iconPosition : 'left';

  // Build variant classes
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
  };

  // Build size classes
  const sizeClasses = {
    small: 'btn-small',
    medium: 'btn-medium',
    large: 'btn-large',
  };

  // Build base button classes
  const baseClasses = [
    'btn',
    variantClasses[buttonVariant],
    sizeClasses[buttonSize],
    loading && 'btn-loading',
    disabled && 'btn-disabled',
    fullWidth && 'btn-full-width',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Handle disabled state when loading
  const isDisabled = disabled || loading;

  // Render icon with proper positioning
  const iconElement = icon ? (
    <span className="btn-icon">
      {icon}
    </span>
  ) : null;

  // Render loader icon when loading
  const loaderElement = loading ? (
    <Loader2 className="btn-loader" size={18} />
  ) : null;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={baseClasses}
    >
      {loaderElement}
      {iconElement && finalIconPosition === 'left' && iconElement}
      <span className="btn-content">
        {children}
      </span>
      {iconElement && finalIconPosition === 'right' && iconElement}
    </button>
  );
}
