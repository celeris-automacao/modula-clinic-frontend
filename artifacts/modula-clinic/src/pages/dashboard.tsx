import {
  useListPatients,
  useGetDashboardSummary,
  useListAlerts,
  useMarkAlertRead,
  useNotifyPatient,
  getListPatientsQueryKey,
  getGetDashboardSummaryQueryKey,
  getListAlertsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { RiskBadge, TrendIcon, RadarScore } from "@/components/adherence-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { AlertCircle, ArrowRight, Activity, Users, FileText, BellRing, Check, Send, LogIn, ShieldAlert, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Skeleton as LoadingSkeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { isAuthenticated, isLoading: loadingAuth, login } = useAuth();
  const enabled = isAuthenticated;
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { enabled, queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { data: patients, isLoading: loadingPatients } = useListPatients({
    query: { enabled, queryKey: getListPatientsQueryKey(), refetchInterval: 30_000 },
  });
  const { data: alerts } = useListAlerts({
    query: { enabled, queryKey: getListAlertsQueryKey(), refetchInterval: 30_000 },
  });
  const queryClient = useQueryClient();
  const markReadMutation = useMarkAlertRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      },
    },
  });
  const markRead = {
    mutate: (id: number) => markReadMutation.mutate({ id }),
    isPending: markReadMutation.isPending,
  };
  const sendReminder = useNotifyPatient();
  const [reminderSentLocal, setReminderSentLocal] = useState<Record<number, boolean>>({});
  const [noPushToken, setNoPushToken] = useState<Record<number, boolean>>({});
  const [, setLocation] = useLocation();

  /** True if the patient already received a reminder today (server-side or this session) */
  function reminderAlreadySentToday(patient: { id: number; lastReminderAt?: string | null }): boolean {
    if (reminderSentLocal[patient.id]) return true;
    if (!patient.lastReminderAt) return false;
    return patient.lastReminderAt.slice(0, 10) === new Date().toISOString().slice(0, 10);
  }

  function handleSendReminder(e: React.MouseEvent, patientId: number, hasPushToken: boolean) {
    e.stopPropagation();
    if (!hasPushToken) {
      setNoPushToken((prev) => ({ ...prev, [patientId]: true }));
      return;
    }
    sendReminder.mutate({ id: patientId }, {
      onSuccess: (data) => {
        if (data.sent) {
          setReminderSentLocal((prev) => ({ ...prev, [patientId]: true }));
        }
      },
    });
  }

  const unreadAlerts = alerts?.filter((a) => !a.readAt) ?? [];

  // Dados de pacientes são privados: exige login antes de mostrar o painel
  if (loadingAuth) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-10 w-64" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-500">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Área restrita a profissionais</h1>
        <p className="text-muted-foreground font-medium max-w-md">
          Os dados dos pacientes são privados. Entre com sua conta para acessar o Painel Clínico.
        </p>
        <Button onClick={login} size="lg" className="font-bold gap-2 mt-2">
          <LogIn className="w-4 h-4" />
          Entrar para continuar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-1.5">Painel Clínico</h1>
          <p className="text-muted-foreground font-medium text-base">Visão geral da adesão e pacientes que precisam de atenção.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border text-sm font-bold text-foreground/70 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Atualizado agora
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total de Pacientes"
          value={summary?.totalPatients}
          icon={Users}
          loading={loadingSummary}
        />
        <SummaryCard
          title="Adesão Média"
          value={summary ? `${summary.avgAdherence.toFixed(0)}%` : undefined}
          icon={Activity}
          loading={loadingSummary}
        />
        <SummaryCard
          title="Alto Risco"
          value={summary?.highRisk}
          icon={AlertCircle}
          loading={loadingSummary}
          valueClassName={summary?.highRisk ? "bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-red-600" : ""}
        />
        <SummaryCard
          title="Registros Hoje"
          value={summary?.logsToday}
          icon={FileText}
          loading={loadingSummary}
        />
      </div>

      {/* Alerts Panel */}
      {unreadAlerts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-rose-200 dark:border-rose-800/50">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-rose-700 dark:text-rose-300 tracking-tight">
                {unreadAlerts.length === 1
                  ? "1 alerta de risco alto"
                  : `${unreadAlerts.length} alertas de risco alto`}
              </h2>
              <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">
                Pacientes que precisam de atenção imediata
              </p>
            </div>
          </div>
          <div className="divide-y divide-rose-200/60 dark:divide-rose-800/30">
            {unreadAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-rose-100/60 dark:hover:bg-rose-900/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <div className="min-w-0">
                    <button
                      className="text-sm font-bold text-rose-700 dark:text-rose-300 hover:underline truncate block text-left"
                      onClick={() => setLocation(`/pacientes/${alert.patientId}`)}
                    >
                      {alert.patientName}
                    </button>
                    <p className="text-xs text-rose-500/80 dark:text-rose-400/80 font-medium truncate">
                      {alert.message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-rose-400 dark:text-rose-500 font-medium whitespace-nowrap">
                    {formatDistanceToNow(new Date(alert.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                  <button
                    onClick={() => markRead.mutate(alert.id)}
                    disabled={markRead.isPending}
                    title="Marcar como lido"
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-200/60 dark:hover:bg-rose-800/40 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patient Table Card — BR-080: ordenado por risco, BR-081: Nome + Score + Radar + Insight */}
      <div className="bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-card-border overflow-hidden relative">
        {/* Top gradient bar */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-sky-400 via-blue-500 to-teal-400" />

        <div className="p-7 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-foreground mb-0.5">Radar de Adesão</h2>
            <p className="text-sm text-muted-foreground font-medium">Pacientes ordenados por nível de risco (BR-080)</p>
          </div>
        </div>

        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                <th className="px-5 py-3 font-bold">Paciente</th>
                <th className="px-5 py-3 font-bold text-right">Adesão</th>
                <th className="px-2 py-3 w-[56px]"></th>
                <th className="px-5 py-3 font-bold">Risco</th>
                {/* BR-081: Insight resumido */}
                <th className="px-5 py-3 font-bold hidden lg:table-cell">Último Insight IA</th>
                <th className="px-5 py-3 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loadingPatients ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4 rounded-l-xl border-y border-l border-border">
                      <Skeleton className="h-5 w-32" />
                    </td>
                    <td className="px-5 py-4 border-y border-border"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    <td className="px-2 py-4 border-y border-border"><Skeleton className="h-5 w-5 mx-auto" /></td>
                    <td className="px-5 py-4 border-y border-border"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-5 py-4 border-y border-border hidden lg:table-cell"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-5 py-4 rounded-r-xl border-y border-r border-border">
                      <Skeleton className="h-9 w-9 ml-auto rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : patients?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground font-medium">
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              ) : (
                patients?.map((patient) => (
                  <tr
                    key={patient.id}
                    className="group transition-all bg-card hover:bg-muted/40 shadow-[0_2px_10px_rgb(0,0,0,0.02)] cursor-pointer hover:shadow-[0_4px_20px_rgb(0,0,0,0.05)] hover:-translate-y-0.5"
                    onClick={() => setLocation(`/pacientes/${patient.id}`)}
                  >
                    {/* BR-081: Nome */}
                    <td className="px-5 py-4 whitespace-nowrap rounded-l-xl border-y border-l border-border group-hover:border-sky-200/60 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-foreground text-sm">{patient.name}</span>
                        <span className="text-xs text-muted-foreground font-medium truncate max-w-[200px] mt-0.5">{patient.goal}</span>
                      </div>
                    </td>
                    {/* BR-081: Score */}
                    <td className="px-5 py-4 whitespace-nowrap text-right border-y border-border group-hover:border-sky-200/60 transition-colors">
                      {patient.hasActiveTreatment ? (
                        <RadarScore score={patient.adherenceScore} size="md" />
                      ) : (
                        <span className="text-muted-foreground/40 font-bold text-lg">—</span>
                      )}
                    </td>
                    {/* BR-081: Radar (tendência) */}
                    <td className="px-2 py-4 whitespace-nowrap text-center border-y border-border group-hover:border-sky-200/60 transition-colors">
                      {patient.hasActiveTreatment && <TrendIcon trend={patient.trend} className="w-5 h-5 mx-auto" />}
                    </td>
                    {/* BR-081: Nível de risco */}
                    <td className="px-5 py-4 whitespace-nowrap border-y border-border group-hover:border-sky-200/60 transition-colors">
                      {patient.hasActiveTreatment ? (
                        <RiskBadge level={patient.riskLevel} />
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold border border-border text-muted-foreground/60">
                          Inativo
                        </span>
                      )}
                    </td>
                    {/* BR-081: Insight resumido */}
                    <td className="px-5 py-4 border-y border-border group-hover:border-sky-200/60 transition-colors hidden lg:table-cell max-w-[260px]">
                      {patient.insightSummary ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{patient.insightSummary}</p>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">Nenhum insight gerado</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right rounded-r-xl border-y border-r border-border group-hover:border-sky-200/60 transition-colors">
                      <div className="flex items-center justify-end gap-2">
                        {/* No-push-token indicator: visible for all patients without a registered token */}
                        {!patient.hasPushToken && (
                          <span
                            title="Paciente ainda não ativou as notificações no app"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground/40"
                          >
                            <BellOff className="w-4 h-4" />
                          </span>
                        )}
                        {patient.riskLevel === "high" && (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              title={
                                reminderAlreadySentToday(patient)
                                  ? "Lembrete já enviado hoje"
                                  : !patient.hasPushToken
                                    ? "Paciente sem notificações ativas"
                                    : "Enviar lembrete ao paciente"
                              }
                              disabled={sendReminder.isPending || reminderAlreadySentToday(patient)}
                              onClick={(e) => handleSendReminder(e, patient.id, patient.hasPushToken)}
                              className={cn(
                                "inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all",
                                reminderAlreadySentToday(patient)
                                  ? "bg-emerald-100 text-emerald-600 cursor-default opacity-60"
                                  : !patient.hasPushToken
                                    ? "bg-muted text-muted-foreground/50 cursor-pointer hover:bg-amber-50 hover:text-amber-500"
                                    : "bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-[0_4px_14px_0_rgba(244,63,94,0.35)]",
                              )}
                            >
                              {reminderAlreadySentToday(patient) ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                            </button>
                            {noPushToken[patient.id] && (
                              <span className="text-[10px] text-amber-600 font-medium whitespace-nowrap max-w-[140px] text-right leading-tight">
                                Este paciente ainda não ativou as notificações no app
                              </span>
                            )}
                          </div>
                        )}
                        <button className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-muted text-muted-foreground group-hover:bg-sky-500 group-hover:text-white group-hover:shadow-[0_4px_14px_0_rgba(14,165,233,0.35)] transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, loading, valueClassName }: {
  title: string;
  value?: number | string;
  icon: any;
  loading: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-card p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-card-border transition-all hover:-translate-y-1 hover:shadow-[0_8px_40px_rgb(14,165,233,0.10)] group">
      {/* Ghost icon watermark */}
      <div className="absolute -top-4 -right-4 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity transform group-hover:scale-110 pointer-events-none">
        <Icon className="w-28 h-28" />
      </div>
      <div className="flex flex-row items-center justify-between mb-4 relative z-10">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
        <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 rounded-xl text-sky-500 group-hover:bg-gradient-to-br group-hover:from-sky-400 group-hover:to-blue-600 group-hover:text-white transition-all shadow-sm">
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div className="relative z-10">
        {loading ? (
          <Skeleton className="h-10 w-20" />
        ) : (
          <div className={cn("text-4xl font-extrabold text-foreground tracking-tight", valueClassName)}>
            {value ?? 0}
          </div>
        )}
      </div>
    </div>
  );
}
