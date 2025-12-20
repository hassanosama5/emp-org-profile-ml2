/**
 * UTC Date Utility Functions
 * 
 * These functions handle date formatting consistently using UTC timezone
 * to match the MongoDB storage format and prevent timezone-related bugs.
 * 
 * MongoDB stores all dates in UTC, so we need to:
 * 1. Parse dates as UTC when displaying
 * 2. Format dates in UTC for consistency
 * 3. Send dates as UTC/ISO strings to backend
 */

/**
 * Format a date in UTC as a date string (YYYY-MM-DD or locale format)
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions (optional)
 * @returns Formatted date string in UTC
 */
export function formatUTCDate(
  date: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '-';
    
    // Default options for date-only display
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
      ...options,
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch {
    return '-';
  }
}

/**
 * Format a time in UTC as a time string (HH:MM AM/PM)
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions (optional)
 * @returns Formatted time string in UTC
 */
export function formatUTCTime(
  date: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '-';
    
    // Default options for time-only display
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
      ...options,
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch {
    return '-';
  }
}

/**
 * Format a date and time in UTC as a datetime string
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions (optional)
 * @returns Formatted datetime string in UTC
 */
export function formatUTCDateTime(
  date: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '-';
    
    // Default options for full datetime display
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
      ...options,
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch {
    return '-';
  }
}

/**
 * Convert a local date to UTC midnight (start of day)
 * Useful for date range queries
 * @param date - Date string or Date object
 * @returns Date object set to UTC midnight
 */
export function toUTCStartOfDay(date: string | Date): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(
    Date.UTC(
      dateObj.getUTCFullYear(),
      dateObj.getUTCMonth(),
      dateObj.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

/**
 * Convert a local date to UTC end of day (23:59:59.999)
 * Useful for date range queries
 * @param date - Date string or Date object
 * @returns Date object set to UTC end of day
 */
export function toUTCEndOfDay(date: string | Date): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(
    Date.UTC(
      dateObj.getUTCFullYear(),
      dateObj.getUTCMonth(),
      dateObj.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

/**
 * Format duration in minutes to "Xh Ym" format
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes?: number | null): string {
  if (minutes === undefined || minutes === null) return '-';
  
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  return `${hours}h ${mins}m`;
}

/**
 * Calculate duration between two dates in minutes
 * @param start - Start date
 * @param end - End date
 * @returns Duration in minutes, or undefined if invalid
 */
export function calculateDurationMinutes(
  start?: string | Date | null,
  end?: string | Date | null
): number | undefined {
  if (!start || !end) return undefined;
  
  try {
    const startTime = new Date(start);
    const endTime = new Date(end);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return undefined;
    }
    
    const diffMs = endTime.getTime() - startTime.getTime();
    if (diffMs < 0) return undefined; // Invalid if end is before start
    
    return Math.floor(diffMs / (1000 * 60)); // Convert to minutes
  } catch {
    return undefined;
  }
}

/**
 * Get current date as ISO string (UTC)
 * @returns ISO string of current date/time
 */
export function getCurrentUTCISOString(): string {
  return new Date().toISOString();
}

/**
 * Parse a date string and return as ISO string (UTC)
 * @param date - Date string or Date object
 * @returns ISO string or null if invalid
 */
export function toUTCISOString(date: string | Date | undefined | null): string | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return null;
    
    return dateObj.toISOString();
  } catch {
    return null;
  }
}
