import { useEffect, useState } from "react";
import {
  useListPatients,
  useGetTodayTasks,
  useGetPatientProgress,
  useCreateTaskLog,
  getGetTodayTasksQueryKey,
  getGetPatientProgressQueryKey,
  getGetPatientAdherenceQueryKey,
  getListPatientsQueryKey,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Flame, Trophy, ChevronRight, Droplets, Utensils, Dumbbell, Pill, Scale, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
  switch (category) {
    case 'hydration': return <Droplets className={className} />;
    case 'nutrition': return <Utensils className={className} />;
    case 'exercise': return <Dumbbell className={className} />;
    case 'medication': return <Pill className={className} />;
    case 'measurement': return <Scale className={className} />;
    default: return <Heart className={className} />;
  }
};

export default function Journey() {
  const { data: patients } = useListPatients();
  const [chosenPatientId, setChosenPatientId] = useState<number | null>(null);

  const selectedPatientId = chosenPatientId ?? patients?.[0]?.id ?? null;
  const setSelectedPatientId = setChosenPatientId;

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-8rem)] flex flex-col space-y-6">

      {/* Patient Selector */}
      <div className="bg-card border border-card-border rounded-full px-4 py-2 flex items-center justify-between shadow-sm mx-auto w-full max-w-[260px]">
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Perfil</span>
        <Select
          value={selectedPatientId?.toString()}
          onValueChange={v => setSelectedPatientId(parseInt(v))}
        >
          <SelectTrigger className="h-8 border-0 bg-transparent shadow-none font-bold w-auto focus:ring-0 px-2 justify-end">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {patients?.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedPatientId ? (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <p className="text-muted-foreground font-medium">Selecione um paciente para ver a jornada.</p>
        </div>
      ) : (
        <PatientJourneyContent patientId={selectedPatientId} />
      )}
    </div>
  );
}

function PatientJourneyContent({ patientId }: { patientId: number }) {
  const { data: tasks, isLoading: loadingTasks } = useGetTodayTasks(patientId, { query: { enabled: !!patientId, queryKey: getGetTodayTasksQueryKey(patientId) } });

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.completedToday).length || 0;
  const completionPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const isAllDone = totalTasks > 0 && completedTasks === totalTasks;

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  // Animate the progress ring from 0 on load (CSS transition handles reduced-motion via media query below)
  const [ringPct, setRingPct] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setRingPct(completionPct));
    return () => cancelAnimationFrame(raf);
  }, [completionPct]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex-1 flex flex-col">
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
  const needsValue = task.category === 'measurement';

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
    if (needsValue || task.category === 'hydration') {
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
        {/* Icon */}
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
            {isCompleted ? "Concluída hoje ✓" : (task.description || "Toque para concluir")}
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
