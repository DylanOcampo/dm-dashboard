import { supabase } from './supabaseClient';

async function invoke(fnName, body) {
  const { data, error } = await supabase.functions.invoke(fnName, { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function createCheckoutSession(priceId) {
  // El query param va antes del hash a propósito: la app usa HashRouter
  // (GitHub Pages no soporta rutas reales), y "#/app" hace que vuelva
  // directo al dashboard en vez de a la landing.
  const origin = window.location.origin + window.location.pathname;
  const { url } = await invoke('create-checkout-session', {
    priceId,
    successUrl: `${origin}?checkout=success#/app`,
    cancelUrl: `${origin}?checkout=cancelled#/app`,
  });
  return url;
}

export async function createPortalSession() {
  const origin = window.location.origin + window.location.pathname;
  const { url } = await invoke('create-portal-session', { returnUrl: `${origin}#/app` });
  return url;
}

export async function deleteAccountRemote() {
  return invoke('delete-account', {});
}

export async function cancelSubscriptionRemote() {
  return invoke('cancel-subscription', {});
}
