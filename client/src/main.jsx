import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import LoginGate from './auth/LoginGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <LoginGate>
        <App />
      </LoginGate>
    </AuthProvider>
  </StrictMode>,
)
