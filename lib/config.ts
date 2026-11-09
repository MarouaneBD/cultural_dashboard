/**
 * Reporting-year configuration — derived from the current calendar year.
 * No manual change needed: on 1 January the system automatically advances
 * to the new cycle (current year vs previous year).
 */
export const REPORTING_YEAR = new Date().getFullYear()
export const PREV_REPORTING_YEAR = REPORTING_YEAR - 1
