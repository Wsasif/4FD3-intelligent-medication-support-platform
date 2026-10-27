// The frame shared by every page: sidebar navigation on the left,
// header bar on top, and the current page rendered in the middle (<Outlet />).

import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Pill, History, MapPin, Bell, Settings, HeartPulse } from 'lucide-react';

// Sidebar menu items: the URL, the label shown, and the icon.
const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/medications', label: 'Medications', icon: Pill },
  { to: '/history', label: 'History', icon: History },
  { to: '/pharmacies', label: 'Pharmacies', icon: MapPin },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-blue-900">
          <HeartPulse className="text-blue-600" />
          Patient Health Monitoring and Clinical Decision-Support Platform
        </div>
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              // NavLink tells us if this link is the current page, so we can highlight it
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium ${
                  isActive ? 'bg-sky-100 text-blue-900' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Icon size={20} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-end gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <button aria-label="Notifications"><Bell /></button>
          {/* Placeholder user. This will come from the login system later. */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-slate-300" />
            <span className="font-medium">Jane Doe</span>
          </div>
        </header>
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  );
}