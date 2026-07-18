import { useMemo, useState } from "react";
import {
  useListProtocols,
  useListPatients,
  useCreateProtocol,
  getListProtocolsQueryKey,
  getListPatientsQueryKey,
  ProtocolTaskInputCategory,
  ProtocolTaskInputFrequency,
  type Protocol
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Clock, ListChecks, Trash2, Search, Star, Eye, ArrowRight, SearchX, User, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// BR-031: tipos oficiais de tarefa
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

const TASK_TYPE_LABELS: Record<string, string> = {
  ...Object.fromEntries(TASK_TYPES.map((t) => [t.value, t.label])),
};

const ORIGIN_FILTERS = [
  { id: "preset", label: "Modula Original" },
  { id: "custom", label: "Clínica" },
] as const;

export default function ProtocolStudio() {
  const { data: protocols, isLoading } = useListProtocols();
  const [, navigate] = useLocation();
  const [, detailParams] = useRoute("/protocolos/:id");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [usingProtocol, setUsingProtocol] = useState<Protocol | null>(null);

  // Detail modal driven by /protocolos/:id (deep-linkable)
  const detailId = detailParams?.id ? parseInt(detailParams.id) : null;
  const detailProtocol = detailId ? protocols?.find(p => p.id === detailId) ?? null : null;

  // Category chips derived from the loaded protocols
  const taskCategoryFilters = useMemo(() => {
    const cats = new Set<string>();
    protocols?.forEach(p => p.tasks?.forEach(t => t.category && cats.add(t.category)));
    return Array.from(cats).map(c => ({ id: `cat:${c}`, label: TASK_TYPE_LABELS[c] ?? c }));
  }, [protocols]);

  const filtered = useMemo(() => {
    if (!protocols) return [];
    return protocols.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (filter === "all") return true;
      if (filter === "preset") return !!p.isPreset;
      if (filter === "custom") return !p.isPreset;
      if (filter.startsWith("cat:")) {
        const cat = filter.slice(4);
        return p.tasks?.some(t => t.category === cat) ?? false;
      }
      return true;
    });
  }, [protocols, search, filter]);

  const closeDetail = () => navigate("/protocolos");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-1.5">Protocol Studio</h1>
        <p className="text-muted-foreground font-medium">Pesquise ou escolha um protocolo para iniciar um tratamento</p>
      </div>

      {/* Search + Category filters */}
      <div className="space-y-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar protocolo..."
            aria-label="Buscar protocolo pelo nome"
            className="pl-10 h-11 rounded-xl bg-card shadow-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar protocolos por categoria">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Todos</FilterChip>
          {ORIGIN_FILTERS.map(f => (
            <FilterChip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</FilterChip>
          ))}
          {taskCategoryFilters.map(f => (
            <FilterChip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</FilterChip>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-card-border p-6 space-y-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-card rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
                <SearchX className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-extrabold text-foreground mb-1">Nenhum protocolo encontrado</h3>
              <p className="text-sm text-muted-foreground font-medium max-w-sm mb-4">
                Ajuste a busca ou os filtros, ou crie um protocolo personalizado para a sua clínica.
              </p>
              <Button variant="outline" className="font-bold" onClick={() => { setSearch(""); setFilter("all"); }}>
                Limpar busca e filtros
              </Button>
            </div>
          </div>
        ) : (
          <>
            {filtered.map(protocol => (
              <ProtocolCard
                key={protocol.id}
                protocol={protocol}
                onDetails={() => navigate(`/protocolos/${protocol.id}`)}
                onUse={() => setUsingProtocol(protocol)}
              />
            ))}
            {/* Criar protocolo personalizado */}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="bg-card rounded-2xl border-2 border-dashed border-border hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/40 dark:hover:bg-sky-950/20 transition-all flex flex-col items-center justify-center text-center p-8 min-h-[220px] group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400/20 to-blue-500/10 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6 text-sky-500" />
              </div>
              <span className="text-base font-extrabold text-foreground tracking-tight">Criar protocolo personalizado</span>
              <span className="text-sm text-muted-foreground font-medium mt-1">Monte um protocolo sob medida para sua clínica</span>
            </button>
          </>
        )}
      </div>

      <CreateProtocolDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Detail modal via /protocolos/:id */}
      <ProtocolDetailModal
        protocol={detailProtocol}
        open={!!detailId}
        loading={isLoading}
        notFound={!isLoading && !!detailId && !detailProtocol}
        onClose={closeDetail}
        onUse={(p) => { setUsingProtocol(p); closeDetail(); }}
      />

      {/* Usar protocolo → patient picker → existing apply flow */}
      <UseProtocolDialog protocol={usingProtocol} onClose={() => setUsingProtocol(null)} />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
        active
          ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white border-transparent shadow-[0_4px_14px_0_rgba(14,165,233,0.30)]"
          : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-sky-300 dark:hover:border-sky-700"
      )}
    >
      {children}
    </button>
  );
}

function ProtocolCard({ protocol, onDetails, onUse }: { protocol: Protocol; onDetails: () => void; onUse: () => void }) {
  const taskCount = protocol.tasks?.length || 0;
  const days = (protocol.durationWeeks ?? 0) * 7;

  return (
    <div className="bg-card rounded-2xl border border-card-border overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_8px_40px_rgb(14,165,233,0.10)] transition-all group flex flex-col relative">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-sky-400 via-blue-500 to-teal-400" />

      <div className="p-6 pb-4 pt-7 flex-1">
        <div className="flex justify-between items-start mb-3 gap-2">
          {protocol.isPreset ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold bg-gradient-to-r from-sky-400/20 to-blue-500/10 text-sky-600 border border-sky-200/60">
              Modula Original
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold border border-border text-muted-foreground">
              Clínica
            </span>
          )}
          {protocol.isPreset && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 px-2.5 py-1.5 rounded-xl shrink-0">
              <Star className="w-3 h-3 fill-current" /> Recomendado
            </span>
          )}
        </div>
        <h3 className="text-lg font-extrabold text-foreground tracking-tight mb-1">{protocol.name}</h3>
        <p className="text-sm text-muted-foreground font-medium line-clamp-2 mb-3">{protocol.description}</p>

        {/* Summary line */}
        <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 bg-muted px-2.5 py-1.5 rounded-xl">
            <ListChecks className="w-3.5 h-3.5" /> {taskCount} tarefa{taskCount !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-muted px-2.5 py-1.5 rounded-xl">
            <Clock className="w-3.5 h-3.5" /> ~{days} dias
          </span>
        </div>
      </div>

      <div className="px-6 pb-6 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 font-bold gap-1.5" onClick={onDetails}>
          <Eye className="w-3.5 h-3.5" /> Ver detalhes
        </Button>
        <Button
          size="sm"
          className="flex-1 font-bold gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-0"
          onClick={onUse}
        >
          Usar protocolo <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ProtocolDetailModal({
  protocol, open, loading, notFound, onClose, onUse,
}: {
  protocol: Protocol | null;
  open: boolean;
  loading: boolean;
  notFound: boolean;
  onClose: () => void;
  onUse: (p: Protocol) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : notFound || !protocol ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-extrabold">Protocolo não encontrado</DialogTitle>
              <DialogDescription>Este protocolo não existe ou foi removido.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Voltar ao Studio</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {protocol.isPreset ? (
                  <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400 border-0">Modula Original</Badge>
                ) : (
                  <Badge variant="outline">Clínica</Badge>
                )}
                {protocol.isPreset && (
                  <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 gap-1">
                    <Star className="w-3 h-3 fill-current" /> Recomendado
                  </Badge>
                )}
              </div>
              <DialogTitle className="font-extrabold text-xl">{protocol.name}</DialogTitle>
              <DialogDescription className="text-sm">
                {protocol.description || "Sem descrição."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 bg-muted px-2.5 py-1.5 rounded-xl">
                <Clock className="w-3.5 h-3.5" /> {protocol.durationWeeks} semanas (~{(protocol.durationWeeks ?? 0) * 7} dias)
              </span>
              <span className="inline-flex items-center gap-1.5 bg-muted px-2.5 py-1.5 rounded-xl">
                <ListChecks className="w-3.5 h-3.5" /> {protocol.tasks?.length || 0} tarefas
              </span>
            </div>

            <div className="space-y-2 py-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tarefas do protocolo</span>
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {protocol.tasks?.map(task => (
                  <li key={task.id} className="flex items-center justify-between gap-2 bg-muted/50 rounded-xl px-3.5 py-2.5">
                    <span className="text-sm font-medium text-foreground/90 truncate">{task.title}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {TASK_TYPE_LABELS[task.category ?? ""] ?? task.category}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {task.frequency === "daily" ? "Diário" : "Semanal"}
                      </Badge>
                    </span>
                  </li>
                ))}
                {(!protocol.tasks || protocol.tasks.length === 0) && (
                  <li className="text-sm text-muted-foreground font-medium text-center py-4">Nenhuma tarefa cadastrada.</li>
                )}
              </ul>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fechar</Button>
              <Button
                onClick={() => onUse(protocol)}
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-0 font-bold gap-1.5"
              >
                Usar protocolo <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Usar protocolo": pick a patient without active treatment, then hand off to the
 * existing apply-protocol flow on the patient detail page with the protocol pre-selected.
 */
function UseProtocolDialog({ protocol, onClose }: { protocol: Protocol | null; onClose: () => void }) {
  const [, navigate] = useLocation();
  const { data: patients, isLoading } = useListPatients({ query: { enabled: !!protocol, queryKey: getListPatientsQueryKey() } });

  const eligible = patients?.filter(p => !p.hasActiveTreatment) ?? [];
  const busy = patients?.filter(p => p.hasActiveTreatment) ?? [];

  return (
    <Dialog open={!!protocol} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-extrabold">Usar protocolo</DialogTitle>
          <DialogDescription>
            Escolha o paciente que iniciará o tratamento com <strong>{protocol?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {isLoading ? (
            <>
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </>
          ) : eligible.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground font-medium">
                Nenhum paciente disponível — todos já possuem um tratamento ativo.
              </p>
            </div>
          ) : (
            eligible.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/pacientes/${p.id}?protocolo=${protocol!.id}`);
                }}
                className="w-full flex items-center gap-3 rounded-xl border border-border bg-card hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/40 dark:hover:bg-sky-950/20 transition-all px-4 py-3 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                  {p.goal && <p className="text-xs text-muted-foreground truncate">{p.goal}</p>}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}

          {busy.length > 0 && (
            <p className="text-xs text-muted-foreground font-medium pt-2">
              <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-500" />
              {busy.length} paciente{busy.length !== 1 ? "s" : ""} com tratamento ativo não {busy.length !== 1 ? "são exibidos" : "é exibido"}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateProtocolDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProtocol = useCreateProtocol();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("4");

  const [tasks, setTasks] = useState<Array<{title: string, category: string, frequency: string}>>([
    { title: "", category: "free_text", frequency: "daily" }
  ]);

  const addTask = () => {
    setTasks([...tasks, { title: "", category: "free_text", frequency: "daily" }]);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: string, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || tasks.some(t => !t.title)) {
      toast({ title: "Erro", description: "Preencha o nome do protocolo e o título de todas as tarefas.", variant: "destructive" });
      return;
    }

    createProtocol.mutate({
      data: {
        name,
        description,
        durationWeeks: parseInt(durationWeeks),
        tasks: tasks.map(t => ({
          title: t.title,
          category: t.category as ProtocolTaskInputCategory,
          frequency: t.frequency as ProtocolTaskInputFrequency
        }))
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProtocolsQueryKey() });
        onOpenChange(false);
        toast({ title: "Protocolo criado com sucesso!" });
        setName("");
        setDescription("");
        setDurationWeeks("4");
        setTasks([{ title: "", category: "free_text", frequency: "daily" }]);
      },
      onError: () => {
        toast({ title: "Erro", description: "Falha ao criar protocolo.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-extrabold text-xl">Novo Protocolo</DialogTitle>
          <DialogDescription>Crie um protocolo personalizado para sua clínica.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Protocolo</Label>
              <Input placeholder="Ex: Emagrecimento Intensivo" value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (Semanas)</Label>
                <Input type="number" min="1" max="52" value={durationWeeks} onChange={e => setDurationWeeks(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Objetivo e metodologia do protocolo..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-base font-bold">Tarefas ({tasks.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTask} className="gap-1.5 font-bold">
                <Plus className="w-4 h-4" /> Adicionar Tarefa
              </Button>
            </div>

            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div key={index} className="flex items-start gap-3 bg-muted/40 p-4 rounded-xl border border-border">
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder="Ex: Beber 2L de água"
                      value={task.title}
                      onChange={e => updateTask(index, 'title', e.target.value)}
                      required
                    />
                    <div className="flex gap-3">
                      <Select value={task.category} onValueChange={v => updateTask(index, 'category', v)}>
                        <SelectTrigger className="flex-1 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={task.frequency} onValueChange={v => updateTask(index, 'frequency', v)}>
                        <SelectTrigger className="w-[120px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diário</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTask(index)}
                    disabled={tasks.length === 1}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="submit"
              disabled={createProtocol.isPending}
              className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-0 font-bold"
            >
              {createProtocol.isPending ? "Criando..." : "Salvar Protocolo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
