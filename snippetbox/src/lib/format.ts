const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (value: number) => String(value).padStart(2, "0");

export function humanDate(iso: string) {
  const date = new Date(iso);
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  return `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} at ${time}`;
}
