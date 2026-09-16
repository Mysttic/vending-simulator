import React from 'react';
import { VendingMachine } from './components/VendingMachine';
import { LogProvider } from './contexts/LogContext';
import { DebugConsole } from './components/DebugConsole';
import SessionControls from './auth/SessionControls.jsx';

function App() {
  return (
    <LogProvider>
      <div className="antialiased text-gray-100 pb-12">
        {/* Automat nie ma własnego nagłówka, więc sesja panelu siedzi w rogu ekranu. */}
        <SessionControls className="fixed top-3 right-3 z-50" />
        <VendingMachine />
        <DebugConsole />
      </div>
    </LogProvider>
  );
}

export default App;
