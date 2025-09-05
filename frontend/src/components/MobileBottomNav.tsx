
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  IconDashboard,
  IconCalendar,
  IconFolder,
  IconUser,
  
  IconListDetails,
  IconFiles,
} from '@tabler/icons-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  mobile?: string;
}

interface MobileBottomNavProps {
  user: User | null;
}

const getMobileNavItems = (user: User | null) => {
  if (user?.role === "admin") {
    return [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: IconDashboard,
      },
      {
        title: "Employees",
        url: "/dashboard/addemployee",
        icon: IconListDetails,
      },
      {
        title: "Attendance",
        url: "/dashboard/attendence",
        icon: IconCalendar,
      },
      {
        title: "Applications",
        url: "/dashboard/applications",
        icon: IconFiles,
      },
    ];
  } else {
    return [
      {
        title: "Dashboard",
        url: "/employee-dashboard",
        icon: IconDashboard,
      },
      {
        title: "Attendance",
        url: "/employee-dashboard/attendance",
        icon: IconCalendar,
      },
      {
        title: "Leaves",
        url: "/employee-dashboard/leaves",
        icon: IconFolder,
      },
      {
        title: "Profile",
        url: "/employee-dashboard/profile",
        icon: IconUser,
      },
    ];
  }
};

export function MobileBottomNav({ user }: MobileBottomNavProps) {
  const location = useLocation();
  const navItems = getMobileNavItems(user);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url || 
            (item.url !== "/dashboard" && item.url !== "/employee-dashboard" && 
             location.pathname.startsWith(item.url));
          
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 px-2 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <item.icon 
                size={20} 
                className={cn(
                  "transition-colors",
                  isActive ? "text-blue-600" : "text-gray-500"
                )}
              />
              <span className={cn(
                "text-xs leading-none",
                isActive ? "text-blue-600" : "text-gray-600"
              )}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
