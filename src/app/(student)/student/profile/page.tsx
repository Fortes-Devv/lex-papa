"use client";
import { useState } from "react";
import { Camera, Shield, Bell, CreditCard, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { MOCK_USER_XP, MOCK_ACHIEVEMENTS } from "@/lib/mock/data";
import { useCurrentUser } from "@/lib/store/hooks";

export default function StudentProfilePage() {
  const user = useCurrentUser();
  const { success } = useToast();
  const [profile, setProfile] = useState({ name: user.name, bio: user.bio ?? "", phone: user.phone ?? "", location: user.location ?? "" });
  const [notify, setNotify] = useState({ email: true, push: false, newLesson: true, promotions: false });

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-semibold text-foreground">Meu Perfil</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Informações pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar src={user.avatar} name={user.name} size="xl" />
                  <button className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors">
                    <Camera className="h-3 w-3" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-foreground-muted">{user.email}</p>
                  <Badge variant="secondary" className="mt-1">Aluno</Badge>
                </div>
              </div>
              <Input label="Nome completo" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              <Textarea label="Bio" placeholder="Conte um pouco sobre você..." value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Telefone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
                <Input label="Localização" value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} />
              </div>
            </CardContent>
            <CardFooter><Button onClick={() => success("Perfil atualizado!")}>Salvar alterações</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <Card>
            <CardHeader><CardTitle>XP e Progresso</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center">
                  <Zap className="h-5 w-5" />
                  <span className="text-xs font-bold">{MOCK_USER_XP.level}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Nível {MOCK_USER_XP.level}</p>
                  <Progress value={MOCK_USER_XP.currentLevelXp} max={MOCK_USER_XP.nextLevelXp} size="sm" showLabel label={`${MOCK_USER_XP.currentLevelXp} / ${MOCK_USER_XP.nextLevelXp} XP`} className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MOCK_ACHIEVEMENTS.map((ach) => (
              <div key={ach.id} className="rounded-lg border border-border bg-card p-4 flex flex-col items-center gap-2 text-center hover:border-primary/30 transition-colors">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-lg" style={{ background: ach.badgeColor + "20", color: ach.badgeColor }}>★</div>
                <p className="text-xs font-semibold text-foreground">{ach.title}</p>
                <p className="text-2xs text-foreground-muted">{ach.description}</p>
                <Badge variant="default" className="text-2xs">+{ach.xpReward} XP</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Preferências de notificação</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <Switch checked={notify.email} onChange={(v) => setNotify((n) => ({ ...n, email: v }))} label="Notificações por email" description="Receba atualizações e novidades por email." />
              <Switch checked={notify.push} onChange={(v) => setNotify((n) => ({ ...n, push: v }))} label="Push notifications" description="Receba notificações no navegador." />
              <Switch checked={notify.newLesson} onChange={(v) => setNotify((n) => ({ ...n, newLesson: v }))} label="Novas aulas publicadas" description="Quando um instrutor publicar uma nova aula." />
              <Switch checked={notify.promotions} onChange={(v) => setNotify((n) => ({ ...n, promotions: v }))} label="Promoções e ofertas" description="Cupons e descontos exclusivos." />
            </CardContent>
            <CardFooter><Button onClick={() => success("Preferências salvas!")}>Salvar</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Alterar senha</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Senha atual" type="password" />
              <Input label="Nova senha" type="password" />
              <Input label="Confirmar nova senha" type="password" />
            </CardContent>
            <CardFooter><Button onClick={() => success("Senha alterada!")}>Alterar senha</Button></CardFooter>
          </Card>
          <Card>
            <CardHeader><CardTitle>Autenticação em 2 fatores</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-foreground-muted" />
                  <div>
                    <p className="text-sm font-medium text-foreground">2FA via App Autenticador</p>
                    <p className="text-xs text-foreground-muted">Google Authenticator, Authy ou similar.</p>
                  </div>
                </div>
                <Badge variant="secondary">Inativo</Badge>
              </div>
            </CardContent>
            <CardFooter><Button variant="outline" onClick={() => success("2FA ativado!")}>Ativar 2FA</Button></CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
