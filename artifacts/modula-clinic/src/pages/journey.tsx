import { useEffect, useRef, useState } from "react";
import {
  useGetTodayTasks,
  useCreateTaskLog,
  useGetMyPatient,
  getGetMyPatientQueryKey,
  getGetTodayTasksQueryKey,
  getGetPatientProgressQueryKey,
  getGetPatientAdherenceQueryKey,
  getListPatientsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Flame, Trophy, ChevronRight, Droplets, Utensils, Dumbbell, Pill, Scale, Heart, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Celebration overlay – confetti + trophy banner
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = [
  "#38bdf8", "#0ea5e9", "#facc15", "#fb923c", "#4ade80",
  "#f472b6", "#a78bfa", "#34d399", "#f87171", "#60a5fa",
];

interface ConfettiPiece {
  id: number;
  color: string;
  left: number;   // %
  delay: number;  // s
  duration: number; // s
  size: number;   // px
  rotate: number; // deg
  shape: "rect" | "circle";
}

function generateConfetti(count = 60): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.8 + Math.random() * 1.2,
    size: 6 + Math.round(Math.random() * 7),
    rotate: Math.round(Math.random() * 360),
    shape: Math.random() > 0.4 ? "rect" : "circle",
  }));
}

const pieces = generateConfetti(60);

function CelebrationOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
      aria-live="polite"
      aria-label="Parabéns! Todas as tarefas concluídas!"
    >
      {/* Confetti – hidden for prefers-reduced-motion */}
      <div className="absolute inset-0 overflow-hidden motion-reduce:hidden">
        {pieces.map(p => (
          <span
            key={p.id}
            style={{
              position: "absolute",
              top: "-16px",
              left: `${p.left}%`,
              width: p.shape === "circle" ? p.size : p.size * 0.6,
              height: p.shape === "circle" ? p.size : p.size * 1.4,
              borderRadius: p.shape === "circle" ? "50%" : "2px",
              backgroundColor: p.color,
              transform: `rotate(${p.rotate}deg)`,
              animation: `confettiFall ${p.duration}s ${p.delay}s ease-in both`,
            }}
          />
        ))}
      </div>

      {/* Trophy banner – always visible */}
      <div
        className={cn(
          "relative bg-white dark:bg-neutral-900 border border-yellow-300 dark:border-yellow-600",
          "rounded-3xl px-8 py-7 shadow-2xl flex flex-col items-center gap-3 text-center max-w-[280px]",
          "motion-safe:animate-[celebrationPop_0.5s_0.1s_cubic-bezier(0.34,1.56,0.64,1)_both]",
          "motion-reduce:opacity-100"
        )}
      >
        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg motion-safe:animate-[trophySpin_0.6s_0.3s_ease-out_both]">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-foreground">Missão cumprida! 🎉</h2>
        <p className="text-sm text-muted-foreground font-medium leading-snug">
          Você concluiu todas as tarefas de hoje. Continue assim!
        </p>
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(var(--r, 0deg)) scaleX(1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(calc(var(--r, 0deg) + 720deg)) scaleX(0.6); opacity: 0; }
        }
        @keyframes celebrationPop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes trophySpin {
          from { transform: rotate(-20deg) scale(0.7); }
          to   { transform: rotate(0deg)  scale(1); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons & helpers
// ---------------------------------------------------------------------------

const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
  // BR-031: 9 tipos oficiais de tarefa
  switch (category) {
    case 'water':      return <Droplets className={className} />;
    case 'nutrition':  return <Utensils className={className} />;
    case 'exercise':   return <Dumbbell className={className} />;
    case 'medication': return <Pill className={className} />;
    case 'weight':     return <Scale className={className} />;
    case 'sleep':      return <Heart className={className} />;
    case 'mood':       return <Heart className={className} />;
    case 'photo':      return <Heart className={className} />;
    case 'free_text':  return <Heart className={className} />;
    default:           return <Heart className={className} />;
  }
};

export default function Journey() {
  const { user, isLoading: authLoading, isAuthenticated, login } = useAuth();
  const { data: myPatient, isLoading: patientLoading } = useGetMyPatient({
    query: { queryKey: getGetMyPatientQueryKey(), retry: false, staleTime: 60_000, enabled: isAuthenticated },
  });

  const isLoading = authLoading || (isAuthenticated && patientLoading);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto space-y-4 pt-8">
        <Skeleton className="h-10 w-48 mx-auto rounded-full" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  // Not logged in → prompt to log in
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center p-8 space-y-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-[0_8px_30px_rgba(14,165,233,0.30)]">
          <LogIn className="w-9 h-9 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight mb-2">Sua Jornada Pessoal</h2>
          <p className="text-muted-foreground font-medium text-sm max-w-xs mx-auto">
            Entre na sua conta para ver e registrar suas tarefas do dia.
          </p>
        </div>
        <Button
          onClick={login}
          className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-0 font-bold shadow-[0_4px_14px_0_rgba(14,165,233,0.30)] px-8"
        >
          Entrar
        </Button>
      </div>
    );
  }

  // Logged in but no linked patient record
  if (!myPatient) {
    return (
      <div className="max-w-md mx-auto min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center p-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Heart className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight mb-2">Nenhum protocolo ativo</h2>
          <p className="text-muted-foreground font-medium text-sm max-w-xs mx-auto">
            Sua conta ainda não está vinculada a um paciente. Fale com seu profissional de saúde para configurar sua jornada.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Conectado como <span className="font-semibold">{user?.firstName ?? user?.email ?? "você"}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-8rem)] flex flex-col space-y-6">
      {/* Patient badge */}
      <div className="bg-card border border-card-border rounded-full px-4 py-2 flex items-center justify-between shadow-sm mx-auto w-full max-w-[260px]">
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Perfil</span>
        <span className="font-bold text-sm truncate ml-2">{myPatient.name}</span>
      </div>

      <PatientJourneyContent key={myPatient.id} patientId={myPatient.id} />
    </div>
  );
}

export function PatientJourneyContent({ patientId }: { patientId: number }) {
  const { data: tasks, isLoading: loadingTasks } = useGetTodayTasks(patientId, { query: { enabled: !!patientId, queryKey: getGetTodayTasksQueryKey(patientId) } });

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.completedToday).length || 0;
  const completionPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const isAllDone = totalTasks > 0 && completedTasks === totalTasks;

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  const [ringPct, setRingPct] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setRingPct(completionPct));
    return () => cancelAnimationFrame(raf);
  }, [completionPct]);

  // Celebration: fire once when all tasks transition from incomplete → complete.
  // hasInitialized ensures we don't celebrate on first load if tasks are already done.
  const [showCelebration, setShowCelebration] = useState(false);
  const prevIsAllDone = useRef(false);
  const celebratedRef = useRef(false);
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (loadingTasks) return;

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      prevIsAllDone.current = isAllDone;
      return;
    }

    if (isAllDone && !prevIsAllDone.current && !celebratedRef.current) {
      celebratedRef.current = true;
      setShowCelebration(true);
    }
    prevIsAllDone.current = isAllDone;
  }, [isAllDone, loadingTasks]);

  const remainingTasks = totalTasks - completedTasks;
  const isNearlyDone = completionPct >= 80 && completionPct < 100 && totalTasks > 0;
  const encouragementMsg = remainingTasks === 1
    ? "Falta só 1 tarefa! 💪"
    : `Faltam só ${remainingTasks} tarefas! 💪`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex-1 flex flex-col">
      {showCelebration && (
        <CelebrationOverlay onDone={() => setShowCelebration(false)} />
      )}

      {/* Date Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight capitalize mb-1">{today}</h1>
        <p className="text-muted-foreground text-sm font-medium">Continue seu progresso. Você consegue!</p>
      </div>

      {/* Progress Summary Card */}
      <div className="bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl mb-6 overflow-hidden relative shadow-[0_8px_30px_rgba(14,165,233,0.30)]">
        <div className="absolute right-0 top-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
        <div className="p-6 relative z-10 flex items-center justify-between">
          <div className="text-white">
            <div className="text-xs font-bold uppercase tracking-widest text-sky-100 mb-1">Aproveitamento Hoje</div>
            <div className="text-5xl font-extrabold tracking-tighter flex items-baseline gap-1">
              {completionPct}<span className="text-2xl font-bold text-sky-200">%</span>
            </div>
            <div className="text-sm text-sky-100 font-medium mt-1">
              {completedTasks} de {totalTasks} tarefas concluídas
            </div>
          </div>
          <div className="w-20 h-20 flex items-center justify-center relative">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="289"
                strokeDashoffset={289 - (289 * ringPct) / 100}
                className="motion-safe:transition-all motion-safe:duration-1000 motion-safe:ease-out"
              />
            </svg>
            {isAllDone
              ? <Trophy className="w-8 h-8 text-white relative z-10" />
              : <Flame className="w-8 h-8 text-white/90 relative z-10" />}
          </div>
        </div>

        {/* Encouragement banner – shown when 80–99% complete */}
        {isNearlyDone && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "relative z-10 mx-4 mb-4 rounded-xl px-4 py-2.5",
              "bg-white/20 backdrop-blur-sm border border-white/30",
              "flex items-center gap-2",
              "motion-safe:animate-[encouragePulse_2s_ease-in-out_infinite]"
            )}
          >
            <span className="text-sm font-extrabold text-white tracking-tight">
              {encouragementMsg}
            </span>
            <style>{`
              @keyframes encouragePulse {
                0%, 100% { background-color: rgba(255,255,255,0.20); }
                50%       { background-color: rgba(255,255,255,0.32); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 space-y-4">
        <h3 className="font-extrabold text-lg tracking-tight text-foreground">Tarefas do Dia</h3>

        {loadingTasks ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
        ) : tasks?.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-2xl">
            <div className="p-10 text-center text-muted-foreground text-sm font-medium">
              Não há tarefas programadas para hoje. Aproveite o descanso!
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks?.map(task => (
              <TaskCard key={task.taskId} task={task} patientId={patientId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, patientId }: { task: any, patientId: number }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [valueNumber, setValueNumber] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTaskLog = useCreateTaskLog();

  const isCompleted = task.completedToday;
  // BR-031: weight tasks need a numeric value for currentWeightKg tracking
  const needsValue = task.category === 'weight';

  const handleComplete = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isCompleted) return;

    const payload: any = { taskId: task.taskId, patientId };
    if (note) payload.note = note;
    if (valueNumber) payload.valueNumber = parseFloat(valueNumber);

    createTaskLog.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayTasksQueryKey(patientId) });
        queryClient.invalidateQueries({ queryKey: getGetPatientProgressQueryKey(patientId) });
        queryClient.invalidateQueries({ queryKey: getGetPatientAdherenceQueryKey(patientId) });
        queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });

        setOpen(false);
        toast({ title: "Fantástico!", description: "Tarefa registrada com sucesso." });
        setNote("");
        setValueNumber("");
      },
      onError: () => {
        toast({ title: "Ops!", description: "Tente novamente mais tarde.", variant: "destructive" });
      }
    });
  };

  const handleClick = () => {
    if (isCompleted) return;
    if (needsValue || task.category === 'water') {
      setOpen(true);
    } else {
      handleComplete();
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          "relative overflow-hidden group rounded-2xl p-4 transition-all duration-300 flex items-center gap-4",
          isCompleted
            ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 shadow-none"
            : "bg-card border border-card-border shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:border-sky-300/60 hover:shadow-[0_4px_20px_rgba(14,165,233,0.12)] cursor-pointer active:scale-[0.98]"
        )}
      >
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all",
          isCompleted
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
            : "bg-sky-50 dark:bg-sky-950/40 text-sky-500 group-hover:bg-gradient-to-br group-hover:from-sky-400 group-hover:to-blue-600 group-hover:text-white group-hover:shadow-[0_4px_14px_0_rgba(14,165,233,0.30)]"
        )}>
          {isCompleted
            ? <CheckCircle2 className="w-5 h-5" />
            : <CategoryIcon category={task.category} className="w-4.5 h-4.5" />}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-bold text-sm truncate transition-colors",
            isCompleted ? "text-emerald-700 dark:text-emerald-400 line-through" : "text-foreground"
          )}>
            {task.title}
          </h4>
          <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
            {isCompleted
              ? task.frequency === "weekly" ? "Concluída nesta semana ✓" : "Concluída hoje ✓"
              : (task.description || (task.frequency === "weekly" ? "Toque para registrar (1× por semana)" : "Toque para concluir"))}
          </p>
        </div>

        {!isCompleted && (
          <div className="shrink-0 text-muted-foreground/40 group-hover:text-sky-500 transition-all">
            <ChevronRight className="w-5 h-5" />
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold">{task.title}</DialogTitle>
            <DialogDescription>
              {needsValue ? 'Registre o valor para acompanhar seu progresso.' : 'Deseja adicionar alguma observação?'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleComplete} className="space-y-4 py-4">
            {needsValue && (
              <div className="space-y-2">
                <Label>Valor Numérico</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 75.5"
                  value={valueNumber}
                  onChange={e => setValueNumber(e.target.value)}
                  required
                  className="text-lg py-6"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observação (Opcional)</Label>
              <Input
                placeholder="Como foi fazer isso?"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto font-bold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTaskLog.isPending}
                className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-0 font-bold shadow-[0_4px_14px_0_rgba(14,165,233,0.30)]"
              >
                {createTaskLog.isPending ? "Registrando..." : "Registrar Conclusão"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
