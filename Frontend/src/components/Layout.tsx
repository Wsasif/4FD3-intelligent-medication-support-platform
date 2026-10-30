// The frame shared by every page: sidebar navigation on the left,
// header bar on top, and the current page rendered in the middle (<Outlet />).

import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Pill, History, MapPin, Bell, Settings, HeartPulse, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { API_BASE_URL, checkApiHealth } from '../utils/api';

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
  const { session, signOut } = useAuth();
  const [apiState, setApiState] = useState<'checking' | 'connected' | 'unavailable'>('checking');
  const [apiError, setApiError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [signOutError, setSignOutError] = useState('');

  async function handleSignOut() {
    setSignOutError('');
    try {
      await signOut();
    } catch (error: unknown) {
      setSignOutError(error instanceof Error ? error.message : 'Could not sign out.');
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    checkApiHealth(controller.signal)
      .then(() => {
        setApiState('connected');
        setApiError('');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setApiState('unavailable');
        setApiError(error instanceof Error ? error.message : 'Unknown connection error.');
      });

    return () => controller.abort();
  }, [retryCount]);

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
          <div className="flex items-center gap-2 text-sm" aria-live="polite">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                apiState === 'connected'
                  ? 'bg-green-500'
                  : apiState === 'unavailable'
                    ? 'bg-red-500'
                    : 'bg-amber-400'
              }`}
            />
            <span title={apiError || API_BASE_URL}>
              {apiState === 'connected'
                ? 'Backend connected'
                : apiState === 'unavailable'
                  ? 'Backend unavailable'
                  : 'Checking backend…'}
            </span>
            {apiState === 'unavailable' && (
              <button
                type="button"
                onClick={() => setRetryCount(count => count + 1)}
                className="rounded p-1 text-slate-600 hover:bg-slate-100"
                aria-label={`Retry backend connection. ${apiError}`}
                title={`Retry connection to ${API_BASE_URL}`}
              >
                <RefreshCw size={16} />
              </button>
            )}
          </div>
          {signOutError && <span role="alert" className="text-sm text-red-700">{signOutError}</span>}
          <button type="button" aria-label="Notifications"><Bell /></button>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-slate-300" />
            <span className="font-medium">{session?.user.email}</span>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded px-2 py-1 text-sm text-blue-700 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  );
}