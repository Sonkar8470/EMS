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
  status: "Present" | "Leave"; // From schema enum
  inTime?: string; // HH:mm
  outTime?: string; // HH:mm
  workedHours?: number;
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
      const response = await attendanceAPI.getAttendance(userId, today);
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
      const response = await attendanceAPI.getAllAttendance({ employeeId: userId });
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
          <table className="w-full table-auto text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">In</th>
                <th className="px-3 py-2 text-left">Out</th>
                <th className="px-3 py-2 text-left">Working Hours</th>
                <th className="px-3 py-2 text-left">Day Type</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center">
                    No records
                  </td>
                </tr>
              ) : (
                history.map((r) => (
                  <tr
                    key={String(r.id ?? `${r.employeeId}-${r.date}`)}
                    className="border-t"
                  >
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.inTime ?? "-"}</td>
                    <td className="px-3 py-2">{r.outTime ?? "-"}</td>
                    <td className="px-3 py-2">
                      {r.workedHours ? `${r.workedHours.toFixed(2)}h` : calculateWorkingHoursFromTimes(r.inTime, r.outTime)}
                    </td>
                    <td className="px-3 py-2">
                      {getDayType(r.inTime, r.outTime, r.workedHours)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
