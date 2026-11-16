export interface NearbyPharmacy {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address: string;
  phone: string | null;
  openingHours: string | null;
  osmUrl: string;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function distanceInKm(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(toLat - fromLat);
  const longitudeDelta = radians(toLon - fromLon);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildAddress(tags: Record<string, string>): string {
  if (tags['addr:full']) return tags['addr:full'];
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return [
    street,
    tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'],
    tags['addr:postcode'],
  ].filter(Boolean).join(', ') || 'Address not listed';
}

export async function findNearbyPharmacies(
  latitude: number,
  longitude: number,
  radiusKm: number,
  signal?: AbortSignal,
): Promise<NearbyPharmacy[]> {
  const radiusMeters = Math.round(radiusKm * 1000);
  const query = `[out:json][timeout:25];(nwr["amenity"="pharmacy"](around:${radiusMeters},${latitude},${longitude}););out center tags;`;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ data: query }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenStreetMap search failed (HTTP ${response.status}). Please try again later.`);
  }

  const data: OverpassResponse = await response.json();
  return data.elements
    .flatMap((element): NearbyPharmacy[] => {
      const tags = element.tags ?? {};
      const point = element.lat !== undefined && element.lon !== undefined
        ? { latitude: element.lat, longitude: element.lon }
        : element.center
          ? { latitude: element.center.lat, longitude: element.center.lon }
          : null;
      if (!point) return [];

      return [{
        id: `${element.type}-${element.id}`,
        name: tags.name ?? tags['name:en'] ?? tags.brand ?? 'Unnamed pharmacy',
        ...point,
        distanceKm: distanceInKm(latitude, longitude, point.latitude, point.longitude),
        address: buildAddress(tags),
        phone: tags.phone || tags['contact:phone'] || null,
        openingHours: tags.opening_hours || null,
        osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      }];
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
