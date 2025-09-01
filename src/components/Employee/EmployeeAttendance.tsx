import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

const API_ATTENDANCE = "http://localhost:3001/api/attendances";

export default function EmployeeAttendance({ employeeId }: { employeeId?: string }) {
  const { toast } = useToast();
  // ✅ Get logged-in user from localStorage (token is in HTTP-only cookies)
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId: string | undefined = employeeId || loggedInUser?.id || loggedInUser?._id;
  


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

  // Calculate working hours and checkout eligibility
  const calculateWorkingHours = () => {
    if (!todayRecord?.inTime) return { canCheckout: false, hoursWorked: 0, minutesRemaining: 0 };
    
    const now = currentTime; // Use currentTime state for real-time updates
    const today = now.toISOString().split('T')[0];
    const [inHour, inMinute] = todayRecord.inTime.split(':').map(Number);
    const checkInTime = new Date(today);
    checkInTime.setHours(inHour, inMinute, 0, 0);
    
    const timeDiff = now.getTime() - checkInTime.getTime();
    const hoursWorked = timeDiff / (1000 * 60 * 60);
    const minutesWorked = timeDiff / (1000 * 60);
    
    const requiredHours = 9; // 9 hours working requirement
    const canCheckout = hoursWorked >= requiredHours;
    const minutesRemaining = Math.max(0, (requiredHours * 60) - minutesWorked);
    
    return { canCheckout, hoursWorked, minutesRemaining };
  };

  const { canCheckout, hoursWorked, minutesRemaining } = calculateWorkingHours();
  const hasCheckedIn = !!todayRecord?.inTime;
  const hasCheckedOut = !!todayRecord?.outTime;

  // ✅ Fetch today's attendance
  const loadToday = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(
      `${API_ATTENDANCE}?employeeId=${userId}&date=${today}`,
      { 
        credentials: "include", // Include cookies automatically
        headers: { "Content-Type": "application/json" }
      }
    );
    const data: AttendanceRecord[] = await res.json();
    setTodayRecord(data[0] ?? null);
  }, [userId, today]);

  // ✅ Fetch history
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(
      `${API_ATTENDANCE}?employeeId=${userId}&_sort=date&_order=desc&_limit=30`,
      { 
        credentials: "include", // Include cookies automatically
        headers: { "Content-Type": "application/json" }
      }
    );
    const data: AttendanceRecord[] = await res.json();
    setHistory(data);
  }, [userId]);

  // Update current time every minute for real-time working hours display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Auto checkout when 9 hours are completed
  useEffect(() => {
    if (hasCheckedIn && !hasCheckedOut && canCheckout) {
      const autoCheckout = async () => {
        try {
          console.log("Auto checkout triggered - 9 hours completed");
          toast({
            variant: "default",
            title: "Working Hours Complete!",
            description: "You have completed 9 hours of work. Auto-checking out in 2 seconds...",
          });
          await handleCheckOut();
        } catch (error) {
          console.error("Auto checkout failed:", error);
        }
      };
      
      // Small delay to ensure user sees the completion
      const timeoutId = setTimeout(autoCheckout, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [hasCheckedIn, hasCheckedOut, canCheckout]);

  // Notification when approaching 9-hour mark (at 8.5 hours)
  useEffect(() => {
    if (hasCheckedIn && !hasCheckedOut && hoursWorked >= 8.5 && hoursWorked < 9) {
      toast({
        variant: "default",
        title: "Almost There!",
        description: "You're approaching the 9-hour mark. You'll be able to check out soon!",
      });
    }
  }, [hasCheckedIn, hasCheckedOut, hoursWorked]);

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
    } catch (error) {
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
        employeeId: userId,
        date: today,
        status: "Present",
        inTime: currentTime,
        location: { in: loc },
        outTime: todayRecord?.outTime
      };

      console.log("Checkin Payload:", payload);

      let response;
      if (todayRecord?.id) {
        // Validate that we have a valid record ID
        if (!todayRecord.id || todayRecord.id === 'undefined') {
          throw new Error("Invalid record ID. Please try again.");
        }
        
        // Update existing record
        response = await fetch(`${API_ATTENDANCE}/${todayRecord.id}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new record
        response = await fetch(API_ATTENDANCE, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
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

      // Validate that we have a valid record ID
      if (!todayRecord.id) {
        throw new Error("No valid record ID found. Please try checking in again.");
      }

      // Create payload for checkout update
      const payload = {
        employeeId: userId,
        date: today,
        status: "Present",
        inTime: todayRecord.inTime,
        outTime: currentTime,
        location: { 
          ...(todayRecord?.location ?? {}), 
          out: loc 
        },
        workedHours: todayRecord.workedHours
      };

      console.log("Checkout Payload:", payload);

      // Update the existing record
      const response = await fetch(`${API_ATTENDANCE}/${todayRecord.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedRecord = await response.json();
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
                 <span className={canCheckout ? "text-green-600" : "text-orange-600"}>
                   {hoursWorked.toFixed(2)}h
                 </span>
                 {!canCheckout && (
                   <span className="text-muted-foreground ml-2">
                     ({(minutesRemaining / 60).toFixed(2)}h remaining for checkout)
                   </span>
                 )}
               </div>
             )}
           <div className="flex flex-wrap gap-3">
            <Button onClick={handleCheckIn} disabled={loading || hasCheckedIn}>
              {hasCheckedIn ? `Checked in at ${todayRecord?.inTime}` : "Check In"}
            </Button>
                         <Button
               onClick={handleCheckOut}
               disabled={loading || !hasCheckedIn || hasCheckedOut || !canCheckout}
               variant="secondary"
             >
                                                               {hasCheckedOut
                   ? `Checked out at ${todayRecord?.outTime}`
                   : !canCheckout
                   ? `Check Out (${(minutesRemaining / 60).toFixed(2)}h remaining)`
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
