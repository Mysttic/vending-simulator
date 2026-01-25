import React from 'react';
import { VendingMachine } from './components/VendingMachine';
import { LogProvider } from './contexts/LogContext';
import { DebugConsole } from './components/DebugConsole';

function App() {
  return (
    <LogProvider>
      <div className="antialiased text-gray-100 pb-12">
        <VendingMachine />
        <DebugConsole />
      </div>
    </LogProvider>
  );
}

export default App;
