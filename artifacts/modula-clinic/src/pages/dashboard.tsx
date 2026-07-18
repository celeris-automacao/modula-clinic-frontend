import { useListPatients, useGetDashboardSummary } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge, TrendIcon, RadarScore } from "@/components/adherence-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { AlertCircle, ArrowRight, Activity, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: patients, isLoading: loadingPatients } = useListPatients();
  const [, setLocation] = useLocation();

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
          title="Atenção Imediata"
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

      {/* Patient Table Card */}
      <div className="bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-card-border overflow-hidden relative">
        {/* Top gradient bar */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-sky-400 via-blue-500 to-teal-400" />

        <div className="p-7 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-foreground mb-0.5">Radar de Adesão</h2>
            <p className="text-sm text-muted-foreground font-medium">Pacientes ordenados por nível de risco</p>
          </div>
        </div>

        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                <th className="px-5 py-3 font-bold">Paciente</th>
                <th className="px-5 py-3 font-bold">Protocolo</th>
                <th className="px-5 py-3 font-bold text-right">Adesão</th>
                <th className="px-2 py-3 w-[72px]"></th>
                <th className="px-5 py-3 font-bold">Risco</th>
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
                    <td className="px-5 py-4 border-y border-border"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-5 py-4 border-y border-border"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    <td className="px-2 py-4 border-y border-border"><Skeleton className="h-5 w-5 mx-auto" /></td>
                    <td className="px-5 py-4 border-y border-border"><Skeleton className="h-6 w-24" /></td>
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
                    <td className="px-5 py-4 whitespace-nowrap rounded-l-xl border-y border-l border-border group-hover:border-sky-200/60 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-foreground text-sm">{patient.name}</span>
                        <span className="text-xs text-muted-foreground font-medium truncate max-w-[200px] mt-0.5">{patient.goal}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-y border-border group-hover:border-sky-200/60 transition-colors">
                      {patient.protocolName ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-muted text-foreground/70">
                          {patient.protocolName}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic font-medium">Sem protocolo</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right border-y border-border group-hover:border-sky-200/60 transition-colors">
                      {patient.hasActiveTreatment ? (
                        <RadarScore score={patient.adherenceScore} size="md" />
                      ) : (
                        <span className="text-muted-foreground/40 font-bold text-lg">—</span>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-center border-y border-border group-hover:border-sky-200/60 transition-colors">
                      {patient.hasActiveTreatment && <TrendIcon trend={patient.trend} className="w-5 h-5 mx-auto" />}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-y border-border group-hover:border-sky-200/60 transition-colors">
                      {patient.hasActiveTreatment ? (
                        <RiskBadge level={patient.riskLevel} />
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold border border-border text-muted-foreground/60">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right rounded-r-xl border-y border-r border-border group-hover:border-sky-200/60 transition-colors">
                      <button className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-muted text-muted-foreground group-hover:bg-sky-500 group-hover:text-white group-hover:shadow-[0_4px_14px_0_rgba(14,165,233,0.35)] transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </button>
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
