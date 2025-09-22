import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import FRAAtlas from './components/FRAAtlas.jsx';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <FRAAtlas />
  </StrictMode>,
)
