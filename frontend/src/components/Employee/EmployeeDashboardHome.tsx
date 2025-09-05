import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconCalendar,
  IconHome,
  IconBone,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import EmployeeCards from "@/components/Employee/EmployeeCards";
import EmployeeCharts from "@/components/Employee/EmployeeCharts";
import AnnouncementsPanel from "@/components/announcements/AnnouncementsPanel";

interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  [key: string]: unknown;
}

export default function EmployeeDashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  if (!user) {
    return <p>Loading...</p>;
  }

  const employee = user as User;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">
          Welcome back, {employee.name}!
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Here's what's happening with your account today.
        </p>
      </div>

      <EmployeeCards />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <EmployeeCharts />

        <Card>
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-2 sm:space-y-3">
            <Button
              className="w-full justify-start h-11 sm:h-10 text-sm sm:text-base"
              variant="outline"
              onClick={() => navigate("/employee-dashboard/mark-attendance")}
            >
              <IconCalendar className="mr-2 h-4 w-4" />
              Mark my Attendance
            </Button>
            <Button
              className="w-full justify-start h-11 sm:h-10 text-sm sm:text-base"
              variant="outline"
              onClick={() => navigate("/employee-dashboard/wfh")}
            >
              <IconHome className="mr-2 h-4 w-4" />
              Request WFH
            </Button>
            <Button
              className="w-full justify-start h-11 sm:h-10 text-sm sm:text-base"
              variant="outline"
              onClick={() => navigate("/employee-dashboard/leaves")}
            >
              <IconCalendar className="mr-2 h-4 w-4" />
              Apply Leave
            </Button>
            <Button
              className="w-full justify-start h-11 sm:h-10 text-sm sm:text-base"
              variant="outline"
              onClick={() => navigate("/employee-dashboard/salary")}
            >
              <IconBone className="mr-2 h-4 w-4" />
              View Salary
            </Button>
          </CardContent>
        </Card>
        <AnnouncementsPanel variant="employee" />
      </div>
    </div>
  );
}
