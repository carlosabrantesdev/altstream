'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Avatar from '../components/Avatar';
import { useAuth } from '../components/AuthProvider';
import { useProfile } from '../components/ProfileProvider';
import { validateProfileImage } from '@/services/profile-image';
import type { DisplayProfile, ProfileDraft, StoredProfile } from '@/services/profile';

function ProfileForm({ profile, save, photoUnavailable, reload }: {
  profile: DisplayProfile;
  save: (draft: ProfileDraft) => Promise<StoredProfile>;
  photoUnavailable: boolean;
  reload: () => void;
}) {
  const [nome, setNome] = useState(profile.nome);
  const [email, setEmail] = useState(profile.email);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    setSuccess(false);
    try {
      validateProfileImage(selected);
      setFile(selected);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível selecionar essa foto.');
    }
  };

  const discard = () => {
    setNome(profile.nome);
    setEmail(profile.email);
    setFile(null);
    setError(null);
    setSuccess(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const saved = await save({ nome, email, arquivo: file });
      setNome(saved.nome);
      setEmail(saved.email);
      setFile(null);
      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível salvar seu perfil. Tente novamente.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const changed = nome !== profile.nome || email !== profile.email || !!file;
  const inputClass = 'w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60';

  return (
    <form onSubmit={submit} aria-busy={saving} className="rounded-3xl bg-surface-container p-6 sm:p-10">
      <fieldset disabled={saving} className="min-w-0">
        <legend className="sr-only">Editar informações do perfil</legend>
        <div className="grid gap-10 md:grid-cols-[200px_minmax(0,1fr)] md:gap-12">
          <section aria-labelledby="photo-heading" className="flex flex-col items-center gap-5 text-center md:border-r md:border-outline-variant/40 md:pr-10">
            <h2 id="photo-heading" className="self-start text-base font-medium md:self-center">Foto de perfil</h2>
            <Avatar name={nome || profile.nome} src={preview || profile.foto} className="h-36 w-36 text-4xl ring-4 ring-background" />
            <div className="flex w-full flex-col items-center gap-3">
              <input ref={fileInput} aria-label="Selecionar foto de perfil" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} className="sr-only" tabIndex={-1} />
              <button type="button" onClick={() => fileInput.current?.click()} className="rounded-full border border-outline-variant px-5 py-2.5 text-sm font-medium hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Alterar foto
              </button>
              <p className="text-xs leading-5 text-on-surface-variant">JPG, PNG ou WebP.<br />Até 4 MB.</p>
              {file && (
                <>
                  <p className="max-w-full break-all text-xs text-primary">{file.name}</p>
                  <button type="button" onClick={() => setFile(null)} className="text-xs text-on-surface-variant underline underline-offset-4 hover:text-on-surface">Descartar foto</button>
                </>
              )}
            </div>
          </section>

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-name" className="text-sm font-medium">Nome</label>
              <input id="profile-name" name="nome" autoComplete="name" value={nome} onChange={event => { setNome(event.target.value); setSuccess(false); }} required maxLength={150} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-email" className="text-sm font-medium">E-mail</label>
              <input id="profile-email" name="email" type="email" autoComplete="email" value={email} onChange={event => { setEmail(event.target.value); setSuccess(false); }} required maxLength={254} aria-describedby="email-help" className={inputClass} />
              <p id="email-help" className="text-xs leading-5 text-on-surface-variant">E-mail de contato do seu perfil. Seu acesso continua com a mesma conta Google.</p>
            </div>
          </div>
        </div>
      </fieldset>

      <div className="mt-8 flex flex-col gap-4 border-t border-outline-variant/40 pt-6">
        {photoUnavailable && !file && (
          <div role="status" className="text-sm leading-6 text-on-surface-variant">
            A foto está salva, mas não foi possível obter o endereço para exibi-la.{' '}
            <button type="button" onClick={reload} disabled={saving || changed} className="text-primary underline underline-offset-4 disabled:opacity-50">Recarregar perfil</button>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        {success && <p role="status" className="text-sm text-primary">Perfil salvo com sucesso.</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" disabled={saving || !changed} onClick={discard} className="rounded-full px-6 py-3 text-sm text-on-surface-variant hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40">Descartar alterações</button>
          <button type="submit" disabled={saving || !nome.trim() || !email.trim()} className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-fixed focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Salvando perfil...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading, error, photoUnavailable, reload, save } = useProfile();

  // Cada visita obtém uma URL de foto nova, inclusive depois de uma sessão longa.
  useEffect(() => { reload(); }, [reload]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-container-margin-mobile pb-10 pt-28 md:px-container-margin md:pt-36">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 rounded text-sm text-on-surface-variant hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
          <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_back</span>
          Voltar ao catálogo
        </Link>
        <div className="mb-8 flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Meu perfil</h1>
          <p className="max-w-xl leading-7 text-on-surface-variant">Atualize seu nome, seu e-mail de contato e sua foto no AltStream.</p>
        </div>
        {authLoading || (user && loading) ? (
          <p role="status" className="rounded-3xl bg-surface-container p-8 text-on-surface-variant">Carregando seu perfil...</p>
        ) : !user ? (
          <div className="flex flex-col items-start gap-5 rounded-3xl bg-surface-container p-8">
            <p>Entre com sua conta Google para editar seu perfil.</p>
            <Link href="/login" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-fixed">Fazer login</Link>
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-5 rounded-3xl bg-surface-container p-8">
            <p role="alert" className="text-error">{error}</p>
            <button type="button" onClick={reload} className="rounded-full border border-outline-variant px-6 py-3 text-sm hover:border-primary hover:text-primary">Tentar novamente</button>
          </div>
        ) : profile ? (
          <ProfileForm profile={profile} save={save} photoUnavailable={photoUnavailable} reload={reload} />
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
