import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LoggedInAvatar from './islands/shared/LoggedInAvatar';

/**
 * Demo page for LoggedInAvatar component
 * Shows different user types and states
 */
function LoggedInAvatarDemo() {
  // Mock user data - HOST type
  const hostUser = {
    id: '123',
    name: 'John Host',
    email: 'john.host@splitlease.com',
    userType: 'HOST',
    avatarUrl: '', // Will show initials
    proposalsCount: 5,
    listingsCount: 3,
    virtualMeetingsCount: 2,
    houseManualsCount: 3,
    leasesCount: 4,
    favoritesCount: 8,
    unreadMessagesCount: 2,
  };

  // Mock user data - GUEST type
  const guestUser = {
    id: '456',
    name: 'Jane Guest',
    email: 'jane.guest@splitlease.com',
    userType: 'GUEST',
    avatarUrl: '', // Will show initials
    proposalsCount: 0,
    listingsCount: 0,
    virtualMeetingsCount: 1,
    houseManualsCount: 0,
    leasesCount: 1,
    favoritesCount: 12,
    unreadMessagesCount: 5,
  };

  // Mock user data - TRIAL_HOST type
  const trialHostUser = {
    id: '789',
    name: 'Mike Trial',
    email: 'mike.trial@splitlease.com',
    userType: 'TRIAL_HOST',
    proposalsCount: 2,
    listingsCount: 1,
    virtualMeetingsCount: 1,
    houseManualsCount: 1,
    leasesCount: 0,
    favoritesCount: 3,
    unreadMessagesCount: 0,
  };

  const handleNavigate = (path) => {
    console.log('Navigate to:', path);
    alert(`Would navigate to: ${path}`);
  };

  const handleLogout = () => {
    console.log('User logged out');
    alert('User would be logged out');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'DM Sans, sans-serif' }}>
      <h1>LoggedInAvatar Component Demo</h1>
      <p>Click on each avatar to see the dropdown menu with different user types and badge counts.</p>

      <div style={{ marginTop: '40px', display: 'flex', gap: '100px', flexWrap: 'wrap' }}>
        {/* HOST User */}
        <div>
          <h2>HOST User</h2>
          <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <LoggedInAvatar
                user={hostUser}
                currentPath="/host-overview"
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            </div>
            <div style={{ marginTop: '20px', fontSize: '14px' }}>
              <p><strong>Name:</strong> {hostUser.name}</p>
              <p><strong>Type:</strong> {hostUser.userType}</p>
              <p><strong>Proposals:</strong> {hostUser.proposalsCount}</p>
              <p><strong>Listings:</strong> {hostUser.listingsCount}</p>
              <p><strong>Unread Messages:</strong> {hostUser.unreadMessagesCount}</p>
            </div>
          </div>
        </div>

        {/* GUEST User */}
        <div>
          <h2>GUEST User</h2>
          <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <LoggedInAvatar
                user={guestUser}
                currentPath="/guest-dashboard"
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            </div>
            <div style={{ marginTop: '20px', fontSize: '14px' }}>
              <p><strong>Name:</strong> {guestUser.name}</p>
              <p><strong>Type:</strong> {guestUser.userType}</p>
              <p><strong>Favorites:</strong> {guestUser.favoritesCount}</p>
              <p><strong>Unread Messages:</strong> {guestUser.unreadMessagesCount}</p>
              <p><strong>Note:</strong> Shows "Suggested Proposal" instead of "My Proposals"</p>
            </div>
          </div>
        </div>

        {/* TRIAL_HOST User */}
        <div>
          <h2>TRIAL_HOST User</h2>
          <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <LoggedInAvatar
                user={trialHostUser}
                currentPath="/host-dashboard"
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            </div>
            <div style={{ marginTop: '20px', fontSize: '14px' }}>
              <p><strong>Name:</strong> {trialHostUser.name}</p>
              <p><strong>Type:</strong> {trialHostUser.userType}</p>
              <p><strong>Proposals:</strong> {trialHostUser.proposalsCount}</p>
              <p><strong>Listings:</strong> {trialHostUser.listingsCount}</p>
              <p><strong>Unread Messages:</strong> {trialHostUser.unreadMessagesCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '60px', padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>Features Demonstrated:</h3>
        <ul>
          <li>User type conditional rendering (HOST shows "My Proposals", GUEST shows "Suggested Proposal")</li>
          <li>Notification badges with counts (purple for most items, red for Messages)</li>
          <li>Active page highlighting (orange left border on current page)</li>
          <li>Smart routing based on user data</li>
          <li>Avatar initials when no image provided</li>
          <li>Click outside to close functionality</li>
          <li>Hover states on menu items</li>
        </ul>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LoggedInAvatarDemo />
  </StrictMode>
);
