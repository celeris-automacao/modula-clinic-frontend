import { useState } from "react";
import {
  useListProtocols,
  useCreateProtocol,
  getListProtocolsQueryKey,
  ProtocolTaskInputCategory,
  ProtocolTaskInputFrequency
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Library, Clock, ListChecks, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProtocolLibrary() {
  const { data: protocols, isLoading } = useListProtocols();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-1.5">Biblioteca de Protocolos</h1>
          <p className="text-muted-foreground font-medium">Gerencie tratamentos predefinidos e crie novos protocolos.</p>
        </div>
        <CreateProtocolDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-card-border p-6 space-y-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ))
        ) : protocols?.map(protocol => (
          <div
            key={protocol.id}
            className="bg-card rounded-2xl border border-card-border overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_8px_40px_rgb(14,165,233,0.10)] transition-all group flex flex-col relative"
          >
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-sky-400 via-blue-500 to-teal-400" />

            <div className="p-6 pb-4 pt-7">
              <div className="flex justify-between items-start mb-3">
                {protocol.isPreset ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold bg-gradient-to-r from-sky-400/20 to-blue-500/10 text-sky-600 border border-sky-200/60">
                    Modula Original
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold border border-border text-muted-foreground">
                    Clínica
                  </span>
                )}
                <div className="flex items-center text-xs text-muted-foreground font-bold bg-muted px-2.5 py-1.5 rounded-xl">
                  <Clock className="w-3 h-3 mr-1.5" />
                  {protocol.durationWeeks} sem
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-foreground tracking-tight mb-1">{protocol.name}</h3>
              <p className="text-sm text-muted-foreground font-medium line-clamp-2">{protocol.description}</p>
            </div>

            <div className="px-6 pb-6 flex-1 flex flex-col justify-end">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5" />
                  {protocol.tasks?.length || 0} Tarefas
                </div>
                <div className="space-y-2">
                  {protocol.tasks?.slice(0, 3).map(task => (
                    <div key={task.id} className="text-sm flex items-center justify-between gap-2">
                      <span className="truncate text-foreground/80 font-medium">{task.title}</span>
                      <span className="text-[10px] uppercase font-bold bg-card border border-border px-2 py-0.5 rounded-lg shadow-sm shrink-0 text-muted-foreground">
                        {task.frequency === 'daily' ? 'Diário' : 'Sem.'}
                      </span>
                    </div>
                  ))}
                  {(protocol.tasks?.length || 0) > 3 && (
                    <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50 font-medium">
                      + {(protocol.tasks?.length || 0) - 3} tarefas
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateProtocolDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProtocol = useCreateProtocol();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("4");

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
        setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-[0_4px_14px_0_rgba(14,165,233,0.30)] border-0 font-bold">
          <Plus className="w-4 h-4" /> Criar Protocolo
        </Button>
      </DialogTrigger>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
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
