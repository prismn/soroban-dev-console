import {
  LayoutDashboard,
  FileCode,
  Activity,
  Settings,
  Search,
  HardDrive,
  Calculator,
  UploadCloud,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const items = [
  {
    title: "Home / Monitor",
    url: "/",
    icon: Activity,
  },
  {
    title: "Account Dashboard",
    url: "/account",
    icon: LayoutDashboard,
  },
  {
    title: "Contract Explorer",
    url: "/contracts",
    icon: FileCode,
  },
  {
    title: "Deploy Contract",
    url: "/deploy",
    icon: UploadCloud,
  },
  {
    title: "WASM Registry",
    url: "/deploy/wasm",
    icon: HardDrive,
  },
  {
    title: "Transaction Lookup",
    url: "/tx",
    icon: Search,
  },
  {
    title: "Key Calculator",
    url: "/tools/ledger-keys",
    icon: Calculator,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="flex items-center justify-center py-4">
        <span className="font-bold text-lg truncate w-full px-2">
          DevConsole
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
