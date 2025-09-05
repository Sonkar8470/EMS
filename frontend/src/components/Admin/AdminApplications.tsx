import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { leaveAPI } from "@/services/api";

type Application = {
  _id: string;
  employeeId: { name: string; email: string; employeeId?: string } | string;
  reason: string;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected";
  type: "leave" | "wfh";
  history?: Array<{
    action: "approved" | "rejected";
    adminId?: { name?: string; email?: string; employeeId?: string } | string;
    date: string;
  }>;
};

export default function AdminApplications() {
  const [activeTab, setActiveTab] = useState<"leave" | "wfh">("leave");
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useMemo(() => async () => {
    setLoading(true);
    try {
      const fn = activeTab === "leave" ? leaveAPI.adminAllLeaves : leaveAPI.adminAllWFH;
      const { data } = await fn();
      setRows(data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setUpdatingId(id);
    try {
      if (activeTab === "leave") {
        await leaveAPI.adminUpdateLeaveStatus(id, status);
      } else {
        await leaveAPI.adminUpdateWFHStatus(id, status);
      }
      await load();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Button variant={activeTab === "leave" ? "default" : "secondary"} onClick={() => setActiveTab("leave")}>Leave Applications</Button>
        <Button variant={activeTab === "wfh" ? "default" : "secondary"} onClick={() => setActiveTab("wfh")}>WFH Applications</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{activeTab === "leave" ? "Leave" : "WFH"} Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground">No applications</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pr-4">Employee</th>
                    <th className="py-2 pr-4">Reason</th>
                    <th className="py-2 pr-4">Dates</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const emp = typeof r.employeeId === "string" ? undefined : r.employeeId;
                    return (
                      <>
                        <tr key={r._id} className="border-t">
                          <td className="py-2 pr-4">{emp?.name || "-"}</td>
                          <td className="py-2 pr-4">{r.reason}</td>
                          <td className="py-2 pr-4">{new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded text-xs ${r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 flex gap-2">
                            <Button size="sm" disabled={updatingId === r._id || r.status !== "pending"} onClick={() => updateStatus(r._id, "approved")}>Approve</Button>
                            <Button size="sm" variant="destructive" disabled={updatingId === r._id || r.status !== "pending"} onClick={() => updateStatus(r._id, "rejected")}>Reject</Button>
                          </td>
                        </tr>
                      
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


