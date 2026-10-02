import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import Topology from './pages/Topology';
import Routing from './pages/Routing';
import Simulation from './pages/Simulation';
import ErrorControl from './pages/ErrorControl';
import CongestionControl from './pages/CongestionControl';
import Analytics from './pages/Analytics';
import SimulationHistory from './pages/SimulationHistory';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* 8 Primary Navigation Routes */}
          <Route index element={<Dashboard />} />
          <Route path="topology" element={<Topology />} />
          <Route path="routing" element={<Routing />} />
          <Route path="simulation" element={<Simulation />} />
          <Route path="error-control" element={<ErrorControl />} />
          <Route path="congestion" element={<CongestionControl />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="history" element={<SimulationHistory />} />

          {/* Legacy / Direct Route Aliases for seamless access */}
          <Route path="transmission" element={<Navigate to="/simulation" replace />} />
          <Route path="link-failure" element={<Navigate to="/routing" replace />} />
          <Route path="crc" element={<Navigate to="/error-control?tab=crc" replace />} />
          <Route path="arq" element={<Navigate to="/error-control?tab=arq" replace />} />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
