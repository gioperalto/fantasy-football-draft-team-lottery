import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WebSocketProvider } from './contexts/WebSocketContext'
import App from './App.tsx'
import JoinDraft from './components/JoinDraft.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebSocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/join" element={<JoinDraft />} />
          <Route path="/draft/:code" element={<App />} />
        </Routes>
      </BrowserRouter>
    </WebSocketProvider>
  </StrictMode>,
)
