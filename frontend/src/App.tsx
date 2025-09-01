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
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import MyAttendanceCalendar from "./components/Employee/MyAttendance";

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
        </Route>
        <Route
          path="/employee-dashboard"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/employee-dashboard/attendance" element={<MyAttendanceCalendar />} />
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
function DashboardContent({ user }: { user: any }) {
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
