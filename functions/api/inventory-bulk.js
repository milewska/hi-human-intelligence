/**
 * POST /api/inventory-bulk
 * Returns live inventory for an array of product IDs.
 *
 * Expects JSON body: { productIds: ["prod_xxx", ...] }
 * Env vars: STRIPE_SECRET_KEY
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const STRIPE_KEY = env.STRIPE_SECRET_KEY;

  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const productIds = data.productIds || [];

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return jsonResponse({ error: 'productIds array required' }, 400);
  }

  // Fetch all products in parallel
  const results = {};
  const fetches = productIds.map(async (pid) => {
    try {
      const res = await fetch(
        `https://api.stripe.com/v1/products/${encodeURIComponent(pid)}`,
        { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
      );
      const product = await res.json();
      const inv = parseInt(product.metadata?.inventory ?? '0', 10);
      results[pid] = { inventory: inv, inStock: inv > 0 };
    } catch {
      results[pid] = { inventory: 0, inStock: false };
    }
  });

  await Promise.all(fetches);

  return jsonResponse(results);
}

/* ── Helpers ── */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
