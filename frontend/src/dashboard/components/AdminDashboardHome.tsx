import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardAPI } from "@/services/api";
import AnnouncementsPanel from "@/components/announcements/AnnouncementsPanel";
import AdminPerformanceTable from "./AdminPerformanceTable";

type OngoingItem = {
  _id: string;
  type: "leave" | "wfh";
  employeeId: { name?: string; email?: string; employeeId?: string } | string;
  startDate: string;
  endDate: string;
  reason?: string;
};

export default function AdminDashboardHome() {
  const [stats, setStats] = useState<{ totalEmployees: number; presentToday: number; pendingLeaveRequests: number; upcomingHoliday: { date: string; holidayName: string } | null } | null>(null);
  const [ongoing, setOngoing] = useState<OngoingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useMemo(() => async () => {
    setLoading(true);
    try {
      const { data } = await dashboardAPI.getAdminSummary();
      setStats(data?.stats || null);
      setOngoing(data?.ongoingOrUpcoming || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Employees" value={stats?.totalEmployees ?? 0} />
        <StatCard title="Present Today" value={stats?.presentToday ?? 0} />
        <StatCard title="Pending Requests" value={stats?.pendingLeaveRequests ?? 0} />
        <StatCard title="Upcoming Holiday" value={stats?.upcomingHoliday ? `${new Date(stats.upcomingHoliday.date).toLocaleDateString()} • ${stats.upcomingHoliday.holidayName}` : "—"} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Employees on leave</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : ongoing.length === 0 ? (
              <div className="text-muted-foreground">No upcoming or ongoing leave/WFH</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 pr-4">Employee</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Dates</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ongoing.map((l) => {
                      const emp = typeof l.employeeId === "string" ? undefined : l.employeeId;
                      const start = new Date(l.startDate)
                      const end = new Date(l.endDate)
                      return (
                        <tr key={l._id} className="border-t">
                          <td className="py-2 pr-4">{emp?.name || "-"}</td>
                          <td className="py-2 pr-4">{l.type === "wfh" ? "WFH" : "Leave"}</td>
                          <td className="py-2 pr-4">{start.toLocaleDateString()} - {end.toLocaleDateString()}</td>
                          <td className="py-2">{l.reason || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <AdminPerformanceTable />
      </div>

      <AnnouncementsPanel variant="admin" />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}


