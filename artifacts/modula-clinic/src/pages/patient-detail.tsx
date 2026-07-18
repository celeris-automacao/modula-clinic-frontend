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
  usePublishTreatment,
  useCompleteTreatment,
  useCancelTreatment,
  useLinkPatientAccount,
  getGetPatientQueryKey,
  getGetPatientAdherenceQueryKey,
  getGetPatientProgressQueryKey,
  getGetActiveTreatmentQueryKey,
  getGetLatestInsightQueryKey,
  getGetDashboardSummaryQueryKey,
  getListPatientsQueryKey
} from "@workspace/api-client-react";
import {
  useGetPatientTreatments,
  getGetPatientTreatmentsQueryKey,
  type TreatmentHistoryItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RadarScore, RiskBadge, TrendIcon } from "@/components/adherence-ui";
import { AlertCircle, AlertTriangle, BrainCircuit, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Flame, History, Sparkles, Stethoscope, XCircle } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Activity, Link2, Plus, Unlink, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// BR-031: tipos oficiais de tarefa com label em português
const TASK_TYPES = [
  { value: "weight",     label: "Peso" },
  { value: "water",      label: "Água" },
  { value: "nutrition",  label: "Alimentação" },
  { value: "exercise",   label: "Exercício" },
  { value: "sleep",      label: "Sono" },
  { value: "mood",       label: "Humor" },
  { value: "medication", label: "Medicamento" },
  { value: "photo",      label: "Foto" },
  { value: "free_text",  label: "Texto Livre" },
] as const;

const TASK_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TASK_TYPES.map((t) => [t.value, t.label])
);

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

  const { data: treatmentHistory } = useGetPatientTreatments(id, {
    query: { enabled: !!id, queryKey: getGetPatientTreatmentsQueryKey(id) },
  });

  const generateInsight = useGenerateInsight();
  const completeTreatment = useCompleteTreatment();
  const cancelTreatment = useCancelTreatment();
  const [closeTreatmentOpen, setCloseTreatmentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidatePatient = () => {
    queryClient.invalidateQueries({ queryKey: getGetPatientQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getGetActiveTreatmentQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPatientTreatmentsQueryKey(id) });
  };

  const handleCompleteTreatment = () => {
    if (!treatment) return;
    completeTreatment.mutate({ id: treatment.id }, {
      onSuccess: () => {
        invalidatePatient();
        setCloseTreatmentOpen(false);
        toast({ title: "Tratamento encerrado", description: "O tratamento foi marcado como concluído." });
      },
      onError: () => {
        toast({ title: "Erro", description: "Não foi possível encerrar o tratamento.", variant: "destructive" });
      }
    });
  };

  const handleCancelTreatment = () => {
    if (!treatment) return;
    cancelTreatment.mutate({ id: treatment.id }, {
      onSuccess: () => {
        invalidatePatient();
        setCloseTreatmentOpen(false);
        toast({ title: "Tratamento cancelado", description: "O tratamento foi cancelado." });
      },
      onError: () => {
        toast({ title: "Erro", description: "Não foi possível cancelar o tratamento.", variant: "destructive" });
      }
    });
  };

  const handleGenerateInsight = () => {
    generateInsight.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLatestInsightQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
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
        <div className="space-y-4">
          <ApplyProtocolCard patientId={id} patientName={patient.name} />
          <LinkAccountCard patientId={id} linkedUserId={patient.userId ?? null} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-6">

            {/* Adherence Radar Overview — BR-062: Score + Cor + Tendência */}
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
                      {/* BR-061: faixas oficiais 70/40 */}
                      <Progress
                        value={adherence?.weeklyCompletionPct ?? 0}
                        className="h-2.5 mt-2"
                        indicatorClassName={
                          (adherence?.weeklyCompletionPct ?? 0) >= 70 ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                          (adherence?.weeklyCompletionPct ?? 0) >= 40 ? "bg-gradient-to-r from-amber-400 to-orange-400" :
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
                        {/* BR-061: linhas de referência nas faixas oficiais 70/40 */}
                        <ReferenceLine y={70} stroke="rgb(52,211,153)" strokeDasharray="4 4" opacity={0.6} />
                        <ReferenceLine y={40} stroke="rgb(251,113,133)" strokeDasharray="4 4" opacity={0.6} />
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

            {/* AI Insight — BR-072: resumo + fatores observados + sugestão */}
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
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground leading-relaxed">{insight.summary}</p>
                    {/* BR-072: fatores observados */}
                    {insight.observedFactors && (
                      <div className="bg-white/60 dark:bg-card/40 rounded-xl p-3.5 border border-sky-200/40 dark:border-sky-800/20">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500 block mb-1">Fatores Observados</span>
                        <p className="text-sm text-foreground/70">{insight.observedFactors}</p>
                      </div>
                    )}
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
                      {/* BR-031: labels em português */}
                      <span className="font-medium text-foreground/80">{TASK_TYPE_LABELS[cat.category] ?? cat.category}</span>
                      <span className="font-bold text-foreground">{cat.completionPct}%</span>
                    </div>
                    {/* BR-061: faixas oficiais 70/40 */}
                    <Progress
                      value={cat.completionPct}
                      className="h-2"
                      indicatorClassName={
                        cat.completionPct >= 70 ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                        cat.completionPct >= 40 ? "bg-gradient-to-r from-amber-400 to-orange-400" :
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
                        <span className="text-foreground/80">
                          {task.title}{' '}
                          <span className="text-xs text-muted-foreground">
                            ({task.frequency === 'daily' ? 'Diário' : 'Semanal'})
                          </span>
                          {/* BR-032: flag obrigatória */}
                          {task.mandatory && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">Obrigatória</Badge>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* BR-021: Encerrar tratamento — Completed | Cancelled */}
                <Dialog open={closeTreatmentOpen} onOpenChange={setCloseTreatmentOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-muted-foreground hover:text-destructive hover:border-destructive/50 font-semibold mt-2"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Encerrar tratamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-extrabold flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Encerrar tratamento
                      </DialogTitle>
                      <DialogDescription>
                        Escolha como deseja encerrar o tratamento de <strong>{patient?.name}</strong>. Esta ação não pode ser desfeita.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-3">
                      <div className="rounded-xl border border-border p-4 space-y-1.5">
                        <p className="text-sm font-bold text-foreground flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Concluído
                        </p>
                        <p className="text-xs text-muted-foreground">O paciente completou o tratamento com sucesso.</p>
                      </div>
                      <div className="rounded-xl border border-border p-4 space-y-1.5">
                        <p className="text-sm font-bold text-foreground flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-rose-500" /> Cancelado
                        </p>
                        <p className="text-xs text-muted-foreground">O tratamento foi interrompido antes da conclusão.</p>
                      </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCloseTreatmentOpen(false)}
                        disabled={completeTreatment.isPending || cancelTreatment.isPending}
                        className="sm:mr-auto"
                      >
                        Voltar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelTreatment}
                        disabled={completeTreatment.isPending || cancelTreatment.isPending}
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold"
                      >
                        {cancelTreatment.isPending ? "Cancelando..." : "Cancelar tratamento"}
                      </Button>
                      <Button
                        onClick={handleCompleteTreatment}
                        disabled={completeTreatment.isPending || cancelTreatment.isPending}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-0 font-bold"
                      >
                        {completeTreatment.isPending ? "Encerrando..." : "Marcar como concluído"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Link Account Card */}
            <LinkAccountCard patientId={id} linkedUserId={patient.userId ?? null} />

          </div>
        </div>
      )}

      {/* Histórico de tratamentos — read-only, collapsible */}
      {treatmentHistory && treatmentHistory.filter(t => t.status !== 'active').length > 0 && (
        <div className="bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-card-border overflow-hidden">
          <button
            type="button"
            onClick={() => setHistoryOpen(o => !o)}
            className="w-full p-5 flex items-center justify-between hover:bg-muted/40 transition-colors"
          >
            <span className="text-base font-extrabold text-foreground flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-muted-foreground" />
              Histórico de tratamentos
              <Badge variant="secondary" className="ml-1 font-semibold">
                {treatmentHistory.filter(t => t.status !== 'active').length}
              </Badge>
            </span>
            {historyOpen
              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {historyOpen && (
            <div className="border-t border-border divide-y divide-border">
              {treatmentHistory
                .filter(t => t.status !== 'active')
                .map(t => (
                  <div key={t.id} className="p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{t.protocolName}</span>
                        {t.status === 'completed'
                          ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" />Concluído
                            </Badge>
                          : <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0 text-[11px]">
                              <XCircle className="w-3 h-3 mr-1" />Cancelado
                            </Badge>
                        }
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Iniciado em {format(parseISO(t.startedAt), "dd/MM/yyyy", { locale: ptBR })}
                        {' · '}{t.durationWeeks} semana{t.durationWeeks !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn(
                        "text-xl font-extrabold",
                        t.finalAdherenceScore >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                        t.finalAdherenceScore >= 40 ? "text-amber-600 dark:text-amber-400" :
                        "text-rose-600 dark:text-rose-400"
                      )}>
                        {t.finalAdherenceScore}%
                      </span>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Adesão</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinkAccountCard({ patientId, linkedUserId }: { patientId: number; linkedUserId: string | null }) {
  const [userId, setUserId] = useState("");
  const [open, setOpen] = useState(false);
  const linkAccount = useLinkPatientAccount();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isLinked = !!linkedUserId;

  const handleLink = () => {
    const trimmed = userId.trim();
    if (!trimmed) return;
    linkAccount.mutate(
      { id: patientId, data: { userId: trimmed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPatientQueryKey(patientId) });
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
          setOpen(false);
          setUserId("");
          toast({ title: "Conta vinculada", description: "O paciente já pode acessar sua jornada." });
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível vincular a conta.", variant: "destructive" });
        },
      }
    );
  };

  const handleUnlink = () => {
    linkAccount.mutate(
      { id: patientId, data: { userId: null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPatientQueryKey(patientId) });
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
          toast({ title: "Conta desvinculada" });
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível desvincular.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-card-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Link2 className="w-4 h-4 text-sky-500" /> Acesso do Paciente
        </h2>
      </div>
      <div className="p-5 space-y-4">
        {/* Linked account status */}
        {isLinked ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 px-3.5 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Conta vinculada</p>
              <p className="text-sm font-mono text-foreground truncate">{linkedUserId}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-border px-3.5 py-2.5">
            <Unlink className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground font-medium">Nenhuma conta vinculada</p>
          </div>
        )}

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setUserId(""); }}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full font-bold gap-2"
            >
              <Link2 className="w-4 h-4" />
              {isLinked ? "Alterar conta" : "Vincular Conta"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-extrabold">
                {isLinked ? "Alterar Conta do Paciente" : "Vincular Conta do Paciente"}
              </DialogTitle>
              <DialogDescription>
                {isLinked
                  ? `Conta atual: ${linkedUserId}. Informe o novo ID para substituir o vínculo.`
                  : "Informe o ID de usuário Replit do paciente para conectar a conta ao registro clínico."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="user-id-input">ID de usuário Replit</Label>
              <Input
                id="user-id-input"
                placeholder="Ex: 12345678"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLink(); }}
              />
              <p className="text-xs text-muted-foreground">
                O paciente pode encontrar seu ID em Configurações → Conta no app Modula Paciente.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={linkAccount.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleLink}
                disabled={!userId.trim() || linkAccount.isPending}
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-0 font-bold"
              >
                {linkAccount.isPending ? "Salvando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isLinked && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-destructive gap-2 font-medium"
            onClick={handleUnlink}
            disabled={linkAccount.isPending}
          >
            <Unlink className="w-3.5 h-3.5" /> Desvincular conta
          </Button>
        )}
      </div>
    </div>
  );
}

// BR-021: ciclo Draft → Active; BR-003: valida tarefas antes de publicar
function ApplyProtocolCard({ patientId, patientName }: { patientId: number; patientName: string }) {
  const { data: protocols, isLoading } = useListProtocols();
  const createTreatment = useCreateTreatment();
  const publishTreatment = usePublishTreatment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [extraTasks, setExtraTasks] = useState<{ title: string; category: string; frequency: string; mandatory: boolean }[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState<string>("free_text");
  const [taskFrequency, setTaskFrequency] = useState("daily");
  const [taskMandatory, setTaskMandatory] = useState(false);

  const addExtraTask = () => {
    const title = taskTitle.trim();
    if (!title) return;
    setExtraTasks(prev => [...prev, { title, category: taskCategory, frequency: taskFrequency, mandatory: taskMandatory }]);
    setTaskTitle("");
    setTaskMandatory(false);
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetPatientQueryKey(patientId) });
    queryClient.invalidateQueries({ queryKey: getGetActiveTreatmentQueryKey(patientId) });
    queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const handleApply = () => {
    if (!selectedProtocolId) return;
    // Step 1: create treatment as Draft
    createTreatment.mutate(
      {
        data: {
          patientId,
          protocolId: parseInt(selectedProtocolId),
          ...(extraTasks.length > 0 ? { extraTasks: extraTasks as any } : {}),
        }
      },
      {
        onSuccess: (treatment) => {
          // Step 2: publish Draft → Active (BR-003 validates tasks exist on server)
          publishTreatment.mutate(
            { id: treatment.id },
            {
              onSuccess: () => {
                invalidateAll();
                setOpen(false);
                toast({ title: "Protocolo aplicado com sucesso!" });
              },
              onError: (err: any) => {
                invalidateAll();
                setOpen(false);
                toast({
                  title: "Erro ao publicar protocolo",
                  description: err?.message ?? "Verifique se o protocolo tem ao menos uma tarefa.",
                  variant: "destructive",
                });
              }
            }
          );
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível aplicar o protocolo.", variant: "destructive" });
        }
      }
    );
  };

  const isPending = createTreatment.isPending || publishTreatment.isPending;

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
                Selecione um protocolo para iniciar o tratamento de {patientName}.
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
                          {TASK_TYPE_LABELS[t.category] ?? t.category} · {t.frequency === 'daily' ? 'Diária' : 'Semanal'}
                        </span>
                        {t.mandatory && <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">Obrig.</Badge>}
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
                <div className="flex flex-wrap gap-3 items-center">
                  {/* BR-031: tipo oficial */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground font-normal shrink-0">Tipo:</Label>
                    <Select value={taskCategory} onValueChange={setTaskCategory}>
                      <SelectTrigger className="h-8 text-xs w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* BR-032: flag obrigatória */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="mandatory"
                      checked={taskMandatory}
                      onCheckedChange={(v) => setTaskMandatory(!!v)}
                    />
                    <Label htmlFor="mandatory" className="text-xs font-normal cursor-pointer">Obrigatória</Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
              <Button
                onClick={handleApply}
                disabled={!selectedProtocolId || isPending}
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-0 font-bold"
              >
                {isPending ? "Aplicando..." : "Confirmar e Iniciar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
