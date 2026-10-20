import { Amplify } from 'aws-amplify';
import { fetchAuthSession, signInWithRedirect, signOut } from 'aws-amplify/auth';
import 'aws-amplify/auth/enable-oauth-listener';

export type CognitoUser = {
  id: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
};

let configured = false;

export function configureAuth() {
  if (configured || typeof window === 'undefined') return;

  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID?.trim();
  const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID?.trim();
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN?.trim()
    .replace(/^https:\/\//, '')
    .replace(/\/+$/, '');

  if (!userPoolId || !userPoolClientId || !domain) {
    return;
  }

  const redirectUri =
    process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN?.trim() ||
    `${window.location.origin}/login`;

  const redirectSignOutUri =
    process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT?.trim() ||
    window.location.origin;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          oauth: {
            domain,
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [redirectUri],
            redirectSignOut: [redirectSignOutUri],
            responseType: 'code',
          },
        },
      },
    },
  });

  configured = true;
}

export async function getSessionUser(): Promise<CognitoUser | null> {
  configureAuth();
  try {
    const { tokens } = await fetchAuthSession();
    const claims = tokens?.idToken?.payload;
    if (!claims || typeof claims.sub !== 'string') return null;

    return {
      id: claims.sub,
      displayName:
        typeof claims.name === 'string'
          ? claims.name
          : typeof claims.email === 'string'
          ? claims.email
          : 'Usuário AltStream',
      email: typeof claims.email === 'string' ? claims.email : null,
      photoURL: typeof claims.picture === 'string' ? claims.picture : null,
    };
  } catch {
    return null;
  }
}

export async function getIdToken(): Promise<string> {
  configureAuth();
  const { tokens } = await fetchAuthSession();
  const token = tokens?.idToken?.toString();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  return token;
}

export async function signInWithGoogle() {
  configureAuth();
  await signInWithRedirect({ provider: 'Google' });
}

export async function logout() {
  configureAuth();
  await signOut();
}