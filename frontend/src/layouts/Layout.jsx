import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  GitFork,
  PlayCircle,
  ShieldCheck,
  Filter,
  BarChart3,
  History,
  Radio,
  Database,
  RotateCcw,
  Menu,
  X
} from 'lucide-react';
import api from '../services/api';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/topology', label: 'Network Topology', icon: Network },
  { path: '/routing', label: 'Dynamic Routing', icon: GitFork },
  { path: '/simulation', label: 'Simulation', icon: PlayCircle },
  { path: '/error-control', label: 'Error Control', icon: ShieldCheck },
  { path: '/congestion', label: 'Congestion Control', icon: Filter },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/history', label: 'History', icon: History },
];

export default function Layout() {
  const [dbStatus, setDbStatus] = useState({ connected: false });
  const [topoStats, setTopoStats] = useState({ active_links: 10, total_nodes: 7 });
  const [isResetting, setIsResetting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const fetchHealth = async () => {
    try {
      const res = await api.getHealth();
      setDbStatus(res.data.database || { connected: false });
      if (res.data.network) {
        setTopoStats(res.data.network);
      }
    } catch {
      setDbStatus({ connected: false });
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleResetTopology = async () => {
    try {
      setIsResetting(true);
      const res = await api.resetTopology();
      if (res.data?.topology) {
        setTopoStats({
          total_nodes: res.data.topology.total_nodes,
          active_links: res.data.topology.active_links,
        });
      }
      await fetchHealth();
      window.dispatchEvent(new CustomEvent('topology-reset'));
    } catch (err) {
      alert('Reset failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setTimeout(() => {
        setIsResetting(false);
      }, 400);
    }
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#064E3B] text-white">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#183B32] flex items-center justify-between bg-[#064E3B]">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#183B32] flex items-center justify-center text-[#F8E7C9] shadow-xs border border-[#183B32]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide text-white">
              ResQNet
            </h1>
            <p className="text-[10px] text-[#D9E5DC] font-medium leading-tight">
              Emergency Mesh Simulation
            </p>
          </div>
        </div>
        {isMobile && (
          <button
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-[#183B32] cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Navigation Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (isMobile) setMobileMenuOpen(false);
              }}
              className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#F8E7C9] text-[#064E3B] font-bold shadow-xs'
                  : 'text-white hover:bg-[#183B32] hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 mr-3 shrink-0 ${isActive ? 'text-[#064E3B]' : 'text-[#D9E5DC]'}`} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* System Status Box */}
      <div className="p-3 m-3 rounded-lg bg-[#183B32] border border-[#183B32] text-xs text-white">
        <div className="flex items-center justify-between text-[11px] text-[#D9E5DC]">
          <span className="flex items-center">
            <Database className="w-3.5 h-3.5 mr-1 text-[#F8E7C9]" /> Database
          </span>
          <span
            title={
              dbStatus.connected
                ? 'Connected to Cloud MongoDB database'
                : 'Running in resilient in-memory simulation mode (Add MONGO_URI in Render to connect MongoDB Atlas)'
            }
            className="font-mono font-bold text-[10px] bg-[#F8E7C9] text-[#064E3B] px-2 py-0.5 rounded border border-[#064E3B]/20 inline-flex items-center space-x-1"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.connected ? 'bg-emerald-600' : 'bg-[#064E3B]'}`}></span>
            <span>{dbStatus.connected ? 'ONLINE' : 'IN-MEMORY'}</span>
          </span>
        </div>
        <div className="flex justify-between text-[11px] text-[#D9E5DC] mt-2 pt-2 border-t border-[#064E3B]">
          <span>Nodes: <strong className="text-[#F8E7C9]">{topoStats.total_nodes || 7}</strong></span>
          <span>Links: <strong className="text-[#F8E7C9]">{topoStats.active_links || 10}</strong></span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F7F5] text-[#252B28] font-sans antialiased">
      {/* Desktop Fixed Sidebar (visible only on lg+ screens, exactly 256px w-64) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 border-r border-[#183B32]">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile / Tablet Drawer Modal (rendered only when open) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 bg-[#F5F7F5]">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E9E5] px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <button
              className="lg:hidden p-1.5 rounded-lg text-[#747D77] hover:text-[#064E3B] hover:bg-[#F5F7F5] shrink-0 cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="text-xs font-bold uppercase tracking-wider text-[#252B28] flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#064E3B]"></span>
                ResQNet
              </span>
              <span className="hidden md:inline-block text-[#B8C7BD] text-xs">•</span>
              <span className="hidden md:inline-block text-[11px] text-[#747D77] font-medium truncate">
                Emergency Communication Network Simulation
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleResetTopology}
              disabled={isResetting}
              className="inline-flex items-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-[#252B28] bg-white hover:bg-[#F5F7F5] border border-[#E5E9E5] hover:border-[#B8C7BD] transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''} sm:mr-1.5`} />
              <span className="hidden sm:inline">Reset Topology</span>
              <span className="sm:hidden text-[11px] ml-1">Reset</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 max-w-7xl w-full mx-auto min-w-0">
          <Outlet />
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-[#E5E9E5] bg-white px-4 sm:px-6 py-3 text-center text-[11px] sm:text-xs text-[#747D77]">
          <span className="font-semibold text-[#064E3B]">ResQNet</span> — Emergency Communication Network Simulation
          <span className="hidden md:inline text-[11px] text-[#747D77]"> &bull; Reliable Routing. Resilient Communication. Real-Time Simulation.</span>
        </footer>
      </div>
    </div>
  );
}
