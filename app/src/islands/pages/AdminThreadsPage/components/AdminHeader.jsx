/**
 * AdminHeader - Navigation header for admin pages
 */

import { MessageSquare, Home } from 'lucide-react';

export default function AdminHeader() {
  return (
    <header className="admin-threads__header">
      <div className="admin-threads__header-left">
        <a href="/" className="admin-threads__logo">
          <img
            src="/assets/images/split-lease-purple-circle.png"
            alt="Split Lease"
            className="admin-threads__logo-img"
          />
        </a>
        <div className="admin-threads__title-group">
          <h1 className="admin-threads__title">
            <MessageSquare className="admin-threads__title-icon" />
            Admin Threads
          </h1>
          <p className="admin-threads__subtitle">
            Manage all messaging threads across the platform
          </p>
        </div>
      </div>

      <nav className="admin-threads__nav">
        <a href="/" className="admin-threads__nav-link">
          <Home size={18} />
          <span>Home</span>
        </a>
        <a href="/_internal/leases-overview" className="admin-threads__nav-link">
          Leases
        </a>
        <a href="/_internal/guest-relationships" className="admin-threads__nav-link">
          Guests
        </a>
      </nav>
    </header>
  );
}
