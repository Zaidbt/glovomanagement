"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-logout";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Store,
  Users,
  Truck,
  Link as LinkIcon,
  BarChart3,
  LogOut,
  X,
  Key,
  ShoppingCart,
  MessageSquare,
  Trash2,
  UserCheck,
  Activity,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: BarChart3 },
  { name: "Stores", href: "/admin/stores", icon: Store },
  { name: "Collaborateurs", href: "/admin/collaborateurs", icon: Users },
  { name: "Fournisseurs", href: "/admin/fournisseurs", icon: Truck },
  { name: "Clients", href: "/admin/customers", icon: UserCheck },
  { name: "Attributions", href: "/admin/attributions", icon: LinkIcon },
  { name: "Credentials", href: "/admin/credentials", icon: Key },
  { name: "Messagerie", href: "/admin/messaging", icon: MessageSquare },
  { name: "Commandes", href: "/admin/orders", icon: ShoppingCart },
  { name: "Événements", href: "/admin/events", icon: Activity },
  { name: "Cleanup", href: "/admin/cleanup", icon: Trash2 },
];

export function AdminSidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { handleLogout } = useLogout();

  const NavItem = ({
    item,
    isMobile = false,
  }: {
    item: (typeof navigation)[0];
    isMobile?: boolean;
  }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 natura-hover ${
          isActive
            ? "natura-gradient text-white shadow-lg"
            : "text-gray-700 hover:bg-green-50 hover:text-green-700"
        }`}
        onClick={() => isMobile && setMobileMenuOpen(false)}
      >
        <Icon
          className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-500"}`}
        />
        {item.name}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h1 className="text-lg font-semibold">Natura Beldi</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} isMobile />
              ))}
            </nav>
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto natura-sidebar px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center space-x-3">
            <div className="w-10 h-10 natura-gradient rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-lg font-bold text-white">N</span>
            </div>
            <div>
              <h1 className="text-xl font-bold natura-text-gradient">
                Natura Beldi
              </h1>
              <p className="text-xs text-gray-500">Management</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <NavItem item={item} />
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
