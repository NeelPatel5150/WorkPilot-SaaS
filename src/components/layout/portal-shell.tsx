import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AvatarSetupModal } from "@/features/profile/components/avatar-setup";
import { EmployeeMobileDock } from "@/components/layout/employee-mobile-dock";
import type { NavItem } from "@/config/nav";

export function PortalShell({
  brand,
  logoUrl,
  title,
  userName,
  userImage,
  items,
  notificationsHref,
  children,
  showEmployeeDock = false,
}: {
  brand: string;
  logoUrl?: string | null;
  title: string;
  userName: string;
  userImage?: string | null;
  items: NavItem[];
  notificationsHref: string;
  children: React.ReactNode;
  showEmployeeDock?: boolean;
}) {
  return (
    <div className="app-shell flex">
      <Sidebar
        items={items}
        brand={brand}
        logoUrl={logoUrl}
        userName={userName}
        userImage={userImage}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          brand={brand}
          logoUrl={logoUrl}
          userName={userName}
          userImage={userImage}
          items={items}
          notificationsHref={notificationsHref}
        />
        <main
          className={`nb-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 pr-4 sm:p-4 sm:pr-5 md:p-6 md:pr-8 ${
            showEmployeeDock ? "pb-24 md:pb-10" : "pb-10"
          }`}
        >
          <div aria-hidden className="portal-glow pointer-events-none absolute inset-0" />
          <div className="relative z-[1] pb-6 pr-0.5 sm:pr-1">{children}</div>
        </main>
      </div>
      {showEmployeeDock ? <EmployeeMobileDock /> : null}
      <AvatarSetupModal userName={userName} needsAvatar={!userImage} />
    </div>
  );
}
