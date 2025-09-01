import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import EmployeeAttendance from "@/components/Employee/EmployeeAttendance";
import EmployeeCards from "@/components/Employee/EmployeeCards";
import EmployeeCharts from "@/components/Employee/EmployeeCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconCalendar,
  IconHome,
  IconBone,
  IconLogout,
} from "@tabler/icons-react";
import { Outlet, useLocation,  } from "react-router-dom";
import WFH from "./WFH";


// Fetch attendance stats from API instead of hardcoding

interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  [key: string]: any; // Allow additional properties
}

export default function EmployeeDashboard() {
  const location = useLocation();
  

  const isRootDashboard = location.pathname === "/employee-dashboard";
  const [employee, setEmployee] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
 

  useEffect(() => {
    const loggedInUser = localStorage.getItem("user");
    if (loggedInUser) {
      const parsedUser = JSON.parse(loggedInUser) as User;
      setEmployee(parsedUser);
    }
  }, []);

  const handleLogout = async () => {
    try {
      // Call the logout API endpoint to clear cookies
      const response = await fetch("http://localhost:3001/api/users/logout", {
        method: "POST",
        credentials: "include", // Important for cookies
      });
      
      if (response.ok) {
        // Clear user from localStorage
        localStorage.removeItem("user");
        // Redirect to login page
        window.location.href = "/login";
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  if (!employee) {
    return <p>Loading...</p>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back, {employee.name}!
              </h1>
              <p className="text-muted-foreground">
                Here's what's happening with your account today.
              </p>
            </div>

            <EmployeeCards  />

            <div className="grid gap-6 md:grid-cols-2">
                             <EmployeeCharts employeeId={employee.id || employee._id || ""} />

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setActiveTab("attendance")}
                  >
                    <IconCalendar className="mr-2 h-4 w-4" />
                    Mark Attendance
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setActiveTab("wfh")}
                  >
                    <IconHome className="mr-2 h-4 w-4" />
                    Request WFH
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setActiveTab("leaves")}
                  >
                    <IconCalendar className="mr-2 h-4 w-4" />
                    Apply Leave
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setActiveTab("salary")}
                  >
                    <IconBone className="mr-2 h-4 w-4" />
                    View Salary
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "attendance":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Attendance Management</h1>
                <p className="text-muted-foreground">
                  Track your daily attendance and view history.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveTab("dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
            <EmployeeAttendance employeeId={employee.id || employee._id} />
          </div>
        );

      case "wfh":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Work From Home</h1>
                <p className="text-muted-foreground">
                  Request and manage work from home days.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveTab("dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
            <div>
                             <WFH employeeId={employee.id || employee._id || ""} />
            </div>
          </div>
        );

      case "leaves":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Leave Management</h1>
                <p className="text-muted-foreground">
                  Apply for leaves and view leave history.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveTab("dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Leave Application</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Leave application functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case "salary":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Salary Structure</h1>
                <p className="text-muted-foreground">
                  View your salary details and payslips.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveTab("dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Salary Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Salary information will be displayed here.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case "profile":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">My Profile</h1>
                <p className="text-muted-foreground">
                  View and update your profile information.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveTab("dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <p className="text-sm text-muted-foreground">
                      {employee.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">
                      {employee.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <p className="text-sm text-muted-foreground">
                      {employee.role}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Employee ID</label>
                                         <p className="text-sm text-muted-foreground">
                       {employee.id || employee._id || "N/A"}
                     </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p>Select a menu item to get started.</p>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
                 <AppSidebar user={employee as any} />
        <div className="flex flex-1 flex-col min-w-0 w-full">
          <SiteHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto w-full max-w-none">
            <div className="w-full max-w-none">
              {isRootDashboard && renderContent()}
              <Outlet />
            </div>
          </main>
          <div className="p-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={handleLogout} className="w-full">
              <IconLogout className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
