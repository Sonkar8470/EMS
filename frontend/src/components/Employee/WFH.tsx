import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { leaveAPI, getSocket } from "@/services/api"
import { useAuth } from "@/hooks/useAuth"
import type { AxiosError } from "axios"

export default function WFH() {
  const { toast } = useToast();
  useAuth();
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  type HistoryItem = {
    action: "approved" | "rejected"
    adminId?: { name?: string; email?: string; employeeId?: string } | string
    date: string
  }
  type WFHRow = {
    _id: string
    startDate: string
    endDate: string
    reason: string
    status: "pending" | "approved" | "rejected"
    history?: HistoryItem[]
  }
  const [rows, setRows] = useState<WFHRow[]>([])
  const [loading, setLoading] = useState(false)

  const load = useMemo(() => async () => {
    setLoading(true)
    try {
      const { data } = await leaveAPI.myWFH()
      setRows((data || []) as WFHRow[])
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Failed to load WFH history" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
    const socket = getSocket()
    const onWFHUpdated = () => load()
    socket.on("wfhUpdated", onWFHUpdated)
    return () => {
      socket.off("wfhUpdated", onWFHUpdated)
    }
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!startDate || !endDate || !reason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const { data } = await leaveAPI.applyWFH({ startDate, endDate, reason });

      toast({
        title: data?.message || "WFH Request Submitted",
        description: "Your work from home request has been submitted for approval.",
      })
      
      // Reset form
      setStartDate("")
      setEndDate("")
      setReason("")
      load()
    } catch (error) {
      console.error("WFH request error:", error);
      const message = (error as AxiosError<{ message?: string }>).response?.data?.message ||
        "Failed to submit WFH request. Please try again."
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Work From Home Request</CardTitle>
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
              <Textarea id="reason" placeholder="Please provide a reason for your WFH request..." value={reason} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)} required />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Submitting..." : "Submit Request"}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>WFH History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground">No WFH applications yet</div>
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
                  {rows.map((r) => (
                    <tr key={r._id} className="border-t">
                      <td className="py-2 pr-4">{new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">{r.reason}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {r.status}
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
  )
}
