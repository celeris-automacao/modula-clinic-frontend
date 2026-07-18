import { useRoute, useLocation } from "wouter";
import {
  useGetPatient,
  useGetPatientAdherence,
  useGetPatientProgress,
  useGetActiveTreatment,
  useGetLatestInsight,
  useGenerateInsight,
  useListProtocols,
  useCreateTreatment,
  getGetPatientQueryKey,
  getGetPatientAdherenceQueryKey,
  getGetPatientProgressQueryKey,
  getGetActiveTreatmentQueryKey,
  getGetLatestInsightQueryKey,
  getGetDashboardSummaryQueryKey,
  getListPatientsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RadarScore, RiskBadge, TrendIcon } from "@/components/adherence-ui";
import { AlertCircle, BrainCircuit, CheckCircle2, ChevronLeft, Flame, Sparkles, Stethoscope } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Activity, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function PatientDetail() {
  const [, params] = useRoute("/pacientes/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: patient, isLoading: loadingPatient } = useGetPatient(id, { query: { enabled: !!id, queryKey: getGetPatientQueryKey(id) } });
  const { data: adherence, isLoading: loadingAdherence } = useGetPatientAdherence(id, { query: { enabled: !!id && !!patient?.hasActiveTreatment, queryKey: getGetPatientAdherenceQueryKey(id) } });
  const { data: progress } = useGetPatientProgress(id, { query: { enabled: !!id && !!patient?.hasActiveTreatment, queryKey: getGetPatientProgressQueryKey(id) } });
  const { data: treatment } = useGetActiveTreatment(id, { query: { enabled: !!id && !!patient?.hasActiveTreatment, queryKey: getGetActiveTreatmentQueryKey(id) } });
  const { data: insight, isLoading: loadingInsight } = useGetLatestInsight(id, {
    query: {
      enabled: !!id && !!patient?.hasActiveTreatment,
      retry: false,
      queryKey: getGetLatestInsightQueryKey(id),
    }
  });

  const generateInsight = useGenerateInsight();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleGenerateInsight = () => {
    generateInsight.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLatestInsightQueryKey(id) });
        toast({ title: "Insight gerado", description: "O motor de IA analisou os dados recentes." });
      },
      onError: () => {
        toast({ title: "Erro", description: "Falha ao gerar insight.", variant: "destructive" });
      }
    });
  };

  if (loadingPatient) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!patient) return <div className="text-muted-foreground p-8">Paciente não encontrado</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 -ml-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{patient.name}</h1>
          <p className="text-muted-foreground font-medium">{patient.goal}{patient.age ? ` • ${patient.age} anos` : ''}</p>
        </div>
      </div>

      {!patient.hasActiveTreatment ? (
        <ApplyProtocolCard patientId={id} patientName={patient.name} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-6">

            {/* Adherence Radar Overview */}
            <div className="bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-card-border overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-sky-400 via-blue-500 to-teal-400" />
              <div className="p-6 border-b border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2 mb-1">
                      <Activity className="w-4.5 h-4.5 text-sky-500" /> Radar de Adesão
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium">
                      Última atualização: {adherence?.computedAt ? format(parseISO(adherence.computedAt), "dd/MM 'às' HH:mm") : 'Agora'}
                    </p>
                  </div>
                  <div className="text-right">
                    <RadarScore score={adherence?.score ?? 0} size="xl" />
                    <div className="flex items-center gap-2 justify-end mt-1.5">
                      <TrendIcon trend={adherence?.trend ?? 'stable'} className="w-4 h-4" />
                      <RiskBadge level={adherence?.riskLevel ?? 'none'} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loadingAdherence ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Sequência</span>
                      <div className="flex items-center gap-2">
                        <Flame className={cn("w-5 h-5", (adherence?.currentStreakDays ?? 0) > 0 ? "text-amber-500" : "text-muted-foreground/30")} />
                        <span className="text-xl font-extrabold text-foreground">{adherence?.currentStreakDays} dias</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Falhas (3d)</span>
                      <div className="flex items-center gap-2">
                        <AlertCircle className={cn("w-5 h-5", (adherence?.missedLast3Days ?? 0) > 0 ? "text-rose-500" : "text-muted-foreground/30")} />
                        <span className="text-xl font-extrabold text-foreground">{adherence?.missedLast3Days}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-widest font-bold">
                        <span>Aproveitamento Semanal</span>
                        <span className="text-foreground">{adherence?.weeklyCompletionPct}%</span>
                      </div>
                      <Progress
                        value={adherence?.weeklyCompletionPct ?? 0}
                        className="h-2.5 mt-2"
                        indicatorClassName={
                          (adherence?.weeklyCompletionPct ?? 0) >= 80 ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                          (adherence?.weeklyCompletionPct ?? 0) >= 50 ? "bg-gradient-to-r from-amber-400 to-orange-400" :
                          "bg-gradient-to-r from-rose-500 to-red-600"
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Chart */}
            <div className="bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-card-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Tendência de Adesão Diária</h2>
              </div>
              <div className="p-6">
                <div className="h-[240px] w-full">
                  {progress && progress.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progress} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(val) => format(parseISO(val), "dd/MM")}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 100]}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => [`${value}%`, 'Adesão']}
                          labelFormatter={(label) => format(parseISO(label as string), "dd 'de' MMMM", { locale: ptBR })}
                          contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 20px rgb(0,0,0,0.08)' }}
                        />
                        <ReferenceLine y={80} stroke="rgb(52,211,153)" strokeDasharray="4 4" opacity={0.6} />
                        <ReferenceLine y={50} stroke="rgb(251,113,133)" strokeDasharray="4 4" opacity={0.6} />
                        <Line
                          type="monotone"
                          dataKey="completionPct"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2, stroke: "hsl(var(--primary))" }}
                          activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground font-medium border-2 border-dashed border-border rounded-xl text-sm">
                      Dados insuficientes para gerar o gráfico
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">

            {/* AI Insight */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/20 rounded-2xl border border-sky-200/60 dark:border-sky-800/40 overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="absolute top-0 right-0 p-4 opacity-[0.07] pointer-events-none">
                <BrainCircuit className="w-24 h-24 text-sky-600" />
              </div>
              <div className="p-5 border-b border-sky-200/60 dark:border-sky-800/40 relative z-10">
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-sky-500" /> Insight IA
                </h2>
                {insight && (
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Gerado às {format(parseISO(insight.createdAt), "HH:mm")}
                  </p>
                )}
              </div>
              <div className="p-5 relative z-10">
                {loadingInsight ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : insight ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-foreground leading-relaxed">{insight.summary}</p>
                    <div className="bg-white dark:bg-card rounded-xl p-3.5 border border-sky-200/50 dark:border-sky-800/30 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500 block mb-1">Ação Sugerida</span>
                      <p className="text-sm text-foreground/80">{insight.suggestedAction}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum insight gerado recentemente.</p>
                )}
              </div>
              <div className="px-5 pb-5 relative z-10">
                <Button
                  onClick={handleGenerateInsight}
                  disabled={generateInsight.isPending}
                  variant="outline"
                  size="sm"
                  className="w-full bg-white/70 dark:bg-card/50 hover:bg-white dark:hover:bg-card border-sky-200/60 dark:border-sky-800/40 font-bold"
                >
                  {generateInsight.isPending ? "Analisando..." : "Gerar Novo Insight"}
                </Button>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-card-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Categorias</h2>
              </div>
              <div className="p-5 space-y-4">
                {adherence?.categoryBreakdown?.map((cat) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium text-foreground/80">{cat.category}</span>
                      <span className="font-bold text-foreground">{cat.completionPct}%</span>
                    </div>
                    <Progress
                      value={cat.completionPct}
                      className="h-2"
                      indicatorClassName={
                        cat.completionPct >= 80 ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                        cat.completionPct >= 50 ? "bg-gradient-to-r from-amber-400 to-orange-400" :
                        "bg-gradient-to-r from-rose-500 to-red-600"
                      }
                    />
                  </div>
                )) || (
                  <div className="text-sm text-muted-foreground text-center py-6 font-medium">
                    Sem dados por categoria
                  </div>
                )}
              </div>
            </div>

            {/* Protocol Summary */}
            <div className="bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-card-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-sky-500" /> Protocolo Ativo
                </h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h4 className="font-extrabold text-foreground">{treatment?.protocolName}</h4>
                  <p className="text-sm text-muted-foreground font-medium mt-0.5">
                    Iniciado em {treatment?.startedAt ? format(parseISO(treatment.startedAt), "dd/MM/yyyy") : '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tarefas</span>
                  <ul className="space-y-2">
                    {treatment?.tasks?.map(task => (
                      <li key={task.id} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{task.title}{' '}
                          <span className="text-xs text-muted-foreground">
                            ({task.frequency === 'daily' ? 'Diário' : 'Semanal'})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function ApplyProtocolCard({ patientId, patientName }: { patientId: number, patientName: string }) {
  const { data: protocols, isLoading } = useListProtocols();
  const createTreatment = useCreateTreatment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [extraTasks, setExtraTasks] = useState<{ title: string; category: string; frequency: string }[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("habit");
  const [taskFrequency, setTaskFrequency] = useState("daily");

  const addExtraTask = () => {
    const title = taskTitle.trim();
    if (!title) return;
    setExtraTasks(prev => [...prev, { title, category: taskCategory, frequency: taskFrequency }]);
    setTaskTitle("");
  };

  const handleApply = () => {
    if (!selectedProtocolId) return;
    createTreatment.mutate(
      {
        data: {
          patientId,
          protocolId: parseInt(selectedProtocolId),
          ...(extraTasks.length > 0 ? { extraTasks: extraTasks as any } : {}),
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPatientQueryKey(patientId) });
          queryClient.invalidateQueries({ queryKey: getGetActiveTreatmentQueryKey(patientId) });
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setOpen(false);
          toast({ title: "Protocolo aplicado com sucesso!" });
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível aplicar o protocolo.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="bg-card rounded-2xl border-2 border-dashed border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-14 h-14 bg-gradient-to-br from-sky-400/20 to-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-sky-200/60">
          <Stethoscope className="w-7 h-7 text-sky-500" />
        </div>
        <h3 className="text-xl font-extrabold text-foreground mb-2 tracking-tight">Nenhum Tratamento Ativo</h3>
        <p className="text-muted-foreground mb-6 max-w-md font-medium text-sm">
          {patientName} não possui um protocolo associado no momento.
          Aplique um protocolo para iniciar o acompanhamento da jornada de adesão.
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-[0_4px_14px_0_rgba(14,165,233,0.35)] font-bold border-0">
              Aplicar Protocolo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-extrabold">Aplicar Protocolo</DialogTitle>
              <DialogDescription>
                Selecione um protocolo da biblioteca para iniciar o tratamento de {patientName}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-5">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="space-y-2">
                  <Label>Protocolo</Label>
                  <Select value={selectedProtocolId} onValueChange={setSelectedProtocolId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um protocolo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {protocols?.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} ({p.durationWeeks} semanas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tarefas personalizadas (opcional)</Label>
                {extraTasks.length > 0 && (
                  <ul className="space-y-1.5">
                    {extraTasks.map((t, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm bg-muted/50 border rounded-xl px-3 py-1.5">
                        <span className="flex-1 truncate text-left">{t.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {t.frequency === 'daily' ? 'Diária' : 'Semanal'}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remover ${t.title}`}
                          onClick={() => setExtraTasks(prev => prev.filter((_, j) => j !== i))}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Caminhada leve 20min"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExtraTask(); } }}
                    className="flex-1"
                  />
                  <Select value={taskFrequency} onValueChange={setTaskFrequency}>
                    <SelectTrigger className="w-[110px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={addExtraTask} disabled={!taskTitle.trim()} aria-label="Adicionar tarefa">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  <Label className="text-xs text-muted-foreground font-normal shrink-0">Categoria:</Label>
                  <Select value={taskCategory} onValueChange={setTaskCategory}>
                    <SelectTrigger className="h-8 text-xs w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="habit">Hábito</SelectItem>
                      <SelectItem value="nutrition">Nutrição</SelectItem>
                      <SelectItem value="exercise">Exercício</SelectItem>
                      <SelectItem value="hydration">Hidratação</SelectItem>
                      <SelectItem value="medication">Medicação</SelectItem>
                      <SelectItem value="measurement">Medição</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleApply}
                disabled={!selectedProtocolId || createTreatment.isPending}
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-0 font-bold"
              >
                {createTreatment.isPending ? "Aplicando..." : "Confirmar e Iniciar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
