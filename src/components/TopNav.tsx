import { LayoutDashboard, Plane, Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';

export default function TopNav() {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
    { label: 'Search', icon: Search, to: '/search' },
    { label: 'Settings', icon: Settings2, to: '/settings' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-border bg-secondary text-foreground">
            <Plane className="h-4 w-4" />
          </div>
          <div>
            <p className="font-heading text-base font-bold leading-tight text-foreground">Air Accidents DB</p>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground leading-none">Archive</p>
          </div>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Button key={item.to} variant="ghost" size="sm" asChild className="px-3 rounded-none">
              <NavLink
                to={item.to}
                className="text-muted-foreground"
                activeClassName="bg-primary text-primary-foreground"
              >
                <item.icon className="mr-1.5 h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto flex max-w-screen-2xl gap-1 px-4 pb-3 md:hidden sm:px-6 lg:px-8">
        {navItems.map((item) => (
          <Button key={item.to} variant="ghost" size="sm" asChild className="flex-1 rounded-none">
            <NavLink
              to={item.to}
              className={cn('justify-center text-muted-foreground')}
              activeClassName="bg-primary text-primary-foreground"
            >
              <item.icon className="mr-1 h-3.5 w-3.5" />
              {item.label}
            </NavLink>
          </Button>
        ))}
      </div>
    </header>
  );
}
