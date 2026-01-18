/**
 * Type declarations for Header component
 * Allows TypeScript to properly type the JSX component with standard React props
 */
import { FC, Key } from 'react';

interface HeaderProps {
  autoShowLogin?: boolean;
  key?: Key;
}

declare const Header: FC<HeaderProps>;
export default Header;
