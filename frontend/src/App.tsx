import { Routes, Route } from "react-router-dom";
import { LoginPage, SignUpPage } from "./Login&Signpage";
import Page from "./dashboard/Mainpage";
import EmployeeTable from "./components/EmployeeTable";
// removed unused admin demo imports
import Attendance from "./components/Attendence";
import EmployeeDashboard from "./components/Employee/EmployeeDashboard";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";
//
import { useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import MyAttendanceCalendar from "./components/Employee/MyAttendance";
import EmployeeAttendance from "./components/Employee/EmployeeAttendance";
import EmployeeDashboardHome from "./components/Employee/EmployeeDashboardHome";
import LeaveManagement from "./components/Employee/LeaveManagement";
import WFH from "./components/Employee/WFH";
import SalaryStructure from "./components/Employee/SalaryStructure";
import MyProfile from "./components/Employee/MyProfile";
import CompanyHolidayCalendar from "@/components/CompanyHolidayCalendar";
import AdminApplications from "@/components/Employee/AdminApplications";
import AdminDashboardHome from "./dashboard/components/AdminDashboardHome";

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Page />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardHome />} />
          <Route path="addemployee" element={<EmployeeTable />} />
          <Route path="attendence" element={<Attendance />} />
          <Route path="company-holidays" element={<CompanyHolidayCalendar />} />
          <Route path="applications" element={<AdminApplications />} />
        </Route>
        <Route
          path="/employee-dashboard"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<EmployeeDashboardHome />} />
          <Route path="attendance" element={<MyAttendanceCalendar />} />
          <Route path="mark-attendance" element={<EmployeeAttendance />} />
          <Route path="leaves" element={<LeaveManagement />} />
          <Route path="wfh" element={<WFH />} />
          <Route path="salary" element={<SalaryStructure />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="company-holidays" element={<CompanyHolidayCalendar />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// removed deprecated DashboardContent

export default App;
