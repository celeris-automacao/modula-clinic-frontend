import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Settings, Stethoscope, User, Moon, Sun, LogIn, LogOut } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    if (document.documentElement.classList.contains("dark")) return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { dark, toggle } = useTheme();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

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
                ? "bg-white dark:bg-sidebar-accent shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}>
              Profissional
            </Link>
            <Link href="/jornada" className={cn(
              "flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all",
              isPatientView
                ? "bg-white dark:bg-sidebar-accent shadow-sm text-foreground"
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
              <NavItem href="/configuracoes" icon={Settings} label="Configurações" active={location.startsWith("/configuracoes")} />
            </>
          ) : (
            <>
              <NavItem href="/jornada" icon={User} label="Minha Jornada" active={location === "/jornada"} />
            </>
          )}
        </nav>

        {/* Bottom: auth + theme toggle + status */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {/* Auth row */}
          {!isLoading && (
            isAuthenticated ? (
              <div className="flex items-center gap-2 px-1">
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.firstName ?? "avatar"}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">
                    {user?.firstName ?? user?.email ?? "Usuário"}
                  </p>
                  {user?.email && (
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  )}
                </div>
                <button
                  onClick={logout}
                  title="Sair"
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                onClick={login}
                variant="outline"
                size="sm"
                className="w-full font-bold gap-2"
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </Button>
            )
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-all"
            aria-label="Alternar modo escuro"
          >
            {dark
              ? <Sun className="w-3.5 h-3.5 text-amber-400" />
              : <Moon className="w-3.5 h-3.5 text-sky-500" />}
            {dark ? "Modo claro" : "Modo escuro"}
          </button>

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
          ? "bg-gradient-to-r from-sky-400/15 to-blue-500/10 dark:from-sky-500/20 dark:to-blue-600/15 text-sky-600 dark:text-sky-400 shadow-sm border border-sky-200/60 dark:border-sky-700/50"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className={cn("w-4 h-4", active && "text-sky-500 dark:text-sky-400")} />
      {label}
    </Link>
  );
}
