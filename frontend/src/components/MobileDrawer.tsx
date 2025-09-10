import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Home, User, Settings, HelpCircle, Menu, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "./../hooks/useAuth";

interface NavItemType {
  url: string;
  title: string;
  icon: LucideIcon;
}

interface NavItems {
  main: NavItemType[];
  secondary: NavItemType[];
}

const getNavItems = (role?: string): NavItems => {
  if (role === "admin" || role === "hr") {
    return {
      main: [
        { url: "/dashboard", title: "Dashboard", icon: Home },
        { url: "/dashboard/addemployee", title: "Manage Employee", icon: Settings },
        { url: "/dashboard/attendence", title: "Employee Attendance", icon: Home },
        { url: "/dashboard/applications", title: "Employee Applications", icon: User },
        { url: "/dashboard/company-holidays", title: "Company Calendar", icon: HelpCircle },
      ],
      secondary: [],
    };
  }
  return {
    main: [
      { url: "/employee-dashboard", title: "Dashboard", icon: Home },
      { url: "/employee-dashboard/attendance", title: "My Attendance", icon: Home },
      { url: "/employee-dashboard/company-holidays", title: "Company Calendar", icon: HelpCircle },
      { url: "/employee-dashboard/leaves", title: "Leave Management", icon: Settings },
      { url: "/employee-dashboard/salary", title: "Salary Structure", icon: User },
      { url: "/employee-dashboard/profile", title: "My Profile", icon: User },
    ],
    secondary: [],
  };
};

interface MobileDrawerProps {
  user: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
}

const NavItem = ({ item, isActive }: { item: NavItemType; isActive: boolean }) => (
  <Link
    to={item.url}
    className={cn(
      "flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
      isActive
        ? "bg-blue-50 text-blue-700"
        : "text-gray-700 hover:bg-gray-50"
    )}
  >
    <item.icon
      size={20}
      className={cn(
        "transition-colors",
        isActive ? "text-blue-600" : "text-gray-500"
      )}
    />
    <span>{item.title}</span>
  </Link>
);

export default function MobileDrawer({ user }: MobileDrawerProps) {
  const location = useLocation();
  const { logout } = useAuth();
  const items = getNavItems((user as any)?.role);

  return (
    <Sheet>
      {/* Button to open drawer */}
      <button className="p-2">
        <Menu className="h-6 w-6" />
      </button>

      <SheetContent side="left" className="w-64">
        <div className="flex flex-col h-full justify-between">
          {/* User Info */}
          <div>
            {user && (
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}

            {/* Main Navigation */}
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Main
              </h3>
              <nav className="space-y-1">
                {items.main.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <NavItem key={item.url} item={item} isActive={isActive} />
                  );
                })}
              </nav>
            </div>

            {/* Secondary Navigation */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                More
              </h3>
              <nav className="space-y-1">
                {items.secondary.map((item) => (
                  <NavItem key={item.url} item={item} isActive={false} />
                ))}
              </nav>
            </div>
          </div>

          {/* Logout */}
          <div className="px-4 py-3 border-t">
            <button
              onClick={logout}
              className="flex items-center space-x-3 w-full text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-2"
            >
              <LogOut size={20} className="text-gray-500" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
