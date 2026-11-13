/** true if `end` is strictly later than `start` (ISO strings or Date objects) */
export const isAfter = (end, start) => new Date(end).getTime() > new Date(start).getTime()