import { redirect, error } from "@sveltejs/kit";
import { getOrCreateCustomerId, fetchSubscription } from "../subscription_helpers.server";
import type { PageServerLoad } from "./$types";

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

  return {
    isActiveCustomer: !!primarySubscription,
    hasEverHadSubscription,
    currentPlanId: primarySubscription?.appSubscription?.id,
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

// funcions to get stocks data
// have a t212_helpers
// have a stock_api_helpers
// kinda handle/display all here 