const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!configuredUrl || configuredUrl.startsWith('/')) {
  throw new Error('Defina NEXT_PUBLIC_API_URL com o endereço do backend, incluindo o host.');
}

const url = new URL(configuredUrl.includes('://') ? configuredUrl : `https://${configuredUrl}`);
if (url.protocol !== 'https:' && url.protocol !== 'http:') {
  throw new Error('NEXT_PUBLIC_API_URL precisa usar HTTP ou HTTPS.');
}

export const API_BASE_URL = url.href.replace(/\/+$/, '');
