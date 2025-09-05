import * as React from "react";
import {
  IconDashboard,
  IconFiles,
  IconFolder,
  IconInnerShadowTop,
  IconListDetails,
  IconCalendar,
  IconBone,
  IconUser,
} from "@tabler/icons-react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  mobile?: string;
}

const getNavItems = (user: User | null) => {
  if (user?.role === "admin") {
    return {
      user: {
        name: user.name,
        email: user.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.name
        )}&background=random`,
      },
      navMain: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: IconDashboard,
        },
        {
          title: "Manage Employee",
          url: "/dashboard/addemployee",
          icon: IconListDetails,
        },
        {
          title: "Employee Attendence",
          url: "/dashboard/attendence",
          icon: IconFolder,
        },
        {
          title: "Employee Applications",
          url: "/dashboard/applications",
          icon: IconFiles,
        },
        {
          title: "Company Calendar",
          url: "/dashboard/company-holidays",
          icon: IconCalendar,
        },
      ],
    };
  } else {
    // Employee navigation
    return {
      user: {
        name: user?.name || "Employee",
        email: user?.email || "",
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user?.name || "Employee"
        )}&background=random`,
      },
      navMain: [
        {
          title: "Dashboard",
          url: "/employee-dashboard",
          icon: IconDashboard,
        },
        {
          title: "My Attendance",
          url: "/employee-dashboard/attendance",
          icon: IconCalendar,
        },
        {
          title: "Company Calendar",
          url: "/employee-dashboard/company-holidays",
          icon: IconCalendar,
        },

        {
          title: "Leave Management",
          url: "/employee-dashboard/leaves",
          icon: IconFolder,
        },
        {
          title: "Salary Structure",
          url: "/employee-dashboard/salary",
          icon: IconBone,
        },
        {
          title: "My Profile",
          url: "/employee-dashboard/profile",
          icon: IconUser,
        },
      ],
      navClouds: [],
      navSecondary: [],
      documents: [],
    };
  }
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User | null }) {
  const data = getNavItems(user);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">
                  {user?.role === "admin" ? "Acme Inc." : "Employee Portal"}
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {data.documents && data.documents.length > 0 && (
          <NavDocuments items={data.documents} />
        )}
        <NavSecondary items={data.navSecondary || []} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
