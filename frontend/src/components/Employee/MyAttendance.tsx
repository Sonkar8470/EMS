// src/components/Employee/FullYearAttendanceCalendar.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { attendanceAPI, getSocket } from "@/services/api";
import { Calendar as CalendarIcon, UserCheck, XCircle, Plane, Home, ChevronLeft, ChevronRight } from "lucide-react";

type Status = "Present" | "Absent" | "Leave" | "WFH" | "Holiday" | "W/O";

interface AttendanceRecord {
  id?: string;
  _id?: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: Status;
  inTime?: string;
  outTime?: string;
  holidayName?: string;
}

interface Props {
  employeeId?: string; // If provided, use it; else fallback to localStorage user.id
}

export default function MyAttendanceCalendar({ employeeId }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    wfh: 0,
    holiday: 0,
    percentage: 0,
  });

  const uid = useMemo(() => {
    if (employeeId) return String(employeeId);
    try {
      const raw = localStorage.getItem("user");
      if (raw) return String(JSON.parse(raw)?.id || "");
    } catch (e) {
      console.warn("Failed to parse user from localStorage", e);
    }
    return "";
  }, [employeeId]);

  const monthRange = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { start: toYmd(start), end: toYmd(end) };
  }, [currentDate]);

  const fetchAttendance = useCallback(async () => {
    if (!uid) {
      setAttendance([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const resp = await attendanceAPI.getAllAttendance({
        employeeId: uid,
        startDate: monthRange.start,
        endDate: monthRange.end,
      });
      const arr = Array.isArray(resp.data) ? (resp.data as AttendanceRecord[]) : [];
      const normalized = arr
        .filter((r) => String(r.employeeId) === String(uid))
        .map((r) => ({ ...r, date: String(r.date).slice(0, 10) as string }));
      setAttendance(normalized);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [uid, monthRange.start, monthRange.end]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Live updates for current user/month
  useEffect(() => {
    try {
      const socket = getSocket();
      type AttendancePayload = { employeeId?: string };
      const onUpdate = (payload?: AttendancePayload) => {
        if (!payload || String(payload.employeeId) !== String(uid)) return;
        fetchAttendance();
      };
      const onHoliday = () => fetchAttendance();
      socket.on("attendanceUpdated", onUpdate);
      socket.on("holidayUpdated", onHoliday);
      return () => {
        socket.off("attendanceUpdated", onUpdate);
        socket.off("holidayUpdated", onHoliday);
      };
    } catch (e) {
      console.warn("Socket initialization failed", e);
    }
  }, [uid, fetchAttendance]);

  // Stats scoped to current month and actual records only
  useEffect(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let wfh = 0;
    let holiday = 0;

    for (const r of attendance) {
      const s = String(r.status).toLowerCase();
      if (s === "present") present += 1;
      else if (s === "absent") absent += 1;
      else if (s === "leave") leave += 1;
      else if (s === "wfh") wfh += 1;
      else if (s === "holiday") holiday += 1;
    }

    // Working days used for percentage exclude holidays and W/O; do not infer absents
    const start = new Date(monthRange.start + "T00:00:00");
    const end = new Date(monthRange.end + "T00:00:00");
    const today = new Date();
    let workingDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const rec = attendance.find((r) => r.date === key);
      const s = rec?.status ? String(rec.status).toLowerCase() : "";
      const weekend = d.getDay() === 0 || (d.getDay() === 6 && [2, 4].includes(Math.ceil(d.getDate() / 7)));
      if (s === "holiday" || weekend) continue;
      if (d > today) continue; // future days not counted
      workingDays += 1;
    }
    const attended = present + wfh;
    const percentage = workingDays > 0 ? Math.round((attended / workingDays) * 100) : 0;
    setStats({ present, absent, leave, wfh, holiday, percentage });
  }, [attendance, monthRange.start, monthRange.end]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const cells: Array<number | null> = [];
    for (let i = 0; i < startingDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  };

  const getRecordForDay = (day: number | null) => {
    if (!day) return null;
    const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const rec = attendance.find((r) => r.date === key);
    const today = new Date();
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (!rec && dateObj > today) return null; // future blanks stay blank
    // Week-off fallback if not present in records and not future
    if (!rec && isWeekOff(dateObj)) {
      return {
        employeeId: uid,
        date: key,
        status: "W/O" as Status,
      } as AttendanceRecord;
    }
    return rec || null;
  };

  const monthNames = [
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
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Week-off helper: Sundays and 2nd/4th Saturdays
  const isWeekOff = (date: Date) => {
    const day = date.getDay();
    if (day === 0) return true; // Sunday
    if (day !== 6) return false; // not Saturday
    const occurrence = Math.ceil(date.getDate() / 7);
    return occurrence === 2 || occurrence === 4;
  };

  const statusColor = (status?: Status) => {
    switch (String(status || "").toLowerCase()) {
      case "present":
        return "bg-green-500 text-white";
      case "absent":
        return "bg-red-500 text-white";
      case "leave":
        return "bg-yellow-500 text-white";
      case "wfh":
        return "bg-blue-500 text-white";
      case "holiday":
        return "bg-purple-500 text-white";
      case "w/o":
        return "bg-gray-500 text-white";
      default:
        return "bg-white hover:bg-gray-50";
    }
  };

  const statusIcon = (status?: Status) => {
    switch (String(status || "").toLowerCase()) {
      case "present":
        return <UserCheck className="h-3 w-3" />;
      case "absent":
        return <XCircle className="h-3 w-3" />;
      case "leave":
        return <Plane className="h-3 w-3" />;
      case "wfh":
        return <Home className="h-3 w-3" />;
      case "holiday":
        return <CalendarIcon className="h-3 w-3" />;
      case "w/o":
        return <CalendarIcon className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const navigateMonth = (dir: "prev" | "next") => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() + (dir === "prev" ? -1 : 1));
      return d;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground">Single-month calendar with daily status.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Leave</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.leave}</p>
              </div>
              <Plane className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">WFH</p>
                <p className="text-2xl font-bold text-blue-600">{stats.wfh}</p>
              </div>
              <Home className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Holiday</p>
                <p className="text-2xl font-bold text-purple-600">{stats.holiday}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Attendance %</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.percentage}%</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-600 font-bold text-xs">{stats.percentage}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Legend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 bg-green-500 rounded-full" /> Present
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 bg-red-500 rounded-full" /> Absent
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 bg-yellow-500 rounded-full" /> Leave
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 bg-blue-500 rounded-full" /> WFH
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 bg-purple-500 rounded-full" /> Holiday
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 bg-gray-500 rounded-full" /> W/O
          </span>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" /> Attendance Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {dayNames.map((d) => (
              <div key={d} className="p-1 text-center text-[10px] md:text-xs font-medium text-gray-500">
                {d}
              </div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5">
            {getDaysInMonth(currentDate).map((d, idx) => {
              const rec = getRecordForDay(d);
              return (
                <div
                  key={idx}
                  className={`aspect-square p-0.5 border rounded-md transition-all duration-200 ${rec ? statusColor(rec.status) : "bg-white"}`}
                >
                  {d && (
                    <div className="flex flex-col items-center justify-center h-full text-[10px] md:text-xs">
                      <span className={`font-medium ${rec ? "text-inherit" : "text-gray-900"}`}>{d}</span>
                      {rec && (
                        <div className="flex items-center gap-1 mt-1">
                          {statusIcon(rec.status)}
                          {rec.inTime && (
                            <span className="text-[9px] md:text-[10px]">{rec.inTime.slice(0, 5)}</span>
                          )}
                          {String(rec.status).toLowerCase() === "holiday" && rec.holidayName && (
                            <span className="text-[9px] md:text-[10px] truncate max-w-[60px]">{rec.holidayName}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {loading && <p className="text-sm text-gray-500 mt-3">Loading attendance...</p>}
          {!loading && error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
