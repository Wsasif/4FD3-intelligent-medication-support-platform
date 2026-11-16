import { lazy, Suspense, useState } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';
import { findNearbyPharmacies } from '../utils/nearbyPharmacies';
import type { NearbyPharmacy } from '../utils/nearbyPharmacies';

const PharmacyMap = lazy(() => import('../components/PharmacyMap'));

interface Coordinates {
  latitude: number;
  longitude: number;
}

function geolocationError(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission was denied. Allow location access in your browser settings, then try again.';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Your location is unavailable. Check your device location settings and try again.';
  }
  if (error.code === error.TIMEOUT) return 'Location lookup timed out. Please try again.';
  return 'Could not get your location.';
}

export default function PharmaciesPage() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [pharmacies, setPharmacies] = useState<NearbyPharmacy[]>([]);
  const [search, setSearch] = useState('');
  const [maxKm, setMaxKm] = useState(5);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  async function searchNearby() {
    if (!navigator.geolocation) {
      setError('This browser does not support location access.');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(false);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          locationError => reject(new Error(geolocationError(locationError))),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
        );
      });
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(coordinates);

      const results = await findNearbyPharmacies(
        coordinates.latitude,
        coordinates.longitude,
        10,
      );
      setPharmacies(results);
      setSelectedId(null);
      setHasSearched(true);
    } catch (searchError: unknown) {
      setError(
        searchError instanceof Error ? searchError.message : 'Could not search for nearby pharmacies.',
      );
    } finally {
      setLoading(false);
    }
  }

  const results = pharmacies.filter(pharmacy =>
    pharmacy.name.toLowerCase().includes(search.trim().toLowerCase())
    && pharmacy.distanceKm <= maxKm,
  );

  function directionsUrl(pharmacy: NearbyPharmacy): string {
    const origin = location ? `${location.latitude},${location.longitude}` : '';
    const destination = `${pharmacy.latitude},${pharmacy.longitude}`;
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(`${origin};${destination}`)}`;
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-blue-900">Find a Pharmacy</h1>
      <p className="mb-4 text-slate-600">
        Search OpenStreetMap for pharmacies near your current location. Your location is only requested when you press the button.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void searchNearby()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <MapPin size={18} />
          {loading ? 'Searching nearby…' : hasSearched ? 'Search my location again' : 'Find pharmacies near me'}
        </button>

        {hasSearched && (
          <>
            <div className="relative min-w-52 flex-1">
              <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                aria-label="Search pharmacy names"
                placeholder="Filter by pharmacy name"
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3"
              />
            </div>
            <select
              aria-label="Maximum distance"
              value={maxKm}
              onChange={event => setMaxKm(Number(event.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-3"
            >
              <option value={1}>Within 1 km</option>
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
            </select>
          </>
        )}
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}

      {!hasSearched && !loading && !error && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          Allow location access in your browser when prompted. We use your coordinates to search public OpenStreetMap data for nearby pharmacies.
        </div>
      )}

      {hasSearched && (
        <>
          <p className="mb-3 text-sm text-slate-600">
            {results.length} {results.length === 1 ? 'pharmacy' : 'pharmacies'} within {maxKm} km.
            {' '}Results come from OpenStreetMap and may be incomplete or out of date.
          </p>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {location ? (
                <Suspense fallback={<div className="p-6 text-slate-600">Loading map…</div>}>
                  <PharmacyMap
                    latitude={location.latitude}
                    longitude={location.longitude}
                    pharmacies={results}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </Suspense>
              ) : (
                <div className="p-6 text-slate-600">Map unavailable until location is found.</div>
              )}
            </div>

            <ul className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto">
              {results.length === 0 && (
                <li className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
                  No pharmacies found in this range. Try increasing the distance or clearing the name filter.
                </li>
              )}
              {results.map(pharmacy => (
                <li
                  key={pharmacy.id}
                  className={`rounded-xl border bg-white p-4 ${
                    selectedId === pharmacy.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(selectedId === pharmacy.id ? null : pharmacy.id)}
                    className="w-full text-left"
                  >
                    <span className="font-semibold">{pharmacy.name}</span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {pharmacy.distanceKm.toFixed(1)} km away
                    </span>
                  </button>
                  <p className="mt-2 text-sm text-slate-700">{pharmacy.address}</p>
                  {pharmacy.phone && <p className="mt-1 text-sm text-slate-700">Phone: {pharmacy.phone}</p>}
                  <p className="mt-1 text-sm text-slate-600">
                    Opening hours: {pharmacy.openingHours ?? 'Not listed'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={directionsUrl(pharmacy)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
                    >
                      <Navigation size={16} /> Directions
                    </a>
                    <a
                      href={pharmacy.osmUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 font-medium text-blue-800 hover:bg-slate-50"
                    >
                      OSM
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Map data &copy; OpenStreetMap contributors. Pharmacy information is community maintained; verify details directly with the pharmacy.
          </p>
        </>
      )}
    </div>
  );
}
