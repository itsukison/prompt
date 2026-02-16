import React from 'react';
import ReactDOM from 'react-dom/client';
import { PromptOSProvider } from './contexts/PromptOSContext';
import { MainWindowApp } from './components/main-window/MainWindowApp';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PromptOSProvider>
      <MainWindowApp />
    </PromptOSProvider>
  </React.StrictMode>
);
