"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { MediaUploader } from "@/components/upload/media-uploader";
import { updateProfile, changePassword, updateAvatar } from "@/lib/actions/profile";

interface ProfileUser {
  name: string;
  email: string;
  avatar?: string;
  bio: string;
  phone: string;
  location: string;
  twoFactorEnabled: boolean;
}
interface Xp { level: number; currentLevelXp: number; nextLevelXp: number; totalXp: number }
interface Achievement { id: string; title: string; description: string; xpReward: number; badgeColor: string }

export function ProfileClient({ user, xp, achievements }: { user: ProfileUser; xp: Xp; achievements: Achievement[] }) {
  const { success, error } = useToast();
  const router = useRouter();
  const [avatar, setAvatar] = useState(user.avatar);
  const [profile, setProfile] = useState({ name: user.name, bio: user.bio, phone: user.phone, location: user.location });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  async function handleSaveProfile() {
    setSavingProfile(true);
    const result = await updateProfile(profile);
    setSavingProfile(false);
    if (!result.success) { error(result.error); return; }
    success("Perfil atualizado!");
    router.refresh();
  }

  async function handleChangePassword() {
    if (pwd.next !== pwd.confirm) { error("As senhas não coincidem."); return; }
    setSavingPwd(true);
    const result = await changePassword({ current: pwd.current, next: pwd.next });
    setSavingPwd(false);
    if (!result.success) { error(result.error); return; }
    success("Senha alterada!");
    setPwd({ current: "", next: "", confirm: "" });
  }

  async function handleAvatar(url: string) {
    setAvatar(url);
    await updateAvatar(url);
    success("Foto atualizada!");
    router.refresh();
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-semibold text-foreground">Meu Perfil</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Informações pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar src={avatar} name={user.name} size="xl" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-foreground-muted">{user.email}</p>
                  <Badge variant="secondary" className="mt-1">Aluno</Badge>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Foto de perfil</label>
                <MediaUploader resourceType="image" folder="lms/avatars" value={avatar} onUploaded={(r) => handleAvatar(r.url)} onRemove={() => handleAvatar("")} />
              </div>
              <Input label="Nome completo" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              <Textarea label="Bio" placeholder="Conte um pouco sobre você..." value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Telefone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
                <Input label="Localização" value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} />
              </div>
            </CardContent>
            <CardFooter><Button onClick={handleSaveProfile} loading={savingProfile}>Salvar alterações</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <Card>
            <CardHeader><CardTitle>XP e Progresso</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center">
                  <Zap className="h-5 w-5" />
                  <span className="text-xs font-bold">{xp.level}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Nível {xp.level}</p>
                  <Progress value={xp.currentLevelXp} max={xp.nextLevelXp} size="sm" showLabel label={`${xp.currentLevelXp} / ${xp.nextLevelXp} XP`} className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
          {achievements.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {achievements.map((ach) => (
                <div key={ach.id} className="rounded-lg border border-border bg-card p-4 flex flex-col items-center gap-2 text-center">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-lg" style={{ background: ach.badgeColor + "20", color: ach.badgeColor }}>★</div>
                  <p className="text-xs font-semibold text-foreground">{ach.title}</p>
                  <p className="text-2xs text-foreground-muted">{ach.description}</p>
                  <Badge variant="default" className="text-2xs">+{ach.xpReward} XP</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-foreground-muted text-center py-6">Complete aulas e cursos para desbloquear conquistas.</p>
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Alterar senha</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Senha atual" type="password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} />
              <Input label="Nova senha" type="password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} />
              <Input label="Confirmar nova senha" type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
            </CardContent>
            <CardFooter><Button onClick={handleChangePassword} loading={savingPwd}>Alterar senha</Button></CardFooter>
          </Card>
          <Card>
            <CardHeader><CardTitle>Autenticação em 2 fatores</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-foreground-muted" />
                  <div>
                    <p className="text-sm font-medium text-foreground">2FA via App Autenticador</p>
                    <p className="text-xs text-foreground-muted">Em breve.</p>
                  </div>
                </div>
                <Badge variant={user.twoFactorEnabled ? "success" : "secondary"}>{user.twoFactorEnabled ? "Ativo" : "Inativo"}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
