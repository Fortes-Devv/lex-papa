"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { MediaUploader } from "@/components/upload/media-uploader";
import { updateProfile, changePassword, updateAvatar } from "@/lib/actions/profile";

export interface AccountUser {
  name: string;
  email: string;
  avatar?: string;
  bio: string;
  phone: string;
  location: string;
  roleLabel: string;
}

export function AccountProfileForm({ user }: { user: AccountUser }) {
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
                  <Badge variant="secondary" className="mt-1">{user.roleLabel}</Badge>
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

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Alterar senha</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Senha atual" type="password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} />
              <Input label="Nova senha" type="password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} />
              <Input label="Confirmar nova senha" type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
            </CardContent>
            <CardFooter><Button onClick={handleChangePassword} loading={savingPwd}>Alterar senha</Button></CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
