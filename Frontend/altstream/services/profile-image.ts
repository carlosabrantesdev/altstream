export const MAX_PROFILE_IMAGE_SIZE = 4 * 1024 * 1024;
export const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateProfileImage(file: File) {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  }
  if (file.size === 0) throw new Error('O arquivo está vazio. Escolha outra imagem.');
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error('A foto deve ter no máximo 4 MB.');
  }
}

export async function encodeProfileImage(file: File) {
  validateProfileImage(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:${file.type};base64,${btoa(binary)}`;
}
