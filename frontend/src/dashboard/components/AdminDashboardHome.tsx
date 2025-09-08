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
  const [stats, setStats] = useState<{
    totalEmployees: number;
    presentToday: number;
    pendingLeaveRequests: number;
    upcomingHoliday: { date: string; holidayName: string } | null;
  } | null>(null);
  const [ongoing, setOngoing] = useState<OngoingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useMemo(
    () => async () => {
      setLoading(true);
      try {
        const { data } = await dashboardAPI.getAdminSummary();
        setStats(data?.stats || null);
        setOngoing(data?.ongoingOrUpcoming || []);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Employees" value={stats?.totalEmployees ?? 0} />
        <StatCard title="Present Today" value={stats?.presentToday ?? 0} />
        <StatCard
          title="Pending Requests"
          value={stats?.pendingLeaveRequests ?? 0}
        />
        <StatCard
          title="Upcoming Holiday"
          value={
            stats?.upcomingHoliday
              ? `${new Date(
                  stats.upcomingHoliday.date
                ).toLocaleDateString()} • ${stats.upcomingHoliday.holidayName}`
              : "—"
          }
        />
      </div>

      <div className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
            <CardTitle className="text-base sm:text-lg">
              Employees on leave
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {loading ? (
              <div className="text-sm sm:text-base">Loading...</div>
            ) : ongoing.length === 0 ? (
              <div className="text-muted-foreground text-sm sm:text-base">
                No upcoming or ongoing leave/WFH
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="block sm:hidden">
                  {/* Mobile view - cards */}
                  <div className="space-y-3">
                    {ongoing.map((l) => {
                      const emp =
                        typeof l.employeeId === "string"
                          ? undefined
                          : l.employeeId;
                      const start = new Date(l.startDate);
                      const end = new Date(l.endDate);
                      return (
                        <div
                          key={l._id}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div className="font-medium text-sm">
                              {emp?.name || "-"}
                            </div>
                            <div className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {l.type === "wfh" ? "WFH" : "Leave"}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600">
                            {start.toLocaleDateString()} -{" "}
                            {end.toLocaleDateString()}
                          </div>
                          {l.reason && (
                            <div className="text-xs text-gray-500">
                              {l.reason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="hidden sm:block">
                  {/* Desktop view - table */}
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="py-2 pr-4">Employee</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Dates</th>
                        <th className="py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ongoing.map((l) => {
                        const emp =
                          typeof l.employeeId === "string"
                            ? undefined
                            : l.employeeId;
                        const start = new Date(l.startDate);
                        const end = new Date(l.endDate);
                        return (
                          <tr key={l._id} className="border-t">
                            <td className="py-2 pr-4">{emp?.name || "-"}</td>
                            <td className="py-2 pr-4">
                              {l.type === "wfh" ? "WFH" : "Leave"}
                            </td>
                            <td className="py-2 pr-4">
                              {start.toLocaleDateString()} -{" "}
                              {end.toLocaleDateString()}
                            </td>
                            <td className="py-2">{l.reason || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
      <CardHeader className="px-2 sm:px-6 py-2 sm:py-6">
        <CardTitle className="text-xs sm:text-sm text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6 pb-2 sm:pb-6">
        <div className="text-lg sm:text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
