/** Format a Date as YYYY-MM-DD for Postgres date columns. */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Inclusive end date: start + (weeks * 7) - 1 days. */
export function calculateEndDate(
  startDate: Date | undefined,
  weeks: number,
): Date | undefined {
  if (!startDate || weeks < 1) return undefined
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + weeks * 7 - 1)
  return endDate
}
