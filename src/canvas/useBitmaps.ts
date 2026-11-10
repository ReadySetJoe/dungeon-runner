import { useEffect, useRef, useState } from 'react';

export function useBitmaps(items: { id: string; blob: Blob }[]) {
  const cache = useRef(new Map<string, ImageBitmap>());
  const pending = useRef(new Set<string>());
  const wanted = useRef(new Set<string>());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    wanted.current = new Set(items.map((i) => i.id));
    for (const [id, bmp] of cache.current) {
      if (!wanted.current.has(id)) {
        bmp.close();
        cache.current.delete(id);
      }
    }
    for (const item of items) {
      if (cache.current.has(item.id) || pending.current.has(item.id)) continue;
      pending.current.add(item.id);
      createImageBitmap(item.blob)
        .then((bmp) => {
          pending.current.delete(item.id);
          if (!wanted.current.has(item.id)) {
            bmp.close();
            return;
          }
          cache.current.set(item.id, bmp);
          setVersion((v) => v + 1);
        })
        .catch(() => {
          pending.current.delete(item.id);
        });
    }
  }, [items]);

  return { bitmaps: cache.current, version };
}
