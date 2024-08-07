import { redirect, error } from "@sveltejs/kit";
import { getOrCreateCustomerId, fetchSubscription } from "../subscription_helpers.server";
import type { PageServerLoad } from "./$types";
import { TRADING_212_API_KEY } from "$env/static/private"

export const load: PageServerLoad = async ({
  locals: { safeGetSession, supabaseServiceRole },
}) => {
  const { session } = await safeGetSession();
  if (!session) {
    throw redirect(303, "/login");
  }

  const { error: idError, customerId } = await getOrCreateCustomerId({
    supabaseServiceRole,
    session,
  });
  if (idError || !customerId) {
    throw error(500, {
      message: "Unknown error. If issue persists, please contact us.",
    });
  }

  const {
    primarySubscription,
    hasEverHadSubscription,
    error: fetchErr,
  } = await fetchSubscription({
    customerId,
  });
  if (fetchErr) {
    throw error(500, {
      message: "Unknown error. If issue persists, please contact us.",
    });
  }

  let externalData = null;
  try {
    const resp = await fetch(
      `https://live.trading212.com/api/v0/equity/portfolio`,
      {
        method: 'GET',
        headers: {
          Authorization: TRADING_212_API_KEY,'Content-Type': 'application/json'
        }
      }
    );
    console.log(TRADING_212_API_KEY);
    console.log(resp.status);
    if (!resp.ok) {
      throw new Error('Failed to fetch data from third-party API');
    }

    externalData = await resp.json();
    console.log(externalData);
  } catch (err) {
    console.error('Error fetching third-party data:', err);
  }

  return {
    isActiveCustomer: !!primarySubscription,
    hasEverHadSubscription,
    currentPlanId: primarySubscription?.appSubscription?.id,
    externalData,
  };
};

export const actions = {
  signout: async ({ locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (session) {
      await supabase.auth.signOut();
      throw redirect(303, "/");
    }
  },
};
