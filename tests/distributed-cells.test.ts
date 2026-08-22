import {describe, expect, it} from 'vitest';
import {distributedCellMask} from '../src/render/distributed-cells';

describe('distributed simulation cells', () => {
  it.each([
    {cellCount: 500, markedCount: 137},
    {cellCount: 1000, markedCount: 321},
    {cellCount: 1000, markedCount: 679},
  ])('keeps the exact count and balances every 5x4 tile for $cellCount cells', ({cellCount, markedCount}) => {
    const mask = distributedCellMask({cellCount, markedCount});
    expect(mask.filter(Boolean)).toHaveLength(markedCount);
    expect(distributedCellMask({cellCount, markedCount})).toEqual(mask);

    const globalRate = markedCount / cellCount;
    const columns = 50;
    const rows = Math.ceil(cellCount / columns);
    for (let row = 0; row < rows; row += 1) {
      const cells = mask.slice(row * columns, Math.min(cellCount, (row + 1) * columns));
      const expected = globalRate * cells.length;
      expect(Math.abs(cells.filter(Boolean).length - expected)).toBeLessThanOrEqual(1);
    }
    for (let tileRow = 0; tileRow < Math.ceil(rows / 4); tileRow += 1) {
      for (let tileColumn = 0; tileColumn < columns / 5; tileColumn += 1) {
        const cells: boolean[] = [];
        for (let row = 0; row < 4; row += 1) {
          for (let column = 0; column < 5; column += 1) {
            const index = (tileRow * 4 + row) * columns + tileColumn * 5 + column;
            if (index < cellCount) cells.push(mask[index]!);
          }
        }
        const expected = globalRate * cells.length;
        expect(Math.abs(cells.filter(Boolean).length - expected)).toBeLessThanOrEqual(3);
      }
    }
  });
});
