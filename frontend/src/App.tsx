import { Routes, Route } from "react-router-dom";
import { LoginPage, SignUpPage } from "./Login&Signpage";
import Page from "./dashboard/Mainpage";
import EmployeeTable from "./components/EmployeeTable";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import data from "./dashboard/data.json";
import Attendance from "./components/Attendence";
import EmployeeDashboard from "./components/Employee/EmployeeDashboard";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";
import { type User } from "./contexts/AuthContextInstance";
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

function AppContent() {
  const { user, loading } = useAuth();

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
          <Route index element={<DashboardContent user={user} />} />
          <Route path="addemployee" element={<EmployeeTable />} />
          <Route path="attendence" element={<Attendance />} />
          <Route path="company-holidays" element={<CompanyHolidayCalendar />} />
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

// Dashboard content component
function DashboardContent({ user }: { user: User | null }) {
  if (!user) return <div className="p-4">Loading...</div>;
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}

export default App;
