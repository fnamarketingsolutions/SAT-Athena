/**
 * Weeks of history shown in the profile "Study activity" heatmap.
 *
 * The query's date range and the rendered column count both derive from this.
 * They have to agree: the chart fills any day it has no row for with a level-0
 * cell, so a range narrower than the column count reads as a stretch of
 * inactivity rather than as missing data.
 */
export const PROFILE_HEATMAP_WEEKS = 26;
