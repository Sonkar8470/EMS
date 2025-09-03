import { useCallback, useEffect, useMemo, useState } from "react";
import { holidaysAPI, getSocket } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, CheckCircle2, XCircle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type HolidayItem = {
  _id?: string;
  id?: string;
  date: string; // YYYY-MM-DD
  holidayName: string;
  day?: string;
  applicable?: boolean;
  fixed?: boolean;
  immutable?: boolean;
  locked?: boolean;
};

type Props = {
  className?: string;
  onChanged?: (holidays: HolidayItem[]) => void;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthMatrix(year: number, monthIndex0: number): (Date | null)[][] {
  const first = new Date(year, monthIndex0, 1);
  const last = new Date(year, monthIndex0 + 1, 0);
  const firstWeekday = first.getDay(); // 0..6 (Sun..Sat)
  const daysInMonth = last.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex0, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function isSecondOrFourthSaturday(date: Date): boolean {
  if (date.getDay() !== 6) return false; // Saturday
  const dayOfMonth = date.getDate();
  const occurrence = Math.ceil(dayOfMonth / 7);
  return occurrence === 2 || occurrence === 4;
}

function getDayLabel(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()];
}

export default function CompanyHolidayCalendar({ className, onChanged }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const today = new Date();
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [holidays, setHolidays] = useState<Record<string, HolidayItem>>({}); // keyed by YYYY-MM-DD
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const year = cursor.getFullYear();
  const monthIndex0 = cursor.getMonth();

  const matrix = useMemo(() => getMonthMatrix(year, monthIndex0), [year, monthIndex0]);

  // monthKey reserved for memoization scenarios if needed in future

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await holidaysAPI.list();
      const list: HolidayItem[] = res.data || [];
      const map: Record<string, HolidayItem> = {};
      list.forEach((h) => {
        const d = new Date(h.date);
        const ymd = toYmd(d);
        map[ymd] = { ...h, date: ymd };
      });
      setHolidays(map);
      onChanged?.(list);
    } catch (err) {
      console.error("Failed to fetch holidays", err);
      setError("Failed to load company holidays");
    } finally {
      setLoading(false);
    }
  }, [onChanged]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  useEffect(() => {
    const socket = getSocket();
    const handler = () => fetchHolidays();
    socket.on("holidayUpdated", handler);
    return () => {
      socket.off("holidayUpdated", handler);
    };
  }, [fetchHolidays]);

  // No Google Calendar integration

  // derived list if needed by parent callbacks; not used in UI directly

  const isHoliday = useCallback(
    (date: Date): HolidayItem | undefined => {
      const ymd = toYmd(date);
      return holidays[ymd];
    },
    [holidays]
  );

  const isWO = useCallback((date: Date): boolean => {
    const day = date.getDay();
    if (day === 0) return true; // Sunday
    if (isSecondOrFourthSaturday(date)) return true; // 2nd and 4th Saturday
    return false;
  }, []);

  const toggleHoliday = useCallback(
    (date: Date) => {
      const ymd = toYmd(date);
      if (!isAdmin) return; // read-only for non-admins
      const existing = holidays[ymd];
      const isFixed = !!existing && (existing.fixed || existing.immutable || existing.locked || existing.applicable === false);
      if (isFixed) return; // cannot modify fixed backend holidays
      setEditingDate(ymd);
      setEditingName(existing?.holidayName || "Company Holiday");
      setIsEditOpen(true);
    },
    [holidays, isAdmin]
  );

  const saveChanges = useCallback(async () => {
    setSaving(true);
    try {
      // We will upsert all current holidays as applicable=true using /holidays/seed
      const payload: HolidayItem[] = Object.values(holidays).map((h) => ({
        date: h.date,
        holidayName: h.holidayName || "Company Holiday",
        day: h.day,
        applicable: true,
      }));
      if (!isAdmin) return; // safety guard
      await holidaysAPI.seed(payload);
      await fetchHolidays();
    } catch (err) {
      console.error("Failed to save holidays", err);
    } finally {
      setSaving(false);
    }
  }, [holidays, fetchHolidays, isAdmin]);

  const goPrev = () => setCursor(new Date(year, monthIndex0 - 1, 1));
  const goNext = () => setCursor(new Date(year, monthIndex0 + 1, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  const refresh = async () => {
    setIsRefreshing(true);
    await fetchHolidays();
    setIsRefreshing(false);
  };

  const monthHolidayCount = useMemo(() => {
    const start = new Date(year, monthIndex0, 1);
    const end = new Date(year, monthIndex0 + 1, 0);
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ymd = toYmd(d);
      if (holidays[ymd]) count += 1;
    }
    return count;
  }, [holidays, year, monthIndex0]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={cn("w-full", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Company Holidays
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </span>
              <Button variant="outline" size="sm" onClick={goNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isRefreshing}
                className="h-8 px-3"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              {isAdmin && (
                <Button onClick={saveChanges} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Total holidays this month: {monthHolidayCount}</div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-emerald-500" />
              <span className="text-sm font-medium">Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-slate-300 dark:bg-slate-700" />
              <span className="text-sm font-medium">W/O (Sun, 2nd & 4th Sat)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-transparent border" />
              <span className="text-sm font-medium">Non-Holiday</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-muted-foreground mb-2">
            {dayNames.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 border rounded">
            {matrix.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                if (!cell)
                  return <div key={`${rIdx}-${cIdx}`} className="h-20 bg-muted/30" />;
                const ymd = toYmd(cell);
                const holiday = isHoliday(cell);
                const wo = isWO(cell);
                const isToday = ymd === toYmd(today);
                const isFixed = !!holiday && (holiday.fixed || holiday.immutable || holiday.locked || holiday.applicable === false);
                const isEditable = isAdmin && !wo && !isFixed;

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => (isEditable ? toggleHoliday(cell) : undefined)}
                    className={cn(
                      "relative h-20 p-2 text-left border",
                      (wo || !isEditable) && "bg-slate-100 dark:bg-slate-900/40",
                      !isEditable && "cursor-not-allowed",
                      isToday && "ring-2 ring-primary",
                      isEditable && holiday && "bg-emerald-50 dark:bg-emerald-900/20",
                      isEditable && !holiday && "hover:bg-accent"
                    )}
                    title={holiday ? `${holiday.holidayName} (${getDayLabel(cell)})` : wo ? "W/O" : `Non-Holiday (${getDayLabel(cell)})`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-70">{cell.getDate()}</span>
                      {holiday ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : wo ? (
                        <XCircle className="h-4 w-4 text-amber-500" />
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs leading-tight truncate">
                      {holiday ? holiday.holidayName : wo ? "W/O" : ""}
                    </div>
                    {isAdmin && holiday && !isFixed && (
                      <div className="absolute right-1 bottom-1">
                        <Button
                          variant="outline"
                          size="sm" asChild
                          className="h-5 px-1 text-[10px]"
                        >
                          <span onClick={(e) => {
                            e.stopPropagation();
                            setEditingDate(ymd);
                            setEditingName(holiday.holidayName || "Company Holiday");
                            setIsEditOpen(true);
                          }}>Edit</span>
                        </Button>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {loading && (
            <div className="mt-2 text-xs text-muted-foreground">Loading holidays…</div>
          )}
          {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{holidays[editingDate || ""] ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="text-sm font-medium">{editingDate}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Holiday Name</div>
              <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  if (!editingDate) return;
                  const name = editingName.trim() || "Company Holiday";
                  setHolidays((prev) => {
                    const next = { ...prev } as Record<string, HolidayItem>;
                    next[editingDate] = {
                      ...(next[editingDate] || { date: editingDate, applicable: true }),
                      date: editingDate,
                      holidayName: name,
                      day: getDayLabel(new Date(editingDate)),
                      applicable: true,
                    } as HolidayItem;
                    return next;
                  });
                  setIsEditOpen(false);
                }}
                className="flex-1"
              >
                Save
              </Button>
              {editingDate && holidays[editingDate] && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const dateKey = editingDate;
                    setHolidays((prev) => {
                      const next = { ...prev } as Record<string, HolidayItem>;
                      delete next[dateKey];
                      return next;
                    });
                    setIsEditOpen(false);
                  }}
                >
                  Unmark
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


