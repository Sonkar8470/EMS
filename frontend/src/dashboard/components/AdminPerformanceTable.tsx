import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardAPI } from "@/services/api";

type Row = {
  employeeId: string;
  name: string;
  role: string;
  totalAttendanceDays: number;
  totalLeavesTaken: number;
  totalWFHDays: number;
};

export default function AdminPerformanceTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getUTCMonth() + 1); // 1-12
  const [year, setYear] = useState<number>(now.getUTCFullYear());

  const load = useMemo(() => async () => {
    setLoading(true);
    try {
      const { data } = await dashboardAPI.getPerformance({ month, year });
      setRows(data?.rows || []);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const startIdx = (page - 1) * pageSize;
  const pageRows = rows.slice(startIdx, startIdx + pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Employee Performance – {new Date(Date.UTC(year, month - 1, 1)).toLocaleString(undefined, { month: "long", year: "numeric" })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <select
            className="border rounded px-2 py-1"
            value={month}
            onChange={(e) => { setPage(1); setMonth(Number(e.target.value)); }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{new Date(Date.UTC(2000, m - 1, 1)).toLocaleString(undefined, { month: "long" })}</option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1"
            value={year}
            onChange={(e) => { setPage(1); setYear(Number(e.target.value)); }}
          >
            {Array.from({ length: 6 }, (_, i) => now.getUTCFullYear() - 4 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground">No data</div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left sticky top-0 bg-background">
                  <th className="py-2 pr-4">Employee Name</th>
                  <th className="py-2 pr-4">Department/Role</th>
                  <th className="py-2 pr-4">Total Attendance Days</th>
                  <th className="py-2 pr-4">Total Leaves Taken</th>
                  <th className="py-2">Total WFH Days</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.employeeId} className="border-t">
                    <td className="py-2 pr-4">{r.name}</td>
                    <td className="py-2 pr-4">{r.role || "—"}</td>
                    <td className="py-2 pr-4">{r.totalAttendanceDays}</td>
                    <td className="py-2 pr-4">{r.totalLeavesTaken}</td>
                    <td className="py-2">{r.totalWFHDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3 text-sm">
              <div className="text-muted-foreground">Page {page} of {totalPages}</div>
              <div className="space-x-2">
                <button
                  className="px-2 py-1 border rounded disabled:opacity-50"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="px-2 py-1 border rounded disabled:opacity-50"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


