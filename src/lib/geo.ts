// Simple Nominatim client for geocoding and reverse geocoding
// No API key required. Respect rate limits: add small delays if batching.

export type GeoPoint = { lat: number; lon: number };
export type GeoAddress = {
  display_name: string;
  county?: string; // daerah
  suburb?: string;
  town?: string;
  city?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
  mukim?: string; // attempt to map if present in address
};

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function geocodeAddress(query: string): Promise<(GeoPoint & { display_name: string; address: any }) | null> {
  if (!query || query.trim().length < 3) return null;
  const url = new URL(NOMINATIM_BASE + '/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'User-Agent': 'mphs-oku-sticker/1.0 (geocode)' }
  });
  if (!res.ok) return null;
  const arr = await res.json();
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const first = arr[0];
  return {
    lat: parseFloat(first.lat),
    lon: parseFloat(first.lon),
    display_name: first.display_name,
    address: first.address,
  };
}

export async function reverseGeocode(point: GeoPoint): Promise<{ display_name: string; address: any } | null> {
  const url = new URL(NOMINATIM_BASE + '/reverse');
  url.searchParams.set('lat', String(point.lat));
  url.searchParams.set('lon', String(point.lon));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'User-Agent': 'mphs-oku-sticker/1.0 (reverse)' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { display_name: data.display_name, address: data.address };
}

export function extractDaerahMukim(address: any): { daerah?: string; mukim?: string } {
  if (!address) return {};
  // Nominatim address keys vary by country. Try multiple keys.
  const daerah = address.county || address.district || address.region || undefined;
  // Mukim sometimes appears as municipality, suburb, or localname in MY context
  const mukim = address.suburb || address.town || address.village || address.municipality || undefined;
  return { daerah, mukim };
}

// --- Boundary validation helpers ---
export type GeoJSON = {
  type: 'FeatureCollection' | 'Feature' | 'Polygon' | 'MultiPolygon';
  features?: any[];
  geometry?: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
  coordinates?: any;
};

export async function loadBoundaryGeoJSON(url: string): Promise<GeoJSON | null> {
  try {
    if (!url) return null;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Ray casting algorithm for point in polygon
export function pointInPolygon(point: GeoPoint, polygon: number[][][]): boolean {
  const x = point.lon;
  const y = point.lat;
  // polygon[0] is outer ring, others are holes (if any)
  const rings = polygon;
  let inside = false;
  const ring = rings[0];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  // If inside outer ring, ensure not inside any hole (toggle by each hole)
  if (inside && rings.length > 1) {
    for (let r = 1; r < rings.length; r++) {
      let inHole = false;
      const hole = rings[r];
      for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
        const xi = hole[i][0], yi = hole[i][1];
        const xj = hole[j][0], yj = hole[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) inHole = !inHole;
      }
      if (inHole) return false;
    }
  }
  return inside;
}

export function pointInMultiPolygon(point: GeoPoint, multi: number[][][][]): boolean {
  for (const polygon of multi) {
    if (pointInPolygon(point, polygon as unknown as number[][][])) return true;
  }
  return false;
}

export function isPointInsideGeoJSON(point: GeoPoint, gj: GeoJSON | null): boolean {
  if (!gj) return false;
  // FeatureCollection: iterate all features
  if (gj.type === 'FeatureCollection' && Array.isArray(gj.features)) {
    for (const f of gj.features) {
      const geom = f?.geometry;
      if (!geom) continue;
      if (geom.type === 'Polygon') {
        if (pointInPolygon(point, geom.coordinates as unknown as number[][][])) return true;
      } else if (geom.type === 'MultiPolygon') {
        if (pointInMultiPolygon(point, geom.coordinates as unknown as number[][][][])) return true;
      }
    }
    return false;
  }
  // Single Feature
  if (gj.type === 'Feature') {
    const geom = gj.geometry;
    if (!geom) return false;
    if (geom.type === 'Polygon') return pointInPolygon(point, geom.coordinates as unknown as number[][][]);
    if (geom.type === 'MultiPolygon') return pointInMultiPolygon(point, geom.coordinates as unknown as number[][][][]);
    return false;
  }
  // Raw geometry object (Polygon or MultiPolygon)
  const geom: any = gj;
  if (geom.type === 'Polygon') return pointInPolygon(point, geom.coordinates as unknown as number[][][]);
  if (geom.type === 'MultiPolygon') return pointInMultiPolygon(point, geom.coordinates as unknown as number[][][][]);
  return false;
}
