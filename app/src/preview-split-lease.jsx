import { createRoot } from 'react-dom/client';
import PreviewSplitLeasePage from './islands/pages/PreviewSplitLeasePage.jsx';
import { ToastProvider } from './islands/shared/Toast';

createRoot(document.getElementById('preview-split-lease-page')).render(
  <ToastProvider>
    <PreviewSplitLeasePage />
  </ToastProvider>
);
