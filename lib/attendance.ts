export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "UNMARKED"] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];
export function attendancePercentage(rows: Array<{ status: AttendanceStatus }>) {
  const counted = rows.filter((row) => row.status === "PRESENT" || row.status === "LATE" || row.status === "ABSENT");
  if (!counted.length) return 0;
  return Math.round((counted.filter((row) => row.status === "PRESENT" || row.status === "LATE").length / counted.length) * 100);
}
