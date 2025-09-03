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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {employee.name}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your account today.
        </p>
      </div>

      <EmployeeCards />

      <div className="grid gap-6 md:grid-cols-2">
        <EmployeeCharts />

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate("/employee-dashboard/mark-attendance")}
            >
              <IconCalendar className="mr-2 h-4 w-4" />
              Mark my Attendance
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate("/employee-dashboard/wfh")}
            >
              <IconHome className="mr-2 h-4 w-4" />
              Request WFH
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate("/employee-dashboard/leaves")}
            >
              <IconCalendar className="mr-2 h-4 w-4" />
              Apply Leave
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate("/employee-dashboard/salary")}
            >
              <IconBone className="mr-2 h-4 w-4" />
              View Salary
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
