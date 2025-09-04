import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { leaveAPI, getSocket } from "@/services/api";
import type { AxiosError } from "axios";

export default function LeaveManagement() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  type LeaveHistoryItem = {
    action: "approved" | "rejected";
    adminId?: { name?: string; email?: string; employeeId?: string } | string;
    date: string;
  };

  type LeaveRow = {
    _id: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: "pending" | "approved" | "rejected";
    history?: LeaveHistoryItem[];
  };

  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLeaves = useMemo(() => async () => {
    setLoading(true);
    try {
      const { data } = await leaveAPI.myLeaves();
      setLeaves((data || []) as LeaveRow[]);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Failed to load leaves" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLeaves();
    const socket = getSocket();
    const onLeaveUpdated = () => loadLeaves();
    socket.on("leaveUpdated", onLeaveUpdated);
    return () => {
      socket.off("leaveUpdated", onLeaveUpdated);
    };
  }, [loadLeaves]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      toast({ variant: "destructive", title: "Fill all fields" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await leaveAPI.applyLeave({ startDate, endDate, reason });
      toast({ title: data?.message || "Leave applied", description: "Waiting for approval" });
      setStartDate("");
      setEndDate("");
      setReason("");
      loadLeaves();
    } catch (err) {
      console.error("applyLeave error:", err);
      const message = (err as AxiosError<{ message?: string }>).response?.data?.message || "Submission failed";
      toast({ variant: "destructive", title: "Submission failed", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground">Apply for leaves and view leave history.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leave Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Submitting..." : "Apply Leave"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : leaves.length === 0 ? (
              <div className="text-muted-foreground">No leaves yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 pr-4">Dates</th>
                      <th className="py-2 pr-4">Reason</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l._id} className="border-t">
                        <td className="py-2 pr-4">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">{l.reason}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${l.status === "approved" ? "bg-green-100 text-green-700" : l.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
