import { createRoot } from 'react-dom/client';
import GuestProposalsPage from './islands/pages/GuestProposalsPage.jsx';
import './styles/main.css';
import './styles/components/guest-proposals.css';

createRoot(document.getElementById('root')).render(<GuestProposalsPage />);
