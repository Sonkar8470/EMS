import { useEffect, useState, useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, User, UserCheck, ChevronLeft, ChevronRight, Home, Plane, RefreshCw, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userAPI, attendanceAPI, getSocket } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

// Interfaces based on Mongoose schemas from models folder
interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  mobile: string;
  address?: string;
  displayName: ReactNode;
  firstName?: string;
  lastName?: string;
  position?: string;
  id?: string; // For frontend compatibility
}

interface AttendanceRecord {
  _id?: string;
  employeeId: string; // ObjectId as string
  date: string; // YYYY-MM-DD
  status: "Present" | "Absent" | "Leave" | "WFH" | "Holiday" | "W/O"; // Extended for admin view
  inTime?: string;
  outTime?: string;
  workedHours?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  userId?: number; // For backward compatibility
  id?: string; // For frontend compatibility
  holidayName?: string; // Fixed holiday display name
}

export default function Attendance() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [attendanceStats, setAttendanceStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    wfhDays: 0,
    holidayDays: 0,
    attendancePercentage: 0
  });
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Users and filter employees
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingEmployees(true);
        const response = await userAPI.getAllUsers();
        const data = response.data;
        setUsers(data);
        // Filter to show only employees (not admins) and map _id to id
        const employeeUsers = data
          .filter((user: User) => user.role === 'employee')
          .map((user: User) => ({
            ...user,
            id: user.id || user._id, // Use id if available, otherwise use _id
            displayName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          }));
        setEmployees(employeeUsers);
        // Auto-select first employee if none selected
        if (!selectedEmployeeId && employeeUsers.length > 0) {
          const firstId = (employeeUsers[0].id || employeeUsers[0]._id || '').toString();
          setSelectedEmployeeId(firstId);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setErrorMessage("Failed to fetch employees. Please try again.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch employees. Please try again.",
        });
      } finally {
        setLoadingEmployees(false);
      }
    };
    
    fetchUsers();
  }, [toast, selectedEmployeeId]);

  // Fetch Attendance for selected employee and current month
  const fetchAttendance = useCallback(async () => {
    if (!selectedEmployeeId) {
      setAttendance([]);
      return;
    }

    try {
      setIsRefreshing(true);
      setLoadingAttendance(true);
      setErrorMessage(null);
      
      // Get start and end of current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const response = await attendanceAPI.getAllAttendance({
        employeeId: selectedEmployeeId,
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      });
      
      const data = (Array.isArray(response.data) ? response.data : []) as AttendanceRecord[];

      // Normalize dates to YYYY-MM-DD and ensure matching employee
      const normalize = (d: string) => d.slice(0, 10);
      const records = data
        .filter(r => r.employeeId === selectedEmployeeId || (r.userId && r.userId === parseInt(selectedEmployeeId)))
        .map(r => ({ ...r, date: normalize(r.date) }));
      
      setAttendance(records);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setErrorMessage("Failed to fetch attendance. Please try again.");
      setAttendance([]);
    } finally {
      setIsRefreshing(false);
      setLoadingAttendance(false);
    }
  }, [selectedEmployeeId, currentDate]);

  // Initial fetch when employee is selected
  useEffect(() => {
    if (selectedEmployeeId) {
      fetchAttendance();
    }
  }, [selectedEmployeeId, currentDate, fetchAttendance]);

  // Live updates from Socket.IO for admin changes
  useEffect(() => {
    try {
      const socket = getSocket();
      const onUpdate = () => {
        // Always refetch for admin screen
        fetchAttendance();
      };
      socket.on("attendanceUpdated", onUpdate);
      socket.on("holidayUpdated", onUpdate);
      return () => {
        socket.off("attendanceUpdated", onUpdate);
        socket.off("holidayUpdated", onUpdate);
      };
    } catch (err) {
      console.warn("Socket not initialized:", err);
    }
  }, [fetchAttendance]);

  // Removed polling in favor of manual refresh (and future WebSocket updates)

  // Calculate attendance statistics
  useEffect(() => {
    if (!selectedEmployeeId) {
      setAttendanceStats({
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        wfhDays: 0,
        holidayDays: 0,
        attendancePercentage: 0
      });
      return;
    }

    // Helpers for working-day detection
    const isSunday = (d: Date) => d.getDay() === 0;
    const isSecondOrFourthSaturday = (d: Date) => {
      if (d.getDay() !== 6) return false;
      const occ = Math.ceil(d.getDate() / 7);
      return occ === 2 || occ === 4;
    };
    // Build a quick lookup by date
    const byDate = new Map<string, AttendanceRecord>();
    for (const r of attendance) byDate.set(r.date, r);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    const today = new Date();

    let presentDays = 0;
    let leaveDays = 0;
    let wfhDays = 0;
    let holidayDays = 0;
    let absentMarkedDays = 0;
    

    for (const r of attendance) {
      const status = r.status.toLowerCase();
      if (status === "present") {
        presentDays += 1;
        
      } else if (status === "leave") {
        leaveDays += 1;
      } else if (status === "wfh") {
        wfhDays += 1;
      } else if (status === "holiday") {
        holidayDays += 1;
      } else if (status === "absent") {
        absentMarkedDays += 1;
      }
    }

    let workingDaysInMonth = 0;
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const weekend = isSunday(d) || isSecondOrFourthSaturday(d);
      const isFuture = d > today;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const rec = byDate.get(dateStr);
      const isHoliday = rec?.status?.toLowerCase() === 'holiday';
      const isWO = rec?.status?.toLowerCase() === 'w/o' || weekend;
      if (!isWO && !isHoliday) {
        if (!isFuture) workingDaysInMonth += 1;
        // Do not infer Absent for missing past working days
      }
    }

    const absentDays = absentMarkedDays; // Only count days explicitly marked Absent
    const totalWorkingDays = workingDaysInMonth;
    const attendancePercentage = totalWorkingDays > 0 ? Math.round(((presentDays + wfhDays) / totalWorkingDays) * 100) : 0;

    setAttendanceStats({
      totalDays: attendance.length,
      presentDays,
      absentDays,
      leaveDays,
      wfhDays,
      holidayDays,
      attendancePercentage
    });

  }, [attendance, selectedEmployeeId, currentDate]);

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getAttendanceForDate = (day: number) => {
    if (!day) return null;
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const rec = attendance.find(record => record.date === dateString);
    const today = new Date();
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (!rec && d > today) return null;
    return rec || null;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "present":
        return "bg-green-500 text-white";
      case "absent":
        return "bg-red-500 text-white";
      case "leave":
        return "bg-yellow-500 text-white";
      case "wfh":
        return "bg-blue-500 text-white";
      case "holiday":
        return "bg-purple-500 text-white";
      case "w/o":
        return "bg-gray-500 text-white";

      default:
        return "bg-gray-100 text-gray-600 hover:bg-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "present":
        return <UserCheck className="h-3 w-3" />;
      case "absent":
        return <XCircle className="h-3 w-3" />;
      case "leave":
        return <Plane className="h-3 w-3" />;
      case "wfh":
        return <Home className="h-3 w-3" />;
      case "holiday":
        return <CalendarIcon className="h-3 w-3" />;
      case "w/o":
        return <CalendarIcon className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Edit and Delete functions (same as before)
  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };

  const saveEditedRecord = async () => {
    if (!editingRecord) return;

    try {
      if (editingRecord._id) {
        await attendanceAPI.updateAttendance(editingRecord._id, editingRecord);
      } else {
        await attendanceAPI.createAttendance({
          employeeId: selectedEmployeeId,
          date: editingRecord.date,
          status: editingRecord.status,
          inTime: editingRecord.inTime,
          outTime: editingRecord.outTime,
        });
      }
      
      toast({
        variant: "success",
        title: "Update Successful",
        description: "Attendance record has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      fetchAttendance();
    } catch (err) {
      console.error("Error updating record:", err);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Error updating attendance record. Please try again.",
      });
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
        
          <h1 className="text-gray-900 mt-1">Employee Attendance </h1>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border">
        </div>
      </div>

      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select Employee
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label className="mb-2" htmlFor="employee-select">Choose Employee </Label>
            <Input
              placeholder="Search employees..."
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
            />
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger id="employee-select">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter((employee) =>
                    employee.displayName?.toString().toLowerCase().includes(employeeFilter.toLowerCase())
                  )
                  .map((employee) => (
                  <SelectItem key={employee.id || employee._id} value={(employee.id || employee._id || "").toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{employee.displayName}</span>
                      <span className="text-xs text-gray-500">{employee.position || employee.role}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(loadingEmployees) && (
              <p className="text-sm text-gray-500">Loading employees...</p>
            )}
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Present</p>
                    <p className="text-2xl font-bold text-green-600">{attendanceStats.presentDays}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{attendanceStats.absentDays}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Leave</p>
                    <p className="text-2xl font-bold text-yellow-600">{attendanceStats.leaveDays}</p>
                  </div>
                  <Plane className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">WFH</p>
                    <p className="text-2xl font-bold text-blue-600">{attendanceStats.wfhDays}</p>
                  </div>
                  <Home className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Holiday</p>
                    <p className="text-2xl font-bold text-purple-600">{attendanceStats.holidayDays}</p>
                  </div>
                  <CalendarIcon className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            
            
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Attendance %</p>
                    <p className="text-2xl font-bold text-indigo-600">{attendanceStats.attendancePercentage}%</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-bold text-xs">{attendanceStats.attendancePercentage}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Last Updated Indicator */}
          {lastUpdated && (
            <div className="text-center text-sm text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Attendance Calendar - {selectedEmployee.displayName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-[140px] text-center">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchAttendance}
                    disabled={isRefreshing}
                    className="h-8 px-3"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>

                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <UserCheck className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="text-sm font-medium">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <XCircle className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="text-sm font-medium">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Plane className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="text-sm font-medium">Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <Home className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="text-sm font-medium">WFH</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <CalendarIcon className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="text-sm font-medium">Holiday</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
                    <CalendarIcon className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="text-sm font-medium">W/O</span>
                </div>

              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Day headers */}
                {dayNames.map(day => (
                  <div key={day} className="p-1 text-center text-[10px] md:text-xs font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {getDaysInMonth(currentDate).map((day, index) => {
                  const attendanceRecord = day ? getAttendanceForDate(day) : null;
                  const isToday = day && 
                    new Date().getDate() === day && 
                    new Date().getMonth() === currentDate.getMonth() && 
                    new Date().getFullYear() === currentDate.getFullYear();
                  
                  return (
                    <div
                      key={index}
                      className={`
                        aspect-square p-0.5 md:p-0.5 border rounded-md cursor-pointer transition-all duration-200
                        ${day ? 'hover:shadow-md' : ''}
                        ${isToday ? 'ring-2 ring-blue-500' : ''}
                        ${attendanceRecord ? getStatusColor(attendanceRecord.status) : 'bg-white hover:bg-gray-50'}
                      `}
                      onClick={() => {
                        if (!user || user.role !== 'admin' || !day) return;
                        if (attendanceRecord) {
                          // prevent editing fixed holidays (they carry holidayName from backend)
                          if (attendanceRecord.status === 'Holiday' && attendanceRecord.holidayName) return;
                          handleEdit(attendanceRecord);
                        } else {
                          const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          setEditingRecord({
                            _id: "",
                            employeeId: selectedEmployeeId,
                            date: dateString,
                            status: "Absent",
                            inTime: "",
                            outTime: "",
                          } as AttendanceRecord);
                          setIsEditDialogOpen(true);
                        }
                      }}
                    >
                      {day && (
                        <div className="flex flex-col items-center justify-center h-full text-[10px] md:text-xs">
                          <span className={`font-medium ${attendanceRecord ? 'text-inherit' : 'text-gray-900'}`}>
                            {day}
                          </span>
                          {attendanceRecord && (
                            <div className="flex items-center gap-1 mt-1">
                              {getStatusIcon(attendanceRecord.status)}
                              {attendanceRecord.inTime && (
                                <span className="text-[9px] md:text-[10px]">
                                  {attendanceRecord.inTime.slice(0, 5)}
                                </span>
                              )}
                              {attendanceRecord.status === 'Holiday' && attendanceRecord.holidayName && (
                                <span className="text-[9px] md:text-[10px] truncate max-w-[60px]">
                                  {attendanceRecord.holidayName}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {loadingAttendance && (
                <p className="text-sm text-gray-500 mt-3">Loading attendance...</p>
              )}
              {!loadingAttendance && errorMessage && (
                <p className="text-sm text-red-600 mt-3">{errorMessage}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* No Employee Selected Message */}
      {!selectedEmployee && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Employee</h3>
              <p className="text-gray-600">Choose an employee from the dropdown above to view their attendance calendar and statistics.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord?._id ? 'Edit Attendance Record' : 'Create Attendance Record'}</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div>
                <Label>Employee</Label>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {selectedEmployee?.displayName}
                </p>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editingRecord.date}
                  onChange={(e) => setEditingRecord({...editingRecord, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editingRecord.status}
                  onValueChange={(value: "Present" | "Absent" | "Leave" | "WFH" | "Holiday" | "W/O") => setEditingRecord({...editingRecord, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Leave">Leave</SelectItem>
                    <SelectItem value="WFH">WFH</SelectItem>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                    <SelectItem value="W/O">W/O</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(editingRecord.status === "Present" || editingRecord.status === "WFH") && (
                <>
                  <div>
                    <Label>In Time</Label>
                    <Input
                      type="time"
                      value={editingRecord.inTime || ""}
                      onChange={(e) => setEditingRecord({...editingRecord, inTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Out Time</Label>
                    <Input
                      type="time"
                      value={editingRecord.outTime || ""}
                      onChange={(e) => setEditingRecord({...editingRecord, outTime: e.target.value})}
                    />
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-4">
                <Button onClick={saveEditedRecord} className="flex-1">
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingRecord(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}