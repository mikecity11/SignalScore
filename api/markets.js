// Read-only, bounded Polymarket gateway. No API key or trading permissions.
function array(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}
function normalize(m) {
  const outcomes = array(m.outcomes).map(String);
  const rawPrices = array(m.outcomePrices);
  return {
    id: String(m.id), question: String(m.question || 'Untitled market'),
    slug: String(m.slug || ''), conditionId: m.conditionId || null,
    description: String(m.description || ''), endDate: m.endDate || null,
    active: Boolean(m.active), closed: Boolean(m.closed),
    outcomes, prices: outcomes.map((_, i) => {
      const p = rawPrices[i];
      return p !== null && p !== undefined && p !== '' && Number.isFinite(Number(p)) && Number(p) >= 0 && Number(p) <= 1 ? Number(p) : null;
    }),
    volume24hr: Number.isFinite(Number(m.volume24hr)) ? Number(m.volume24hr) : null,
    resolutionSource: String(m.resolutionSource || ''),
    resolutionStatus: String(m.resolutionStatus || m.umaResolutionStatus || ''),
    category: String(m.category || m.events?.[0]?.category || 'Prediction market'),
    eventSlug: String(m.events?.[0]?.slug || '')
  };
}
async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error: 'Only GET requests are supported.'});
  }
  const params = new URL(req.url, 'https://signalscore.local').searchParams;
  const offsetText = params.get('offset') || '0';
  if (!/^\d{1,5}$/.test(offsetText) || Number(offsetText) > 10000) return res.status(400).json({error: 'Invalid market offset.'});
  const offset = Number(offsetText);
  const upstream = new URL('https://gamma-api.polymarket.com/markets');
  upstream.search = new URLSearchParams({active:'true', closed:'false', limit:'24', offset:String(offset), order:'volume24hr', ascending:'false'}).toString();
  try {
    const response = await fetch(upstream, {signal: AbortSignal.timeout(12000), headers:{Accept:'application/json'}});
    if (!response.ok) throw new Error('Upstream status ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Unexpected upstream response');
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({source:'Polymarket Gamma API', fetchedAt:new Date().toISOString(), markets:data.filter(m=>m && m.id && m.question).map(normalize), nextOffset:data.length === 24 ? offset + 24 : null});
  } catch (error) {
    console.error('Market feed unavailable:', error.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({error:'Polymarket data is temporarily unavailable. Please try again shortly.'});
  }
}
module.exports = handler;
module.exports.normalize = normalize;
