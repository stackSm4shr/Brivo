"use client";

import {
  RiAddLine,
  RiArrowDropUpLine,
  RiCalendar2Line,
  RiEditBoxLine,
  RiLogoutBoxLine,
  RiProjector2Line,
  RiSettings2Line,
  RiUser2Line,
} from "@remixicon/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "./ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { useDeadlineCount } from "@/context/deadline-count-context";

const AppSidebar = () => {
  const { user, loading, logout } = useAuth();
  const { deadlineCount } = useDeadlineCount();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="py-4 pt-5 pb-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <Image src="/logo.svg" alt="logo" width={40} height={40} />
                <span>Brivo</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Helpers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/calendar">
                    <RiCalendar2Line />
                    Calendar
                  </Link>
                </SidebarMenuButton>

                {deadlineCount > 0 && (
                  <SidebarMenuBadge>{deadlineCount}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/editor">
                    <RiEditBoxLine />
                    Document Assistant
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {!loading && user && (
          <SidebarGroup>
            <SidebarGroupLabel>Letters</SidebarGroupLabel>

            <SidebarGroupAction>
              <RiAddLine />
            </SidebarGroupAction>

            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/letters">
                      <RiProjector2Line />
                      See all Letters
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <RiUser2Line />
                    {user.name ?? user.email}
                    <RiArrowDropUpLine className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href="/account">
                      <RiUser2Line />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <RiSettings2Line />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={async () => {
                      await logout();
                    }}
                  >
                    <RiLogoutBoxLine />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
