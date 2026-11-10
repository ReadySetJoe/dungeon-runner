import { DmView } from './ui/DmView';
import { PlayerView } from './ui/PlayerView';

export default function App() {
  return window.location.pathname.startsWith('/player') ? <PlayerView /> : <DmView />;
}
