export type PanelId = 'json' | 'code' | 'output';

/** Layout presets: how the 3 panels are arranged (order comes from tab order). */
export type LayoutMode =
  | 'horizontal'      // [1 | 2 | 3] one row
  | 'vertical'        // [1][2][3] stacked
  | 'split-left'      // left: [1,2] stacked, right: [3]
  | 'split-right'     // left: [1], right: [2,3] stacked
  | 'top-bottom'      // top: [1|2] row, bottom: [3]
  | 'bottom-top';     // top: [1], bottom: [2|3] row
