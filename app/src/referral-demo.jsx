/**
 * referral-demo.jsx
 *
 * Entry point for Referral V2 demo page - LOCAL REVIEW ONLY
 * This page is marked devOnly in routes.config.js and won't be deployed.
 *
 * To review: http://localhost:8002/referral-demo?ref=abc123&name=Michael%20Chen&type=host
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import ReferralLandingPageV2 from './islands/pages/ReferralLandingPageV2';

const root = createRoot(document.getElementById('referral-demo-page'));
root.render(<ReferralLandingPageV2 />);
