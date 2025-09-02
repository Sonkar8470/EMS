import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  [key: string]: unknown;
}

export default function EmployeeDashboard() {
  const { user } = useAuth();

  if (!user) {
    return <p>Loading...</p>;
  }

  const employee = user as User;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar user={{ ...employee, id: employee.id ?? employee._id ?? "" }} />
        <div className="flex flex-1 flex-col min-w-0 w-full">
          <SiteHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto w-full max-w-none">
            <div className="w-full max-w-none">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
