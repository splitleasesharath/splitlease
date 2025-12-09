import { createRoot } from 'react-dom/client';

// Use dynamic import for the page component to isolate errors
// This prevents a top-level error in ResetPasswordPage from crashing the whole script immediately
const mountNode = document.getElementById('reset-password-page');

if (!mountNode) {
  console.error('Failed to find mount node #reset-password-page');
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Mount node not found.</div>';
} else {
  // Simple error boundary wrapper
  const renderApp = async () => {
    try {
      const { default: ResetPasswordPage } = await import('./islands/pages/ResetPasswordPage.jsx');
      createRoot(mountNode).render(<ResetPasswordPage />);
    } catch (error) {
      console.error('Failed to render ResetPasswordPage:', error);
      mountNode.innerHTML = `
        <div style="font-family: sans-serif; color: #333; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto; margin-top: 50px;">
          <h1 style="color: #e53e3e; margin-bottom: 20px;">Something went wrong</h1>
          <p style="font-size: 1.1em; margin-bottom: 30px;">We couldn't load the password reset page.</p>
          <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 20px; border-radius: 8px; text-align: left;">
            <strong style="color: #c53030; display: block; margin-bottom: 10px;">Error Details:</strong>
            <code style="display: block; white-space: pre-wrap; word-break: break-word;">${error.message}</code>
            ${error.stack ? `<pre style="margin-top: 15px; font-size: 0.8em; overflow-x: auto; color: #718096;">${error.stack}</pre>` : ''}
          </div>
          <p style="margin-top: 30px; color: #718096;">Check the browser console for more details.</p>
        </div>
      `;
    }
  };

  renderApp();
}
