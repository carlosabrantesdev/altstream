import type { Metadata } from 'next';
import ProfilePage from './ProfilePage';

export const metadata: Metadata = { title: 'Meu perfil | AltStream' };

export default function Page() {
  return <ProfilePage />;
}
