/**
 * STS — SaaS Backend (server/server.js)
 * ------------------------------------------------------------------
 * Stack: Node 18+, Express, Supabase (Postgres), JWT, bcrypt
 *
 * Setup:
 *   npm init -y
 *   npm i express cors bcryptjs jsonwebtoken @supabase/supabase-js dotenv
 *   node server.js
 *
 * .env:
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...        (service_role key — server only, never in browser)
 *   JWT_SECRET=change-this-long-random-string
 *   PORT=4000
 *   OPENAI_API_KEY=sk-...              (optional — powers AI replies)
 *   META_VERIFY_TOKEN=sts-verify-123   (WhatsApp/IG webhook verification)
 *   META_WA_TOKEN=EAAG...              (Meta Cloud API access token)
 *
 * Run the SQL in supabase/schema.sql first to create the tables.
 * ------------------------------------------------------------------
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PORT = process.env.PORT || 4000;

/* ================================================================
 * Helpers & middleware
 * ============================================================== */
const sign = (user) =>
  jwt.sign({ id: user.id, role: user.role, business_id: user.business_id }, JWT_SECRET, { expiresIn: '7d' });

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin access required' });

const fail = (res, error, code = 500) => res.status(code).json({ error: error.message || String(error) });

/* ================================================================
 * AUTH
 * ============================================================== */

// POST /api/auth/login  { email, password }
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: user, error } = await supabase
      .from('users').select('*, businesses(name, plan_code, status)')
      .eq('email', String(email).toLowerCase()).single();
    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid credentials' });
    if (user.businesses && user.businesses.status === 'suspended')
      return res.status(403).json({ error: 'Account suspended — contact STS support' });

    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);
    res.json({
      token: sign(user),
      user: {
        id: user.id, email: user.email, role: user.role, name: user.name,
        business_id: user.business_id,
        business_name: user.businesses ? user.businesses.name : null,
        plan: user.businesses ? user.businesses.plan_code : null,
      },
    });
  } catch (e) { fail(res, e); }
});

// GET /api/auth/me
app.get('/api/auth/me', auth, async (req, res) => {
  const { data } = await supabase.from('users')
    .select('id, email, name, role, business_id, businesses(name, plan_code, status)')
    .eq('id', req.user.id).single();
  res.json(data);
});

/* ================================================================
 * PUBLIC — access requests (landing form) + plans
 * ============================================================== */

// POST /api/requests — from index.html "Request Access" form
app.post('/api/requests', async (req, res) => {
  try {
    const { business_name, contact_name, email, whatsapp, interested_plan, message } = req.body;
    if (!business_name || !email) return res.status(400).json({ error: 'business_name and email are required' });
    const { data, error } = await supabase.from('access_requests')
      .insert({ business_name, contact_name, email, whatsapp, interested_plan, message })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { fail(res, e); }
});

// GET /api/plans — public pricing (used by landing + admin)
app.get('/api/plans', async (_req, res) => {
  const { data, error } = await supabase.from('plans').select('*').eq('active', true).order('sort');
  if (error) return fail(res, error);
  res.json(data);
});

/* ================================================================
 * CLIENT — dashboard endpoints (scoped to the caller's business)
 * ============================================================== */
const biz = (req) => req.user.business_id;

// Summary cards for Overview
app.get('/api/me/summary', auth, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [{ count: convToday }, { data: msgs }, { count: leads }] = await Promise.all([
      supabase.from('conversations').select('id', { count: 'exact', head: true })
        .eq('business_id', biz(req)).gte('last_message_at', today.toISOString()),
      supabase.from('conversations').select('mode').eq('business_id', biz(req)),
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('business_id', biz(req)).gte('created_at', today.toISOString()),
    ]);
    const ai = msgs && msgs.length ? Math.round((msgs.filter(m => m.mode === 'ai').length / msgs.length) * 100) : 0;
    res.json({ conversations_today: convToday || 0, ai_resolved: ai, leads: leads || 0 });
  } catch (e) { fail(res, e); }
});

// Conversations list (inbox)
app.get('/api/conversations', auth, async (req, res) => {
  try {
    const q = supabase.from('conversations')
      .select('id, channel, customer_name, customer_handle, mode, unread, last_message_preview, last_message_at')
      .eq('business_id', biz(req)).order('last_message_at', { ascending: false }).limit(100);
    if (req.query.channel) q.eq('channel', req.query.channel);
    const { data, error } = await q;
    if (error) throw error;
    // shape for the client inbox
    res.json(data.map(c => ({
      id: c.id, ch: c.channel, name: c.customer_name || c.customer_handle,
      prev: c.last_message_preview, time: c.last_message_at, unread: c.unread,
      mode: c.mode, phone: c.customer_handle, since: '', orders: 0, msgs: [],
    })));
  } catch (e) { fail(res, e); }
});

// Messages of one conversation
app.get('/api/conversations/:id/messages', auth, async (req, res) => {
  const { data: conv } = await supabase.from('conversations').select('business_id').eq('id', req.params.id).single();
  if (!conv || conv.business_id !== biz(req)) return res.status(404).json({ error: 'Not found' });
  const { data, error } = await supabase.from('messages')
    .select('*').eq('conversation_id', req.params.id).order('created_at');
  if (error) return fail(res, error);
  res.json(data);
});

// Human agent sends a reply (also relays to WhatsApp when configured)
app.post('/api/conversations/:id/messages', auth, async (req, res) => {
  try {
    const { data: conv } = await supabase.from('conversations')
      .select('id, business_id, channel, customer_handle').eq('id', req.params.id).single();
    if (!conv || conv.business_id !== biz(req)) return res.status(404).json({ error: 'Not found' });

    const { data: msg, error } = await supabase.from('messages').insert({
      conversation_id: conv.id, business_id: conv.business_id,
      direction: 'out', sender: req.body.sender || 'human', body: req.body.body,
    }).select().single();
    if (error) throw error;

    await supabase.from('conversations').update({
      last_message_preview: req.body.body, last_message_at: new Date().toISOString(),
    }).eq('id', conv.id);

    // Relay to WhatsApp via Meta Cloud API
    if (conv.channel === 'whatsapp' && process.env.META_WA_TOKEN) {
      const { data: cfg } = await supabase.from('channel_configs')
        .select('meta_phone_number_id').eq('business_id', conv.business_id).eq('channel', 'whatsapp').single();
      if (cfg && cfg.meta_phone_number_id) {
        fetch(`https://graph.facebook.com/v19.0/${cfg.meta_phone_number_id}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.META_WA_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: conv.customer_handle, text: { body: req.body.body } }),
        }).catch(() => {});
      }
    }
    res.status(201).json(msg);
  } catch (e) { fail(res, e); }
});

// Toggle AI / human mode on a conversation
app.patch('/api/conversations/:id', auth, async (req, res) => {
  const { data, error } = await supabase.from('conversations')
    .update({ mode: req.body.mode, unread: req.body.unread })
    .eq('id', req.params.id).eq('business_id', biz(req)).select().single();
  if (error) return fail(res, error);
  res.json(data);
});

// Bot settings (per channel: whatsapp | instagram | voice | web)
app.get('/api/bots/:channel', auth, async (req, res) => {
  const { data } = await supabase.from('bot_settings')
    .select('*').eq('business_id', biz(req)).eq('channel', req.params.channel).single();
  res.json(data || {});
});
app.put('/api/bots/:channel', auth, async (req, res) => {
  const payload = { ...req.body, business_id: biz(req), channel: req.params.channel, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('bot_settings')
    .upsert(payload, { onConflict: 'business_id,channel' }).select().single();
  if (error) return fail(res, error);
  res.json(data);
});

// Knowledge base
app.get('/api/knowledge', auth, async (req, res) => {
  const { data, error } = await supabase.from('knowledge_sources')
    .select('*').eq('business_id', biz(req)).order('created_at', { ascending: false });
  if (error) return fail(res, error);
  res.json(data);
});
app.post('/api/knowledge', auth, async (req, res) => {
  const { data, error } = await supabase.from('knowledge_sources').insert({
    business_id: biz(req), type: req.body.type, title: req.body.title,
    content: req.body.content, source_url: req.body.source_url, status: 'trained',
  }).select().single();
  if (error) return fail(res, error);
  res.status(201).json(data);
});
app.delete('/api/knowledge/:id', auth, async (req, res) => {
  await supabase.from('knowledge_sources').delete().eq('id', req.params.id).eq('business_id', biz(req));
  res.json({ ok: true });
});

// Invoices (client view)
app.get('/api/me/invoices', auth, async (req, res) => {
  const { data, error } = await supabase.from('invoices')
    .select('*').eq('business_id', biz(req)).order('issued_at', { ascending: false });
  if (error) return fail(res, error);
  res.json(data);
});

// Usage
app.get('/api/me/usage', auth, async (req, res) => {
  const { data, error } = await supabase.from('usage_counters')
    .select('*').eq('business_id', biz(req)).eq('period', new Date().toISOString().slice(0, 7));
  if (error) return fail(res, error);
  res.json(data);
});

/* ================================================================
 * ADMIN
 * ============================================================== */

// Access requests
app.get('/api/admin/requests', auth, adminOnly, async (_req, res) => {
  const { data, error } = await supabase.from('access_requests')
    .select('*').eq('status', 'new').order('created_at', { ascending: false });
  if (error) return fail(res, error);
  res.json(data);
});
app.post('/api/admin/requests/:id/approve', auth, adminOnly, async (req, res) => {
  const { data, error } = await supabase.from('access_requests')
    .update({ status: 'approved' }).eq('id', req.params.id).select().single();
  if (error) return fail(res, error);
  res.json(data);
});
app.post('/api/admin/requests/:id/reject', auth, adminOnly, async (req, res) => {
  const { data, error } = await supabase.from('access_requests')
    .update({ status: 'rejected' }).eq('id', req.params.id).select().single();
  if (error) return fail(res, error);
  res.json(data);
});

// Businesses / users
app.get('/api/admin/businesses', auth, adminOnly, async (_req, res) => {
  const { data, error } = await supabase.from('businesses')
    .select('id, name, plan_code, status, mrr, channels, created_at, users(email)')
    .order('created_at', { ascending: false });
  if (error) return fail(res, error);
  res.json(data.map(b => ({
    id: b.id, biz: b.name, email: b.users && b.users[0] ? b.users[0].email : '',
    plan: b.plan_code, mrr: b.mrr, ch: b.channels || [], status: b.status,
  })));
});

// Create business + owner login (the admin onboarding flow)
app.post('/api/admin/businesses', auth, adminOnly, async (req, res) => {
  try {
    const { business_name, owner_name, email, whatsapp, plan_code, password } = req.body;
    const { data: plan } = await supabase.from('plans').select('price_kwd, channels').eq('code', plan_code).single();

    const { data: business, error: e1 } = await supabase.from('businesses').insert({
      name: business_name, whatsapp, plan_code,
      status: plan_code === 'free' ? 'free' : 'paid',
      mrr: plan ? plan.price_kwd : 0, channels: plan ? plan.channels : ['wa'],
    }).select().single();
    if (e1) throw e1;

    const { data: user, error: e2 } = await supabase.from('users').insert({
      email: String(email).toLowerCase(), name: owner_name, role: 'client',
      business_id: business.id, password_hash: await bcrypt.hash(password, 10),
    }).select().single();
    if (e2) throw e2;

    // default bot settings per channel
    const channels = (plan ? plan.channels : ['wa']).map(c => ({ wa: 'whatsapp', ig: 'instagram', vc: 'voice' }[c] || c));
    await supabase.from('bot_settings').insert(channels.concat('web').map(channel => ({
      business_id: business.id, channel, auto_reply: true, human_handoff: true,
      greeting: `Welcome to ${business_name}! How can I help you today?`, tone: 'friendly',
    })));

    res.status(201).json({ business, user: { id: user.id, email: user.email } });
  } catch (e) { fail(res, e); }
});

// Update a business (suspend / activate / change plan)
app.patch('/api/admin/businesses/:id', auth, adminOnly, async (req, res) => {
  const allowed = (({ status, plan_code, mrr, name, whatsapp }) => ({ status, plan_code, mrr, name, whatsapp }))(req.body);
  Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);
  const { data, error } = await supabase.from('businesses')
    .update(allowed).eq('id', req.params.id).select().single();
  if (error) return fail(res, error);
  res.json(data);
});

// Payments & invoices
app.get('/api/admin/payments', auth, adminOnly, async (_req, res) => {
  const { data, error } = await supabase.from('payments')
    .select('reference, amount_kwd, method, status, created_at, businesses(name)')
    .order('created_at', { ascending: false }).limit(200);
  if (error) return fail(res, error);
  res.json(data.map(p => ({
    ref: p.reference, biz: p.businesses ? p.businesses.name : '', meth: p.method,
    amt: Number(p.amount_kwd).toFixed(2), date: new Date(p.created_at).toDateString(), st: p.status,
  })));
});
app.post('/api/admin/payments', auth, adminOnly, async (req, res) => {
  const { data, error } = await supabase.from('payments').insert(req.body).select().single();
  if (error) return fail(res, error);
  res.status(201).json(data);
});
app.get('/api/admin/invoices', auth, adminOnly, async (_req, res) => {
  const { data, error } = await supabase.from('invoices')
    .select('number, description, amount_kwd, due_at, status, businesses(name)')
    .order('issued_at', { ascending: false }).limit(200);
  if (error) return fail(res, error);
  res.json(data.map(i => ({
    no: i.number, biz: i.businesses ? i.businesses.name : '', desc: i.description,
    amt: Number(i.amount_kwd).toFixed(2), due: new Date(i.due_at).toDateString(), st: i.status,
  })));
});
app.post('/api/admin/invoices', auth, adminOnly, async (req, res) => {
  const { data, error } = await supabase.from('invoices').insert(req.body).select().single();
  if (error) return fail(res, error);
  res.status(201).json(data);
});

// Platform analytics
app.get('/api/admin/analytics', auth, adminOnly, async (_req, res) => {
  const [{ data: bizs }, { count: msgCount }] = await Promise.all([
    supabase.from('businesses').select('status, mrr'),
    supabase.from('messages').select('id', { count: 'exact', head: true }),
  ]);
  const paid = bizs.filter(b => b.status === 'paid');
  res.json({
    mrr: paid.reduce((s, b) => s + Number(b.mrr || 0), 0),
    paid_count: paid.length,
    free_count: bizs.filter(b => b.status === 'free').length,
    total_messages: msgCount || 0,
  });
});

/* ================================================================
 * AI ENGINE — shared brain for all channels
 * ============================================================== */
async function aiReply(business_id, channel, userText) {
  if (!process.env.OPENAI_API_KEY) return null;
  const [{ data: kb }, { data: cfg }, { data: business }] = await Promise.all([
    supabase.from('knowledge_sources').select('title, content').eq('business_id', business_id).eq('status', 'trained').limit(20),
    supabase.from('bot_settings').select('*').eq('business_id', business_id).eq('channel', channel).single(),
    supabase.from('businesses').select('name').eq('id', business_id).single(),
  ]);
  if (cfg && cfg.auto_reply === false) return null;

  const knowledge = (kb || []).map(k => `## ${k.title}\n${k.content || ''}`).join('\n\n').slice(0, 12000);
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content:
          `You are the ${cfg?.tone || 'friendly'} AI assistant for "${business?.name}". ` +
          `Answer in the customer's language (Arabic or English). Keep replies short and helpful. ` +
          `Answer ONLY from this business knowledge; if unsure, say a team member will follow up.\n\n${knowledge}` },
        { role: 'user', content: userText },
      ],
      max_tokens: 300,
    }),
  });
  const j = await r.json();
  return j.choices && j.choices[0] ? j.choices[0].message.content : null;
}

async function ingestInbound({ business_id, channel, handle, name, text }) {
  // find or create conversation
  let { data: conv } = await supabase.from('conversations')
    .select('*').eq('business_id', business_id).eq('channel', channel).eq('customer_handle', handle).single();
  if (!conv) {
    ({ data: conv } = await supabase.from('conversations').insert({
      business_id, channel, customer_handle: handle, customer_name: name, mode: 'ai',
    }).select().single());
  }
  await supabase.from('messages').insert({
    conversation_id: conv.id, business_id, direction: 'in', sender: 'customer', body: text,
  });
  await supabase.from('conversations').update({
    last_message_preview: text, last_message_at: new Date().toISOString(), unread: (conv.unread || 0) + 1,
  }).eq('id', conv.id);

  // AI auto-reply if conversation is in AI mode
  if (conv.mode === 'ai') {
    const reply = await aiReply(business_id, channel, text);
    if (reply) {
      await supabase.from('messages').insert({
        conversation_id: conv.id, business_id, direction: 'out', sender: 'ai', body: reply,
      });
      await supabase.from('conversations').update({
        last_message_preview: reply, last_message_at: new Date().toISOString(),
      }).eq('id', conv.id);
      return { conv, reply };
    }
  }
  return { conv, reply: null };
}

/* ================================================================
 * WEBHOOKS — Meta (WhatsApp + Instagram share one app) & widget
 * ============================================================== */

// Meta webhook verification (same endpoint serves WhatsApp & Instagram)
app.get('/api/webhooks/meta', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN)
    return res.send(req.query['hub.challenge']);
  res.sendStatus(403);
});

// Meta webhook events
app.post('/api/webhooks/meta', async (req, res) => {
  res.sendStatus(200); // ack fast, process async
  try {
    const entry = req.body.entry && req.body.entry[0];
    if (!entry) return;

    // ---- WhatsApp Cloud API payload
    const waChange = entry.changes && entry.changes.find(c => c.field === 'messages');
    if (waChange && waChange.value.messages) {
      const v = waChange.value;
      const phoneNumberId = v.metadata.phone_number_id;
      const { data: cfg } = await supabase.from('channel_configs')
        .select('business_id').eq('channel', 'whatsapp').eq('meta_phone_number_id', phoneNumberId).single();
      if (!cfg) return;
      for (const m of v.messages) {
        if (m.type !== 'text') continue;
        const contact = (v.contacts || [])[0];
        const { reply } = await ingestInbound({
          business_id: cfg.business_id, channel: 'whatsapp',
          handle: m.from, name: contact ? contact.profile.name : m.from, text: m.text.body,
        });
        if (reply && process.env.META_WA_TOKEN) {
          fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.META_WA_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: m.from, text: { body: reply } }),
          }).catch(() => {});
        }
      }
    }

    // ---- Instagram Messaging payload
    if (entry.messaging) {
      for (const ev of entry.messaging) {
        if (!ev.message || ev.message.is_echo) continue;
        const igId = ev.recipient.id; // the business IG account id
        const { data: cfg } = await supabase.from('channel_configs')
          .select('business_id, page_access_token').eq('channel', 'instagram').eq('ig_account_id', igId).single();
        if (!cfg) continue;
        const { reply } = await ingestInbound({
          business_id: cfg.business_id, channel: 'instagram',
          handle: ev.sender.id, name: 'Instagram user', text: ev.message.text || '',
        });
        if (reply && cfg.page_access_token) {
          fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${cfg.page_access_token}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient: { id: ev.sender.id }, message: { text: reply } }),
          }).catch(() => {});
        }
      }
    }
  } catch (e) { console.error('meta webhook error', e); }
});

// Website widget — public chat endpoint keyed by the business's widget key
app.post('/api/widget/:widgetKey/message', async (req, res) => {
  try {
    const { data: business } = await supabase.from('businesses')
      .select('id, status').eq('widget_key', req.params.widgetKey).single();
    if (!business || business.status === 'suspended') return res.status(404).json({ error: 'Widget not found' });
    const { reply } = await ingestInbound({
      business_id: business.id, channel: 'web',
      handle: req.body.visitor_id || `web_${Date.now()}`,
      name: 'Website visitor', text: req.body.text || '',
    });
    res.json({ reply: reply || 'A team member will reply shortly.' });
  } catch (e) { fail(res, e); }
});

// Voice webhook (Twilio) — logs calls + transcripts
app.post('/api/webhooks/voice', async (req, res) => {
  try {
    const { business_id, from, transcript, duration_sec, direction } = req.body;
    await supabase.from('call_logs').insert({ business_id, caller: from, transcript, duration_sec, direction });
    await ingestInbound({ business_id, channel: 'voice', handle: from, name: from, text: `[Call transcript] ${transcript || ''}` });
    res.json({ ok: true });
  } catch (e) { fail(res, e); }
});

/* ================================================================
 * BOOTSTRAP — first run creates the top-level admin
 * ============================================================== */
async function bootstrap() {
  const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin');
  if (!count) {
    await supabase.from('users').insert({
      email: 'admin@sts.app', name: 'STS Admin', role: 'admin',
      password_hash: await bcrypt.hash('Admin@2026!', 10),
    });
    console.log('✔ Seeded admin: admin@sts.app / Admin@2026!  (change immediately)');
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'sts-api', time: new Date().toISOString() }));

app.listen(PORT, async () => {
  await bootstrap().catch(e => console.error('bootstrap:', e.message));
  console.log(`STS API running on http://localhost:${PORT}`);
});