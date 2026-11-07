import React, { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '../../components/ui';

export type DeliveryPoint = { lat: number; lng: number };
// This is only an initial viewport, never an automatically selected destination.
const DEFAULT_VIEW: DeliveryPoint = { lat: 30.0444, lng: 31.2357 };
function Picker({ onChange }: { onChange: (point: DeliveryPoint) => void }) {
  useMapEvents({ click: e => onChange({lat: e.latlng.lat, lng: e.latlng.lng}) });
  return null;
}
function Recenter({ point }: { point: DeliveryPoint | null }) {
  const map = useMap();
  useEffect(() => { if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 15)); }, [map, point]);
  return null;
}
export default function DeliveryMap({value, onChange}: {value: DeliveryPoint | null; onChange: (point: DeliveryPoint) => void}) {
  const centre = value ?? DEFAULT_VIEW;
  const [message, setMessage] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const locate = () => {
    if (!window.isSecureContext || !navigator.geolocation) { setMessage('Location is unavailable. You can still tap the map.'); return; }
    setMessage('Finding your location…');
    navigator.geolocation.getCurrentPosition(position => {
      onChange({ lat: position.coords.latitude, lng: position.coords.longitude });
      setMessage('Location selected. You can adjust the pin on the map.');
    }, () => setMessage('Location permission was denied or unavailable. Tap the map to choose your location.'), {enableHighAccuracy: true, timeout: 20000});
  };
  return <div>
    <h3 className="font-bold">1. Pin your delivery location</h3>
    <p className="mb-2 text-sm text-gray-600">Tap the map to place your pin, or use your current location. The map opens near Cairo until you choose a location.</p>
    <MapContainer center={[centre.lat, centre.lng]} zoom={12} className="z-0 h-72 w-full rounded-xl border" scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Picker onChange={onChange} /><Recenter point={value} />
      {value && <CircleMarker center={[value.lat,value.lng]} radius={10} pathOptions={{color:'#ea580c'}} />}
    </MapContainer>
    <Button className="mt-3" variant="outline" onClick={locate}>Use my current location</Button>
    {message && <p role="status" className="mt-2 text-sm text-gray-600">{message}</p>}
    <p className="mt-2 text-sm" role="status">{value ? `Selected: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : 'No location selected yet.'}</p>
    <details className="mt-2 text-sm"><summary className="cursor-pointer text-primary underline">Enter known coordinates instead</summary>
      <div className="mt-2 flex flex-wrap items-end gap-2"><label>Latitude<input className="ml-2 w-28 rounded border p-1" type="number" step="any" min="-90" max="90" value={latitude} onChange={e=>setLatitude(e.target.value)} /></label><label>Longitude<input className="ml-2 w-28 rounded border p-1" type="number" step="any" min="-180" max="180" value={longitude} onChange={e=>setLongitude(e.target.value)} /></label><Button variant="outline" onClick={()=>{const lat=Number(latitude),lng=Number(longitude);if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) {setMessage('Enter valid latitude and longitude.');return;}onChange({lat,lng});setMessage('Coordinates selected.');}}>Set coordinates</Button></div>
    </details>
    <p className="mt-1 text-xs text-gray-500">OpenStreetMap provides the map tiles and receives the viewed map area. Map tiles require an internet connection; you can also enter known coordinates above.</p>
  </div>;
}
