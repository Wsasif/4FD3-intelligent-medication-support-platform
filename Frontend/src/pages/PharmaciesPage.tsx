// "Find a Pharmacy" page. Lets the user search and filter pharmacies and see them
// as pins on a placeholder map and as a list. Selecting a pharmacy shows its address
// and which of the user's medications are filled there.

import { useState } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';
import { pharmacies } from '../data/mockData';
import { useMedications } from '../context/MedicationContext';

// Rough pin positions for the placeholder map (percent from top/left).
// These go away when the real Bing Maps component is added.
const pinSpots = [
  { top: '25%', left: '60%' },
  { top: '55%', left: '72%' },
  { top: '70%', left: '30%' },
  { top: '35%', left: '25%' },
];

export default function PharmaciesPage() {
  const { medications } = useMedications();

  const [search, setSearch] = useState('');
  const [maxKm, setMaxKm] = useState(5);
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pharmacies that match the search text, distance and opening filters
  const results = pharmacies.filter(p => {
    const nameMatches = p.name.toLowerCase().includes(search.toLowerCase());
    const closeEnough = p.distanceKm <= maxKm;
    const openOk = !openOnly || p.open;
    return nameMatches && closeEnough && openOk;
  });

  // Builds a Bing Maps link for an address (works without an API key).
  function directionsUrl(address: string) {
    return 'https://www.bing.com/maps?where1=' + encodeURIComponent(address);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-blue-900">Find a Pharmacy</h1>

      {/* Search box and filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input
            aria-label="Search pharmacies"
            placeholder="Search by pharmacy name"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3"
          />
        </div>

        <select
          aria-label="Maximum distance"
          value={maxKm}
          onChange={e => setMaxKm(Number(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-3"
        >
          <option value={1}>Within 1 km</option>
          <option value={5}>Within 5 km</option>
          <option value={10}>Within 10 km</option>
        </select>

        <select
          aria-label="Opening hours"
          value={openOnly ? 'open' : 'all'}
          onChange={e => setOpenOnly(e.target.value === 'open')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-3"
        >
          <option value="all">All hours</option>
          <option value="open">Open now</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Map placeholder: swap for the real Bing Maps component later */}
        <div className="relative min-h-96 overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
          <p className="absolute left-3 top-3 rounded bg-white/80 px-2 py-1 text-xs text-slate-600">
            Map placeholder (Bing Maps goes here)
          </p>
          {results.map((p, i) => {
            const spot = pinSpots[i % pinSpots.length];
            const isSelected = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                style={{ top: spot.top, left: spot.left }}
                onClick={() => setSelectedId(p.id)}
                aria-label={`Show ${p.name}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-2 text-white shadow ${
                  isSelected ? 'bg-red-600' : 'bg-teal-600'
                }`}
              >
                <MapPin size={20} />
              </button>
            );
          })}
        </div>

        {/* List of matching pharmacies */}
        <ul className="flex flex-col gap-3">
          {results.length === 0 && (
            <li className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
              No pharmacies match your filters.
            </li>
          )}

          {results.map(p => {
            // The user's medications that use this pharmacy
            const myMeds = medications.filter(m => m.pharmacyId === p.id);
            const isSelected = p.id === selectedId;
            return (
              <li
                key={p.id}
                className={`rounded-xl border bg-white p-4 ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-slate-600">
                  {p.distanceKm} km &middot;{' '}
                  <span className={p.open ? 'text-green-700' : 'text-red-700'}>
                    {p.open ? 'Open' : 'Closed'}
                  </span>{' '}
                  &middot; Closes {p.closes}
                </p>

                {isSelected && (
                  <div className="mt-2 text-sm text-slate-700">
                    <p>{p.address}</p>
                    <p className="mt-1 text-slate-500">
                      {myMeds.length > 0
                        ? 'Your medications here: ' + myMeds.map(m => m.name).join(', ')
                        : 'None of your medications use this pharmacy.'}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : p.id)}
                    className="flex-1 rounded-lg border border-slate-300 py-2 font-medium text-blue-800 hover:bg-slate-50"
                  >
                    {isSelected ? 'Hide details' : 'View details'}
                  </button>
                  <a
                    href={directionsUrl(p.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    <Navigation size={16} /> Directions
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}