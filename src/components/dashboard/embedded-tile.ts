/**
 * Sizing for a dashboard widget rendered with `embedded` — that is, as one cell
 * of the command-center grid rather than as a standalone block on its own page.
 *
 * The grid stretches every cell to the height of the tallest tile in its row,
 * but a card left at its own content height ignores that and stops short,
 * leaving the rest of the cell showing as bare page between the tiles. Laying
 * the cell out as a column and letting its single card grow keeps short tiles
 * flush with the tall ones beside them.
 */
export const EMBEDDED_TILE = "flex h-full min-h-[10rem] flex-col [&>*]:flex-1";
