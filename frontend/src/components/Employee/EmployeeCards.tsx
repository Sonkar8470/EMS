import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IconCalendar, IconHome, IconUser } from "@tabler/icons-react"
import { dashboardAPI, getSocket, holidaysAPI } from "@/services/api"
import { useAuth } from "@/hooks/useAuth"

interface DashboardStats {
  presentDays: number
  leaveDays: number
  wfhDays: number
  avgHours: number
}
type UpcomingHoliday = { id: string; date: string; holidayName: string; day?: string }

export default function EmployeeCards() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    presentDays: 0,
    leaveDays: 0,
    wfhDays: 0,
    avgHours: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [holidays, setHolidays] = useState<UpcomingHoliday[]>([])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await dashboardAPI.getEmployeeStats()
      const { presentDays, leaveDays, wfhDays, avgHours } = response?.data || {}
      setStats({
        presentDays: Number(presentDays) || 0,
        leaveDays: Number(leaveDays) || 0,
        wfhDays: Number(wfhDays) || 0,
        avgHours: Number(avgHours) || 0,
      })
      // Fetch upcoming holidays
      const { data: up } = await holidaysAPI.upcoming(3)
      const normalized: UpcomingHoliday[] = (up || []).map((h: any) => ({
        id: h.id,
        date: typeof h.date === "string" ? h.date : new Date(h.date).toISOString(),
        holidayName: h.holidayName,
        day: h.day,
      }))
      setHolidays(normalized)
    } catch (err: unknown) {
      console.error("Error fetching dashboard stats:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch stats")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    try {
      const socket = getSocket()
      const onAttendance = (data: unknown) => {
        console.log("📢 attendanceUpdated event received:", data)
        fetchStats()
      }
      const onEmployee = () => {
        fetchStats()
      }
      socket.on("attendanceUpdated", onAttendance)
      socket.on("employeeUpdated", onEmployee)
      return () => {
        socket.off("attendanceUpdated", onAttendance)
        socket.off("employeeUpdated", onEmployee)
      }
    } catch {
      // Socket connection failed, continue without real-time updates
    }

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    
    return () => clearInterval(interval)
  }, [user])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-red-200 bg-red-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-red-500">{error}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-2 sm:px-6 py-2 sm:py-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Present Days</CardTitle>
          <IconUser className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-2 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold">{Number(stats.presentDays) || 0}</div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-2 sm:px-6 py-2 sm:py-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Leave Days</CardTitle>
          <IconCalendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-2 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold">{Number(stats.leaveDays) || 0}</div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-2 sm:px-6 py-2 sm:py-6">
          <CardTitle className="text-xs sm:text-sm font-medium">WFH Days</CardTitle>
          <IconHome className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-2 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold">{Number(stats.wfhDays) || 0}</div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-2 sm:px-6 py-2 sm:py-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Average Hours</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-2 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold">{Number(stats.avgHours) || 0}</div>
          <p className="text-xs text-muted-foreground">Avg hours per day</p>
        </CardContent>
      </Card>
    </div>
  )
}
