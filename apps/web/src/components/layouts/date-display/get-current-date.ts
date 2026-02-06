export function getCurrentDateInfo(): {
  dayOfMonth: number;
  weekday: string;
  month: string;
  year: number;
} {
  const now = new Date();

  return {
    dayOfMonth: now.getDate(),
    weekday: now.toLocaleDateString("en-US", { weekday: "long" }),
    month: now.toLocaleDateString("en-US", { month: "long" }),
    year: now.getFullYear(),
  };
}
