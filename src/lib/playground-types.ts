export type PanelId = 'json' | 'tree' | 'code' | 'output';

/** Layout presets: how the 4 panels are arranged (order comes from tab order). */
export type LayoutMode =
  | 'horizontal'         // [1|2|3|4] one row
  | 'vertical'          // [1][2][3][4] one column
  | 'grid-2x2'          // 2×2 grid: top [1|2], bottom [3|4]
  | 'split-left'        // vertical split: left [1,2], right [3,4]
  | 'split-right'       // vertical split: left [1], right [2,3,4]
  | 'split-three-left'  // vertical split: left [1,2,3], right [4]
  | 'top-bottom'        // horizontal split: top [1|2], bottom [3|4]
  | 'bottom-top'        // horizontal split: top [1], bottom [2|3|4]
  | 'three-top';        // horizontal split: top [1|2|3], bottom [4]
