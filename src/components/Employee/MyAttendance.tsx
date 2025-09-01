// src/components/Employee/FullYearAttendanceCalendar.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Status types based on Mongoose schemas from models folder
type Status = "present" | "leave" | "wfh" | "holiday";
type AttendanceDay = { date: string; status: Status }; // date: "2025-03-14"

type ApiResponse = Array<AttendanceDay>;
interface Props {
  employeeId?: string; // pass kare to us employee ka calendar; else localStorage se utha lunga
  initialYear?: number; // default: current year
}

export default function MyAttendanceCalendar({
  employeeId,
  initialYear = new Date().getFullYear(),
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<ApiResponse>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const uid = useMemo(() => {
    if (employeeId) return employeeId;
    try {
      const raw = localStorage.getItem("user");
      if (raw) return JSON.parse(raw)?.id as string;
    } catch { /* empty */ }
    return "";
  }, [employeeId]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(
          `http://localhost:3001/attendance?userId=${uid}&year=${year}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        if (!ignore) setData(json);
      } catch (e: unknown) {
        if (e instanceof Error) {
          if (!ignore) setErr(e.message);
        } else {
          if (!ignore) setErr(String(e));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [uid, year]);

  const dayMap = useMemo(() => {
    const m = new Map<string, Status>();
    for (const d of data) m.set(d.date.slice(0, 10), d.status);
    return m;
  }, [data]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  const statusClass = (s?: Status) => {
    switch (s) {
      case "present":
        return "bg-emerald-500 text-white";

      case "leave":
        return "bg-amber-500 text-white";
      case "wfh":
        return "bg-blue-500 text-white";
      case "holiday":
        return "bg-purple-500 text-white";
      default:
        return "bg-card";
    }
  };

  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  const buildMonthGrid = (y: number, m: number) => {
    const first = new Date(y, m, 1);
    const totalDays = daysInMonth(y, m);
    const startWeekday = first.getDay();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    while (cells.length < 42) cells.push(null);
    return cells;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Attendance — {year}</h1>
          <p className="text-muted-foreground">
            Full year calendar with daily status.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setYear((y) => y - 1)}>
            Prev
          </Button>
          <Button variant="outline" onClick={() => setYear((y) => y + 1)}>
            Next
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Legend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          {[
            ["present", "bg-emerald-500"],
            ["leave", "bg-amber-500"],
            ["wfh", "bg-blue-500"],
            ["holiday", "bg-purple-500"],
          ].map(([label, cls]) => (
            <span key={label} className="inline-flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${cls}`} />
              {label}
            </span>
          ))}
        </CardContent>
      </Card>

      {loading && <p>Loading attendance…</p>}
      {err && <p className="text-rose-600">Error: {err}</p>}

      {!loading && !err && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {months.map((m) => {
            const monthName = new Date(year, m, 1).toLocaleString(undefined, {
              month: "long",
            });
            const cells = buildMonthGrid(year, m);
            return (
              <Card key={m} className="overflow-hidden">
                <CardHeader className="py-3">
                  <CardTitle className="text-lg">{monthName}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-7 text-xs text-muted-foreground mb-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (d) => (
                        <div key={d} className="text-center py-1">
                          {d}
                        </div>
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((d, idx) => {
                      if (!d)
                        return (
                          <div
                            key={idx}
                            className="h-8 rounded-md bg-transparent"
                          />
                        );
                      const key = ymd(d);
                      const status = dayMap.get(key);
                      return (
                        <div
                          key={idx}
                          className={`h-8 rounded-md border flex items-center justify-center ${statusClass(
                            status
                          )}`}
                          title={status ? `${key}: ${status}` : key}
                        >
                          <span className="text-xs">{d.getDate()}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
