import type { Dungeon, Grid } from '../model/types';
import { gridDimensions, normalizeGrid } from '../model/grid';
import type { Update } from './DmView';
import { SliderField } from './SliderField';

export function SetupPanel({ dungeon, update }: { dungeon: Dungeon; update: Update }) {
  const { grid, map } = dungeon;
  const set = (patch: Partial<Grid>) =>
    update((d) => ({ ...d, grid: normalizeGrid({ ...d.grid, ...patch }) }));
  const { cols, rows } = gridDimensions(grid, map.width, map.height);
  return (
    <section>
      <h3>Grid</h3>
      <SliderField label="Square size" value={grid.cellSize} min={10} max={200} onChange={(v) => set({ cellSize: v })} testId="cell-size" />
      <SliderField label="Offset X" value={grid.offsetX} min={0} max={grid.cellSize - 1} onChange={(v) => set({ offsetX: v })} testId="offset-x" />
      <SliderField label="Offset Y" value={grid.offsetY} min={0} max={grid.cellSize - 1} onChange={(v) => set({ offsetY: v })} testId="offset-y" />
      <p>
        {cols} × {rows} squares ({map.width} × {map.height} px)
      </p>
      <p>Tip: scroll to zoom, right-drag or Space+drag to pan.</p>
    </section>
  );
}
