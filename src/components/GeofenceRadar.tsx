import React from 'react';
import { LocateFixed, MapPin, Navigation } from 'lucide-react';
import { formatDistance } from '../lib/geo';
import type { OfficeSettings } from '../types';

interface GeofenceRadarProps {
  office: OfficeSettings;
  userLat: number | null;
  userLng: number | null;
  accuracyMeters: number | null;
  distanceMeters: number | null;
  gpsLoading: boolean;
  gpsError: string | null;
  onRefreshGps: () => void;
}

export const GeofenceRadar: React.FC<GeofenceRadarProps> = ({
  office,
  userLat,
  userLng,
  accuracyMeters,
  distanceMeters,
  gpsLoading,
  gpsError,
  onRefreshGps,
}) => {
  const withinRadius = distanceMeters !== null && distanceMeters <= office.radiusMeters;

  // Map user offset relative to office onto radar (max visual radius 68px = max(radiusMeters*1.5, distance))
  let dotX = 90;
  let dotY = 90;
  if (userLat !== null && userLng !== null && distanceMeters !== null) {
    const dLat = userLat - office.latitude;
    const dLng = (userLng - office.longitude) * Math.cos((office.latitude * Math.PI) / 180);
    const angle = Math.atan2(-dLat, dLng);
    const scaleMax = Math.max(office.radiusMeters * 1.4, distanceMeters);
    const normDist = Math.min(1, distanceMeters / scaleMax) * 66;
    dotX = 90 + Math.cos(angle) * normDist;
    dotY = 90 + Math.sin(angle) * normDist;
  }

  const ringRadius =
    distanceMeters !== null
      ? Math.max(24, Math.min(60, (office.radiusMeters / Math.max(office.radiusMeters * 1.4, distanceMeters)) * 66))
      : 48;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-stone-500">Radius Lokasi Kantor</p>
          <h3 className="text-base font-bold text-stone-900 mt-0.5 truncate">
            {office.officeName}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{office.address}</p>
        </div>
        <button
          type="button"
          onClick={onRefreshGps}
          disabled={gpsLoading}
          className="min-h-[40px] px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60 flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <LocateFixed className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
          <span>{gpsLoading ? 'Mencari...' : 'Perbarui GPS'}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative w-[160px] h-[160px] shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 180 180"
            className="w-full h-full"
            role="img"
            aria-label="Visualisasi jarak GPS dari Kantor Kebun Kertamanah"
          >
            <circle cx="90" cy="90" r="80" fill="#F6F7F5" stroke="#E7EAE5" strokeWidth="1" />
            <line x1="90" y1="10" x2="90" y2="170" stroke="#E7EAE5" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="10" y1="90" x2="170" y2="90" stroke="#E7EAE5" strokeWidth="1" strokeDasharray="3 3" />
            <circle
              cx="90"
              cy="90"
              r={ringRadius}
              fill={withinRadius ? 'rgba(15, 76, 58, 0.10)' : 'rgba(180, 83, 9, 0.08)'}
              stroke={withinRadius ? '#0F4C3A' : '#B45309'}
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <circle cx="90" cy="90" r="5" fill="#0F4C3A" />
            {userLat !== null && userLng !== null && (
              <>
                <line
                  x1="90"
                  y1="90"
                  x2={dotX}
                  y2={dotY}
                  stroke={withinRadius ? '#0F4C3A' : '#B45309'}
                  strokeWidth="1.5"
                  strokeOpacity="0.5"
                />
                <circle
                  cx={dotX}
                  cy={dotY}
                  r="6"
                  fill={withinRadius ? '#0F4C3A' : '#B45309'}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </>
            )}
          </svg>
        </div>

        <div className="flex-1 w-full space-y-3">
          {gpsError ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-semibold">Akses GPS Diperlukan</p>
              <p>{gpsError}</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs text-stone-500">Status Jangkauan</p>
                <div className="flex items-center gap-2">
                  <MapPin
                    className={`w-4 h-4 shrink-0 ${
                      withinRadius ? 'text-[#0F4C3A]' : 'text-amber-700'
                    }`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      withinRadius ? 'text-[#0F4C3A]' : 'text-amber-800'
                    }`}
                  >
                    {distanceMeters === null
                      ? 'Menunggu sinyal GPS...'
                      : withinRadius
                        ? 'Di Dalam Radius Kantor'
                        : 'Di Luar Radius Kantor'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                <div>
                  <p className="text-xs text-stone-500">Jarak ke Kantor</p>
                  <p className="text-base font-bold font-mono text-stone-900 mt-0.5">
                    {distanceMeters !== null ? formatDistance(distanceMeters) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Batas Radius</p>
                  <p className="text-base font-bold font-mono text-stone-900 mt-0.5">
                    {office.radiusMeters} m
                  </p>
                </div>
              </div>

              {userLat !== null && userLng !== null && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono pt-1">
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {userLat.toFixed(5)}, {userLng.toFixed(5)}
                    {accuracyMeters !== null ? ` (±${Math.round(accuracyMeters)}m)` : ''}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
