// Entry point of the app. Applies the saved text size, then mounts React
// into the #root div in index.html. The providers wrap the whole app so every
// page can use routing (BrowserRouter) and the shared medication data (MedicationProvider).

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthProvider';
import { MedicationProvider } from './context/MedicationProvider';
import { applyTextSize, getSavedTextSize } from './utils/textSize';

// Apply the saved text size right away so the page doesn't flash at the default size
applyTextSize(getSavedTextSize());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MedicationProvider>
          <App />
        </MedicationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);