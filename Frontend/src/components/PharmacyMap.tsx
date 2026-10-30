import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { NearbyPharmacy } from '../utils/nearbyPharmacies';
import 'leaflet/dist/leaflet.css';

interface PharmacyMapProps {
  latitude: number;
  longitude: number;
  pharmacies: NearbyPharmacy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function PharmacyMap({
  latitude,
  longitude,
  pharmacies,
  selectedId,
  onSelect,
}: PharmacyMapProps) {
  return (
    <MapContainer
      key={`${latitude},${longitude}`}
      center={[latitude, longitude]}
      zoom={14}
      scrollWheelZoom
      className="h-[32rem] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[latitude, longitude]}
        radius={8}
        pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 1 }}
      >
        <Popup>Your approximate location</Popup>
      </CircleMarker>
      {pharmacies.map(pharmacy => (
        <CircleMarker
          key={pharmacy.id}
          center={[pharmacy.latitude, pharmacy.longitude]}
          radius={selectedId === pharmacy.id ? 10 : 7}
          pathOptions={{
            color: selectedId === pharmacy.id ? '#b91c1c' : '#0f766e',
            fillColor: selectedId === pharmacy.id ? '#dc2626' : '#14b8a6',
            fillOpacity: 0.9,
          }}
          eventHandlers={{ click: () => onSelect(pharmacy.id) }}
        >
          <Popup>
            <strong>{pharmacy.name}</strong>
            <br />
            {pharmacy.distanceKm.toFixed(1)} km away
            <br />
            {pharmacy.address}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
