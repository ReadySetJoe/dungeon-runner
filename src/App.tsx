import { DmView } from './ui/DmView';
import { PlayerView } from './ui/PlayerView';

export default function App() {
  const path = window.location.pathname;
  if (path.startsWith('/player')) return <PlayerView />;
  return <DmView demo={path.startsWith('/demo')} />;
}
