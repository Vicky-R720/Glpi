import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ComputerList from './page/ComputerList';
import TicketForm from './page/TicketForm';

/**
 * App — Root layout with GLPI-style navigation
 */
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface-body)' }}>
        <Navbar />

        {/* Main content */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ComputerList />} />
            <Route path="/ticket" element={<TicketForm />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer
          className="text-center py-4 text-xs"
          style={{
            borderTop: '1px solid var(--glpi-gray-200)',
            color: 'var(--glpi-gray-500)',
            background: 'var(--surface-card)',
          }}
        >
          <span style={{ color: 'var(--glpi-primary)' }}>NewAPP</span> —
          Front-Office GLPI • Propulsé par React &amp; API REST
        </footer>
      </div>
    </BrowserRouter>
  );
}
