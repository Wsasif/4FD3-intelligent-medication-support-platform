// Search box that links a medication to a drug in the DDInter list.
// The link (drug_id) is what lets the backend check for drug-drug interactions.
// Choosing nothing is allowed, but then the medication can't be checked.

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { searchDrugs } from '../utils/api';
import type { ApiDrug } from '../utils/api';

interface DrugPickerProps {
  value: ApiDrug | null;
  onChange: (drug: ApiDrug | null) => void;
  initialQuery?: string;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200';

export default function DrugPicker({ value, onChange, initialQuery = '' }: DrugPickerProps) {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ApiDrug[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedFor, setSearchedFor] = useState('');
  const [searchError, setSearchError] = useState('');

  // Search 300 ms after the user stops typing. Cancels the previous request.
  useEffect(() => {
    const q = query.trim();
    if (value || !accessToken || q.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError('');
      searchDrugs(accessToken, q, controller.signal)
        .then(rows => {
          setResults(rows);
          setSearchedFor(q);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setSearchError(error instanceof Error ? error.message : 'Drug search failed.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, value, accessToken]);

  // A drug is chosen: show it as a chip with a button to change it.
  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-3">
        <span>
          <span className="text-sm text-slate-600">Linked to: </span>
          <span className="font-semibold text-green-900">{value.name}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setQuery(value.name);
            onChange(null);
          }}
          aria-label={`Change linked drug ${value.name}`}
          className="rounded p-1 hover:bg-green-100"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }

  // Old results are hidden while the query is too short.
  const tooShort = query.trim().length < 2;
  const visibleResults = tooShort ? [] : results;
  const showNoMatch = !searching && !tooShort && searchedFor === query.trim() && results.length === 0;

  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3.5 text-slate-400" aria-hidden="true" />
        <input
          id="drugSearch"
          type="search"
          role="combobox"
          aria-expanded={visibleResults.length > 0}
          aria-controls="drugSearch-results"
          aria-autocomplete="list"
          className={inputClass}
          placeholder="Type at least 2 letters, e.g. Iron"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {visibleResults.length > 0 && (
        <ul
          id="drugSearch-results"
          role="listbox"
          aria-label="Matching drugs"
          className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow"
        >
          {visibleResults.map(drug => (
            <li key={drug.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => onChange(drug)}
                className="w-full px-3 py-2 text-left hover:bg-sky-50 focus:bg-sky-50 focus:outline-none"
              >
                {drug.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {searching && <p className="mt-1 text-sm text-slate-500">Searching…</p>}
      {searchError && <p role="alert" className="mt-1 text-sm text-red-700">{searchError}</p>}
      {showNoMatch && (
        <p className="mt-1 text-sm text-slate-600">No matching drug found.</p>
      )}
      <p className="mt-1 text-sm text-amber-800">
        Not linked: this medication can't be checked for interactions. Please contact your doctor or
        pharmacist to verify it is safe with your other medications.
      </p>
    </div>
  );
}
