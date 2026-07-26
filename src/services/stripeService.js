import { supabase } from './supabaseClient';

async function invoke(fnName, body) {
  const { data, error } = await supabase.functions.invoke(fnName, { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function createCheckoutSession(priceId) {
  const origin = window.location.origin + window.location.pathname;
  const { url } = await invoke('create-checkout-session', {
    priceId,
    successUrl: `${origin}?checkout=success`,
    cancelUrl: `${origin}?checkout=cancelled`,
  });
  return url;
}

export async function createPortalSession() {
  const origin = window.location.origin + window.location.pathname;
  const { url } = await invoke('create-portal-session', { returnUrl: origin });
  return url;
}

export async function deleteAccountRemote() {
  return invoke('delete-account', {});
}
