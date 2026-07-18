import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Mail, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useGetProfessionalProfile, useUpdateProfessionalProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Settings() {
  const { data: profile, isLoading, isError, refetch } = useGetProfessionalProfile();
  const updateMutation = useUpdateProfessionalProfile();

  const [notificationEmail, setNotificationEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Populate form once profile loads
  useEffect(() => {
    if (profile?.notificationEmail) {
      setNotificationEmail(profile.notificationEmail);
    }
  }, [profile?.notificationEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setSaveError(null);

    try {
      await updateMutation.mutateAsync({ data: { notificationEmail } });
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Não foi possível salvar. Tente novamente.");
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-[0_4px_14px_0_rgba(14,165,233,0.3)]">
          <SettingsIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Preferências da sua conta profissional</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden max-w-xl">
        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-sky-500" />
            <h2 className="font-bold text-sm">E-mail de notificação</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Alertas de risco alto serão enviados para este endereço. Se em branco, usa o e-mail
            padrão configurado no servidor.
          </p>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando…
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 text-sm text-destructive py-4">
              <AlertCircle className="w-4 h-4" />
              Não foi possível carregar o perfil.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Read-only auth email for context */}
              {profile?.email && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">
                    E-mail da conta (somente leitura)
                  </Label>
                  <Input
                    value={profile.email}
                    readOnly
                    disabled
                    className="bg-muted/40 text-muted-foreground text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="notificationEmail" className="text-xs font-bold">
                  E-mail para receber alertas
                </Label>
                <Input
                  id="notificationEmail"
                  type="email"
                  placeholder="seu@email.com"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Pode ser diferente do e-mail de login, útil em clínicas com vários profissionais.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !notificationEmail.trim()}
                  className="gap-2 font-bold bg-sky-600 hover:bg-sky-700 text-white"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </Button>

                {saved && (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Salvo com sucesso
                  </span>
                )}

                {saveError && (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {saveError}
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
