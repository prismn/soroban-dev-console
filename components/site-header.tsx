"use client";

import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/components/wallet-connect";
import { NetworkSwitcher } from "@/components/network-switcher";
import { ModeToggle } from "@/components/mode-toggle";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Menu } from "lucide-react";

function getPageTitle(pathname: string) {
  if (pathname === "/") return "Home / Monitor";
  if (pathname === "/account") return "Account Dashboard";
  if (pathname === "/contracts") return "Contract Explorer";
  if (pathname.startsWith("/contracts/")) return "Contract Details";
  if (pathname === "/deploy") return "Deploy Contract";
  if (pathname === "/deploy/wasm") return "WASM Registry";
  if (pathname === "/tx") return "Transaction Lookup";
  if (pathname === "/tools/ledger-keys") return "Key Calculator";
  if (pathname === "/tools/xdr") return "XDR Decoder";
  if (pathname === "/settings") return "Settings";
  if (pathname.startsWith("/docs")) return "Documentation";

  return "Dashboard";
}

export function SiteHeader() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 z-10 bg-background">
      <SidebarTrigger className="-ml-1 md:hidden" />
      <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />

      <div className="flex flex-1 items-center">
        {/* Left side - NOW DYNAMIC */}
        <div className="flex items-center gap-2">
          <span className="font-medium">{pageTitle}</span>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-4">
          {/* Desktop View */}
          <div className="hidden md:flex items-center gap-2">
            <NetworkSwitcher />
            <ModeToggle />
            <ConnectWalletButton />
          </div>

          {/* Mobile View */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="px-6">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-4 mt-8 px-2">
                <NetworkSwitcher />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Theme</span>
                  <ModeToggle />
                </div>
                <ConnectWalletButton />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}