import { createRoot } from 'react-dom/client';
import HostProposalsPage from './islands/pages/HostProposalsPage.jsx';
import './styles/main.css';
import './styles/components/host-proposals.css';

createRoot(document.getElementById('root')).render(<HostProposalsPage />);
