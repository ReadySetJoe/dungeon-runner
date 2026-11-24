import type { Dungeon, Grid } from '../model/types';
import { gridDimensions, normalizeGrid } from '../model/grid';
import type { Update } from './DmView';
import { SliderField } from './SliderField';

interface Props {
  dungeon: Dungeon;
  update: Update;
  measuring: boolean;
  pointCount: number;
  spanned: number;
  onSpannedChange: (n: number) => void;
  onStartMeasure: () => void;
  onCancelMeasure: () => void;
  notice: string | null;
}

export function SetupPanel({
  dungeon,
  update,
  measuring,
  pointCount,
  spanned,
  onSpannedChange,
  onStartMeasure,
  onCancelMeasure,
  notice,
}: Props) {
  const { grid, map } = dungeon;
  const set = (patch: Partial<Grid>) =>
    update((d) => ({ ...d, grid: normalizeGrid({ ...d.grid, ...patch }) }));
  const { cols, rows } = gridDimensions(grid, map.width, map.height);
  return (
    <section>
      <h3>Grid</h3>
      <div>
        <label>
          Squares spanned{' '}
          <input
            type="number"
            data-testid="squares-spanned"
            min={1}
            max={50}
            value={spanned}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              if (Number.isFinite(n) && n >= 1 && n <= 50) onSpannedChange(n);
            }}
          />
        </label>{' '}
        {measuring ? (
          <button data-testid="measure-cancel" onClick={onCancelMeasure}>
            Cancel
          </button>
        ) : (
          <button data-testid="measure-start" onClick={onStartMeasure}>
            Measure square
          </button>
        )}
      </div>
      {measuring && (
        <p role="status">
          {pointCount === 0
            ? `Click one corner of a ${spanned === 1 ? 'square' : `${spanned}×${spanned} block of squares`} on the map.`
            : 'Now click the opposite corner. (Esc cancels)'}
        </p>
      )}
      {!measuring && notice && <p role="status">{notice}</p>}
      <SliderField label="Square size" value={grid.cellSize} min={10} max={200} step={0.01} onChange={(v) => set({ cellSize: v })} testId="cell-size" />
      <SliderField label="Offset X" value={grid.offsetX} min={0} max={grid.cellSize - 0.01} step={0.1} onChange={(v) => set({ offsetX: v })} testId="offset-x" />
      <SliderField label="Offset Y" value={grid.offsetY} min={0} max={grid.cellSize - 0.01} step={0.1} onChange={(v) => set({ offsetY: v })} testId="offset-y" />
      <p>
        {cols} × {rows} squares ({map.width} × {map.height} px)
      </p>
      <p>Tip: scroll to zoom, right-drag or Space+drag to pan.</p>
    </section>
  );
}
