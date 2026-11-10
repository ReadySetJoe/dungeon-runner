import { useEffect, useState } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  testId: string;
}

export function SliderField({ label, value, min, max, step = 1, onChange, testId }: Props) {
  const [draft, setDraft] = useState(String(value));

  // Re-sync when the value changes from outside (unless the draft already parses to it).
  useEffect(() => {
    setDraft((d) => (d.trim() !== '' && Number(d) === value ? d : String(value)));
  }, [value]);

  function finish() {
    const n = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  }

  return (
    <label className="field">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <input
        type="number"
        data-testid={testId}
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
        }}
        onBlur={finish}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish();
        }}
      />
    </label>
  );
}
