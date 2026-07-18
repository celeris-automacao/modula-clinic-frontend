import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Stethoscope, User } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const isPatientView = location.startsWith("/jornada");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="p-6 pb-4 border-b border-sidebar-border">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl text-sidebar-foreground mb-6">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-[0_4px_14px_0_rgba(14,165,233,0.35)]">
              <Activity className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="tracking-tight">Modula</span>
          </Link>

          {/* View Toggle */}
          <div className="flex bg-muted rounded-xl p-1 mb-4">
            <Link href="/" className={cn(
              "flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all",
              !isPatientView
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}>
              Profissional
            </Link>
            <Link href="/jornada" className={cn(
              "flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all",
              isPatientView
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}>
              Paciente
            </Link>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {!isPatientView ? (
            <>
              <NavItem href="/" icon={LayoutDashboard} label="Dashboard" active={location === "/"} />
              <NavItem href="/protocolos" icon={Stethoscope} label="Protocolos" active={location.startsWith("/protocolos")} />
            </>
          ) : (
            <>
              <NavItem href="/jornada" icon={User} label="Minha Jornada" active={location === "/jornada"} />
            </>
          )}
        </nav>

        {/* Bottom accent */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 text-xs font-bold text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            Sistema operacional
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <PageTransition locationKey={location}>
              {children}
            </PageTransition>
          </div>
        </div>
      </main>
    </div>
  );
}

function PageTransition({ locationKey, children }: { locationKey: string, children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={locationKey}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function NavItem({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-bold",
        active
          ? "bg-gradient-to-r from-sky-400/15 to-blue-500/10 text-sky-600 shadow-sm border border-sky-200/60"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className={cn("w-4 h-4", active && "text-sky-500")} />
      {label}
    </Link>
  );
}
