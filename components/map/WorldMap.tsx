'use client';
import dynamic from 'next/dynamic';
import { ConflictZone, GeoEvent, Leader } from '@/lib/engine/types';
import { WorldState } from '@/lib/engine/types';

interface Props {
  conflictZones: ConflictZone[];
  events: GeoEvent[];
  tension: number;
  isRunning: boolean;
  leaders: Leader[];
  isExpanded: boolean;
  onExpandToggle: () => void;
  breakingIntel?: string[];
  worldState?: WorldState;
  onInitiate?: () => void;
}

const WorldMapLeaflet = dynamic(() => import('./WorldMapLeaflet'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', background: '#010408', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'monospace', color: 'rgba(0,245,255,0.4)', fontSize: '11px', letterSpacing: '0.2em' }}>
        LOADING SATELLITE IMAGERY...
      </span>
    </div>
  ),
});

export default function WorldMap(props: Props) {
  return <WorldMapLeaflet {...props} />;
}
