/**
 * Get the local date number (day of the month) for a given Date or timestamp.
 * If no date is provided, uses the current local time.
 * Optionally accepts a locale (defaults to the runtime locale) and
 * an IANA timezone name (e.g., 'Asia/Kolkata') for explicit timezone formatting.
 */
export function getLocalDateNumber(
  dateInput?: Date | number,
  locale?: string,
  timeZone?: string
): number {
  const dt =
    dateInput instanceof Date
      ? dateInput
      : dateInput
        ? new Date(dateInput)
        : new Date();

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      timeZone: timeZone,
    });
    return Number(formatter.format(dt));
  } catch {
    // Fallback to local date number using getDate when Intl fails
    return dt.getDate();
  }
}

/**
 * Get the local day name for a given Date or timestamp.
 * If no date is provided, uses the current local time.
 * Optionally accepts a locale (defaults to the runtime locale) and
 * an IANA timezone name (e.g., 'Asia/Kolkata') for explicit timezone formatting.
 */
export function getLocalDayName(
  dateInput?: Date | number,
  locale?: string,
  timeZone?: string,
  longFormat: boolean = false
): string {
  const dt =
    dateInput instanceof Date
      ? dateInput
      : dateInput
        ? new Date(dateInput)
        : new Date();

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      weekday: longFormat ? "long" : "short",
      timeZone: timeZone,
    });
    return formatter.format(dt);
  } catch {
    // Fallback to local day name using getDay when Intl fails
    const fallbackDays = longFormat
      ? [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return fallbackDays[dt.getDay()] ?? "";
  }
}

/**
 * Get the local month name for a given Date or timestamp.
 * If no date is provided, uses the current local time.
 * Optionally accepts a locale (defaults to the runtime locale) and
 * an IANA timezone name (e.g., 'Asia/Kolkata') for explicit timezone formatting.
 */
export function getLocalMonthName(
  dateInput?: Date | number,
  locale?: string,
  timeZone?: string
): string {
  const dt =
    dateInput instanceof Date
      ? dateInput
      : dateInput
        ? new Date(dateInput)
        : new Date();
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      month: "long",
      timeZone: timeZone,
    });
    return formatter.format(dt);
  } catch {
    // Fallback to local month name using getMonth when Intl fails
    const fallbackMonths = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return fallbackMonths[dt.getMonth()] ?? "";
  }
}
