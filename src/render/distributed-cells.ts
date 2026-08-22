function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

/**
 * Builds an exact-count mask while balancing marked cells across small spatial
 * row groups. Hashing only decides positions inside each group, so the result has no
 * long stripes or obvious modulo pattern and still stays deterministic.
 */
export function distributedCellMask(input: {
  cellCount: number;
  markedCount: number;
  columns?: number;
  tileColumns?: number;
  tileRows?: number;
}): boolean[] {
  const cellCount = Math.max(0, Math.floor(input.cellCount));
  const markedCount = Math.max(0, Math.min(cellCount, Math.floor(input.markedCount)));
  if (cellCount === 0) return [];

  const columns = Math.max(1, Math.floor(input.columns ?? 50));
  const tileColumns = Math.max(1, Math.floor(input.tileColumns ?? 5));
  const tileRows = Math.max(1, Math.floor(input.tileRows ?? 4));
  const rows = Math.ceil(cellCount / columns);
  const mask = Array.from({length: cellCount}, () => false);
  const rowBuckets = Array.from({length: rows}, (_, row) => {
    const start = row * columns;
    const indices = Array.from({length: Math.min(columns, cellCount - start)}, (_, column) => start + column);
    const exactQuota = markedCount * indices.length / cellCount;
    return {row, indices, quota: Math.floor(exactQuota), remainder: exactQuota - Math.floor(exactQuota)};
  });
  let assignedRows = rowBuckets.reduce((sum, row) => sum + row.quota, 0);
  const rowOrder = [...rowBuckets].sort((left, right) =>
    right.remainder - left.remainder
    || mix32(left.row ^ cellCount ^ markedCount) - mix32(right.row ^ cellCount ^ markedCount),
  );
  for (let index = 0; assignedRows < markedCount; index += 1, assignedRows += 1) {
    rowOrder[index % rowOrder.length]!.quota += 1;
  }

  for (const row of rowBuckets) {
    const groups = Array.from({length: Math.ceil(row.indices.length / tileColumns)}, (_, group) => {
      const indices = row.indices.slice(group * tileColumns, (group + 1) * tileColumns);
      const exactQuota = row.quota * indices.length / row.indices.length;
      return {group, indices, quota: Math.floor(exactQuota), remainder: exactQuota - Math.floor(exactQuota)};
    });
    let assignedGroups = groups.reduce((sum, group) => sum + group.quota, 0);
    const block = Math.floor(row.row / tileRows);
    const groupOrder = [...groups].sort((left, right) =>
      right.remainder - left.remainder
      || mix32(left.group ^ Math.imul(row.row + 1, 0x9e3779b1) ^ block ^ markedCount) - mix32(right.group ^ Math.imul(row.row + 1, 0x9e3779b1) ^ block ^ markedCount),
    );
    for (let index = 0; assignedGroups < row.quota; index += 1, assignedGroups += 1) {
      groupOrder[index % groupOrder.length]!.quota += 1;
    }
    for (const group of groups) {
      const salt = mix32(row.row ^ Math.imul(group.group + 1, 0x85ebca6b) ^ markedCount);
      const positions = [...group.indices].sort((left, right) =>
        mix32(left + salt) - mix32(right + salt) || left - right,
      );
      for (let index = 0; index < group.quota; index += 1) mask[positions[index]!] = true;
    }
  }
  return mask;
}
