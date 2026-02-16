import React from 'react';
import ReactDOM from 'react-dom/client';
import { PromptOSProvider } from './contexts/PromptOSContext';
import { OverlayWindow } from './components/overlay/OverlayWindow';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PromptOSProvider>
      <OverlayWindow />
    </PromptOSProvider>
  </React.StrictMode>
);
