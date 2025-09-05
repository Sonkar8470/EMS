import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { attendanceAPI } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

type GeoPoint = { latitude: number; longitude: number };

// Interface based on Mongoose attendance schema from models folder
interface AttendanceRecord {
  _id: string;
  id?: string; // For frontend compatibility
  employeeId: string; // ObjectId as string
  date: string; // YYYY-MM-DD
  status: "Present" | "Absent" | "Leave" | "WFH" | "Holiday" | "W/O"; // From schema enum
  inTime?: string; // HH:mm
  outTime?: string; // HH:mm
  workedHours?: number;
  holidayName?: string; // For holiday records
  location?: {
    in?: GeoPoint;
    out?: GeoPoint;
  };
}

export default function EmployeeAttendance({ employeeId }: { employeeId?: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const userId: string | undefined = employeeId || user?._id;
  


  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const timeNow = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // Calculate working hours (no restriction on checkout time)
  const calculateWorkingHours = () => {
    if (!todayRecord?.inTime) return { canCheckout: true, hoursWorked: 0, minutesRemaining: 0 };
    
    const now = currentTime; // Use currentTime state for real-time updates
    const today = now.toISOString().split('T')[0];
    const [inHour, inMinute] = todayRecord.inTime.split(':').map(Number);
    const checkInTime = new Date(today);
    checkInTime.setHours(inHour, inMinute, 0, 0);
    
    const timeDiff = now.getTime() - checkInTime.getTime();
    const hoursWorked = timeDiff / (1000 * 60 * 60);
    
    // Users can check out anytime after checking in
    const canCheckout = true;
    
    return { canCheckout, hoursWorked, minutesRemaining: 0 };
  };

  const { canCheckout, hoursWorked } = calculateWorkingHours();
  const hasCheckedIn = !!todayRecord?.inTime;
  const hasCheckedOut = !!todayRecord?.outTime;

  // ✅ Fetch today's attendance
  const loadToday = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await attendanceAPI.getAttendance(userId, { date: today });
      const data: AttendanceRecord[] = response.data;
      setTodayRecord(data[0] ?? null);
    } catch (error) {
      console.error('Error loading today\'s attendance:', error);
    }
  }, [userId, today]);

  // ✅ Fetch history
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await attendanceAPI.getHistory();
      const data: AttendanceRecord[] = response.data;
      setHistory(data);
    } catch (error) {
      console.error('Error loading attendance history:', error);
    }
  }, [userId]);

  // Update current time every minute for real-time working hours display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);



  useEffect(() => {
    if (!userId) return;
    void loadToday();
    void loadHistory();
  }, [userId, loadToday, loadHistory]);

  // Helper function to calculate working hours from in and out times for history
  const calculateWorkingHoursFromTimes = (inTime?: string, outTime?: string): string => {
    if (!inTime || !outTime) return "-";
    
    try {
      const [inHour, inMinute] = inTime.split(':').map(Number);
      const [outHour, outMinute] = outTime.split(':').map(Number);
      
      const inDate = new Date();
      inDate.setHours(inHour, inMinute, 0, 0);
      
      const outDate = new Date();
      outDate.setHours(outHour, outMinute, 0, 0);
      
      // If checkout is before checkin, assume it's the next day
      if (outDate < inDate) {
        outDate.setDate(outDate.getDate() + 1);
      }
      
      const diffMs = outDate.getTime() - inDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return `${diffHours.toFixed(2)}h`;
    } catch {
      return "-";
    }
  };

  // Helper function to determine if it's a full or half day
  const getDayType = (inTime?: string, outTime?: string, workedHours?: number): string => {
    if (!inTime || !outTime) return "-";
    
    // If workedHours is provided, use it; otherwise calculate
    let hours = workedHours;
    if (hours === undefined) {
      const hoursStr = calculateWorkingHoursFromTimes(inTime, outTime);
      if (hoursStr === "-") return "-";
      hours = parseFloat(hoursStr.replace('h', ''));
    }
    
    if (hours >= 8) return "Full Day";
    if (hours >= 4) return "Half Day";
    return "Short Day";
  };

  const getLocation = (): Promise<GeoPoint> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  // ✅ Check In
  async function handleCheckIn() {
    if (!userId) return;
    try {
      setLoading(true);
      if (todayRecord?.inTime) {
        toast({
          variant: "destructive",
          title: "Already Checked In",
          description: "You have already checked in for today.",
        });
        return;
      }

      const loc = await getLocation();
      const currentTime = timeNow();
      
      console.log("Checkin Debug:", {
        userId,
        today,
        currentTime,
        location: loc
      });

      const payload = {
        inTime: currentTime,
        location: { latitude: loc.latitude, longitude: loc.longitude }
      };

      console.log("Checkin Payload:", payload);

      // Use the checkin endpoint directly
      const response = await attendanceAPI.checkIn(payload);
      const result = response.data;
      
      console.log("Checkin Response:", result);

      await loadToday();
      await loadHistory();
      toast({
        variant: "success",
        title: "Check-in Successful",
        description: `You have successfully checked in at ${currentTime}.`,
      });
    } catch (e: unknown) {
      console.error("Checkin Error:", e);
      const message = e instanceof Error ? e.message : String(e);
      toast({
        variant: "destructive",
        title: "Check-in Failed",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }

  // ✅ Check Out
  async function handleCheckOut() {
    if (!userId) return;
    try {
      setLoading(true);
      if (!todayRecord?.inTime) {
        toast({
          variant: "destructive",
          title: "Check-in Required",
          description: "You need to check in before you can check out.",
        });
        return;
      }
      if (todayRecord?.outTime) {
        toast({
          variant: "destructive",
          title: "Already Checked Out",
          description: "You have already checked out for today.",
        });
        return;
      }

      // Check if 9 hours have passed (unless it's automatic checkout)
      const isAutoCheckout = canCheckout;
      if (!isAutoCheckout) {
                 toast({
           variant: "destructive",
           title: "Working Hours Not Complete",
           description: `You need to work for 9 hours before checking out. You have worked ${hoursWorked.toFixed(2)}h so far.`,
         });
        return;
      }

      const loc = await getLocation();
      const currentTime = timeNow();
      
      console.log("Checkout Debug:", {
        todayRecord,
        recordId: todayRecord.id,
        outTime: currentTime,
        location: loc
      });

      // Use the checkout endpoint directly
      const payload = {
        outTime: currentTime,
        location: { latitude: loc.latitude, longitude: loc.longitude }
      };

      console.log("Checkout Payload:", payload);

      // Use the checkout endpoint
      const response = await attendanceAPI.checkOut(payload);
      const updatedRecord = response.data;
      console.log("Checkout Response:", updatedRecord);

      // Refresh the data
      await loadToday();
      await loadHistory();
      
             toast({
         variant: "success",
         title: "Check-out Successful",
         description: `You have successfully checked out at ${currentTime} after completing 9 hours of work.`,
       });
    } catch (e: unknown) {
      console.error("Checkout Error:", e);
      const message = e instanceof Error ? e.message : String(e);
      toast({
        variant: "destructive",
        title: "Check-out Failed",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }



  if (!userId) {
    return (
      <div className="p-4 text-red-500">
        No logged-in user found. Please log in.
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 grid gap-4">
      {/* Today's Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Today’s Attendance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
                     <div className="text-sm text-muted-foreground">Date: {today}</div>
                                               {hasCheckedIn && !hasCheckedOut && (
               <div className="text-sm">
                 <span className="font-medium">Working Hours: </span>
                 <span className="text-green-600">
                   {hoursWorked.toFixed(2)}h
                 </span>
               </div>
             )}
           <div className="flex flex-wrap gap-3">
            <Button onClick={handleCheckIn} disabled={loading || hasCheckedIn}>
              {hasCheckedIn ? `Checked in at ${todayRecord?.inTime}` : "Check In"}
            </Button>
                         <Button
               onClick={handleCheckOut}
               disabled={loading || !hasCheckedIn || hasCheckedOut}
               variant="secondary"
             >
               {hasCheckedOut
                 ? `Checked out at ${todayRecord?.outTime}`
                 : "Check Out"}
             </Button>
          </div>
          {todayRecord?.location?.in && (
            <div className="text-sm">
              In-location: {todayRecord.location.in.latitude.toFixed(4)},{" "}
              {todayRecord.location.in.longitude.toFixed(4)}
            </div>
          )}
          {todayRecord?.location?.out && (
            <div className="text-sm">
              Out-location: {todayRecord.location.out.latitude.toFixed(4)},{" "}
              {todayRecord.location.out.longitude.toFixed(4)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent History</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-lg font-medium mb-2">No attendance records found</div>
              <div className="text-sm">Your attendance history will appear here once you start marking attendance.</div>
            </div>
          ) : (
            <table className="w-full table-auto text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">In</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Out</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Working Hours</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Day Type</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr
                    key={String(r.id ?? `${r.employeeId}-${r.date}`)}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'Present' ? 'bg-green-100 text-green-800' :
                        r.status === 'Absent' ? 'bg-red-100 text-red-800' :
                        r.status === 'Leave' ? 'bg-yellow-100 text-yellow-800' :
                        r.status === 'WFH' ? 'bg-blue-100 text-blue-800' :
                        r.status === 'Holiday' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.inTime ?? "-"}</td>
                    <td className="px-4 py-3">{r.outTime ?? "-"}</td>
                    <td className="px-4 py-3">
                      {r.workedHours ? `${r.workedHours.toFixed(2)}h` : calculateWorkingHoursFromTimes(r.inTime, r.outTime)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        getDayType(r.inTime, r.outTime, r.workedHours) === 'Full Day' ? 'bg-green-100 text-green-800' :
                        getDayType(r.inTime, r.outTime, r.workedHours) === 'Half Day' ? 'bg-yellow-100 text-yellow-800' :
                        getDayType(r.inTime, r.outTime, r.workedHours) === 'Short Day' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getDayType(r.inTime, r.outTime, r.workedHours)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
