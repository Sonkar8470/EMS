import * as React from "react";
import {
  IconCamera,
  IconDashboard,
  IconDatabase,
  IconFile,
  IconFileDescription,
  IconFiles,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
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
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
      },
      navMain: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: IconDashboard,
        },
        {
          title: "Add Employee",
          url: "/dashboard/addemployee",
          icon: IconListDetails,
        },
        {
          title: "Attendence",
          url: "/dashboard/attendence",
          icon: IconFolder,
        },
        {
          title: "Team",
          url: "#",
          icon: IconUsers,
        },
      ],
      navClouds: [
        {
          title: "Capture",
          icon: IconCamera,
          isActive: true,
          url: "#",
          items: [
            {
              title: "Active Proposals",
              url: "#",
            },
            {
              title: "Archived",
              url: "#",
            },
          ],
        },
        {
          title: "Proposal",
          icon: IconFileDescription,
          url: "#",
          items: [
            {
              title: "Active Proposals",
              url: "#",
            },
            {
              title: "Archived",
              url: "#",
            },
          ],
        },
        {
          title: "Prompts",
          icon: IconFile,
          url: "#",
          items: [
            {
              title: "Active Proposals",
              url: "#",
            },
            {
              title: "Archived",
              url: "#",
            },
          ],
        },
      ],
      navSecondary: [
        {
          title: "Settings",
          url: "#",
          icon: IconSettings,
        },
        {
          title: "Get Help",
          url: "#",
          icon: IconHelp,
        },
        {
          title: "Search",
          url: "#",
          icon: IconSearch,
        },
      ],
      documents: [
        {
          name: "Data Library",
          url: "#",
          icon: IconDatabase,
        },
        {
          name: "Reports",
          url: "#",
          icon: IconReport,
        },
        {
          name: "Word Assistant",
          url: "#",
          icon: IconFiles,
        },
      ],
    };
  } else {
    // Employee navigation
    return {
      user: {
        name: user?.name || "Employee",
        email: user?.email || "",
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "Employee")}&background=random`,
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
      navSecondary: [
        {
          title: "Settings",
          url: "#",
          icon: IconSettings,
        },
        {
          title: "Get Help",
          url: "#",
          icon: IconHelp,
        },
        {
          title: "Search",
          url: "#",
          icon: IconSearch,
        },
      ],
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
        {data.documents.length > 0 && <NavDocuments items={data.documents} />}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
