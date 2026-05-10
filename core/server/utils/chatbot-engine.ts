/**
 *
 * Moteur conversationnel chatbot — start / reply / persistance + lead INSERT.
 *
 * Source of truth for the tree: database (`cs_chatbot_node` + `_node_lang` +
 * `_option` + `_option_lang`), tenant-aware via useClientDb. Aucun arbre
 * hardcoded in the code (database-only doctrine). Each tenant can therefore have
 * ses propres tunnels en seed SQL (cf synedre/migrations/seed-chatbot-*.sql).
 *
 * In-memory cache per database instance: the tree is loaded once per process
 * Nuxt and invalidated after TTL (60 s in dev, 300 s in prod).
 *
 * FSM rule:
 * 1. bot sends the current node (question + options or free text)
 * 2. user responds (click option or free-form input)
 * 3. persist in `_chatbot_answer` + optional capture in
 *      `_chatbot_conversation.captured_*`
 * 4. compute the next node (option lookup OR `next_question` direct)
 * 5. if terminal → INSERT smartlead, status 'closed', last bot message
 */

import { useClientDb } from './db'
import { verifySiret, isEmailFormat } from './siret-verify'
import { randomBytes } from 'node:crypto'

interface Ctx { event: any }

export interface ChatNode {
  nodeKey:       string
  type:          'buttons' | 'text'
  capture?:      string
  nextQuestion?: string
  terminal:      boolean
  scenarioRoot?: string
  question:      string
  recapLabel?:   string
  options?:      Array<{ label: string; nextKey: string; position: number }>
}

export type ChatTree = Record<string, ChatNode>

export interface BotMessageDTO {
  conversationId:    number
  conversationToken: string
  nodeKey:           string | null
  type:              'buttons' | 'text'
  content:           string
  options?:          string[]
  terminal:          boolean
  /** Quand true : conversation en mode takeover, le storefront doit
   * stop waiting for an FSM response and start polling state.get
   * to retrieve agent messages. */
  humanTakeover?:    boolean
}

const NL_MARKER = /\|NL\|/g
function unescapeNl(s: string): string { return s.replace(NL_MARKER, '\n') }

function genToken(): string {
  return randomBytes(24).toString('hex')
}

// ─── Tree cache per database instance (WeakMap) with TTL ─────────────────
interface CachedTree { tree: ChatTree; loadedAt: number }
const TREE_CACHE = new WeakMap<object, CachedTree>()
// Short TTL (60 s) so reseeds propagate quickly. Negligible cost
// (1 SELECT/min/process). If the tree grows large, bump to 300 s.
const TREE_TTL_MS = 60 * 1000

async function loadTree(db: any, idLang = 1): Promise<ChatTree> {
  const cached = TREE_CACHE.get(db)
  if (cached && Date.now() - cached.loadedAt < TREE_TTL_MS) return cached.tree

  // 1. All nodes + their language
  const nodes = await db.query<any>(
    `SELECT n.id_node, n.node_key, n.type, n.capture, n.next_question,
            n.terminal, n.scenario_root,
            COALESCE(nl.question, '')   AS question,
            COALESCE(nl.recap_label,'') AS recap_label
       FROM cs_main.cs_chatbot_node n
  LEFT JOIN cs_main.cs_chatbot_node_lang nl
         ON nl.id_node = n.id_node AND nl.id_lang = ?
      ORDER BY n.position ASC, n.id_node ASC`,
    [idLang],
  )
  // 2. All options + their language
  const opts = await db.query<any>(
    `SELECT o.id_option, o.id_node, o.position, o.next_node_key,
            COALESCE(ol.label_text, '') AS label_text
       FROM cs_main.cs_chatbot_option o
  LEFT JOIN cs_main.cs_chatbot_option_lang ol
         ON ol.id_option = o.id_option AND ol.id_lang = ?
      ORDER BY o.id_node ASC, o.position ASC`,
    [idLang],
  )
  const optsByNode = new Map<number, Array<{ label: string; nextKey: string; position: number }>>()
  for (const o of (opts as any[])) {
    const arr = optsByNode.get(Number(o.id_node)) || []
    arr.push({
      label: String(o.label_text || ''),
      nextKey: String(o.next_node_key || ''),
      position: Number(o.position || 0),
    })
    optsByNode.set(Number(o.id_node), arr)
  }
  const tree: ChatTree = {}
  for (const n of (nodes as any[])) {
    const idNode = Number(n.id_node)
    tree[String(n.node_key)] = {
      nodeKey:       String(n.node_key),
      type:          (String(n.type) === 'buttons' ? 'buttons' : 'text'),
      capture:       n.capture || undefined,
      nextQuestion:  n.next_question || undefined,
      terminal:      Number(n.terminal || 0) === 1,
      scenarioRoot:  n.scenario_root || undefined,
      question:      String(n.question),
      recapLabel:    n.recap_label || undefined,
      options:       optsByNode.get(idNode),
    }
  }
  TREE_CACHE.set(db, { tree, loadedAt: Date.now() })
  return tree
}

/** Call from an admin endpoint after seed update to force reload. */
export function invalidateChatbotTreeCache(db: any) { TREE_CACHE.delete(db) }

/**
 * Persists a captured response: 1 parent row (id_conversation, node_key) +
 * 1 _lang row (question/recap_label/answer). RETURNING id_answer because the
 * short PK (id_answer) doesn't match the adapter's auto-RETURNING heuristic
 * l'adapter.
 */
export async function persistAnswer(
  db: any,
  idConversation: number,
  nodeKey: string,
  question: string,
  recapLabel: string | null,
  answer: string,
  idLang: number,
): Promise<number> {
  const ins = await db.get<any>(
    `INSERT INTO cs_main.cs_chatbot_answer
       (id_conversation, node_key, date_add)
     VALUES (?, ?, NOW())
     RETURNING id_answer`,
    [idConversation, nodeKey],
  )
  const idAnswer = Number(ins?.id_answer || 0)
  if (!idAnswer) throw new Error('[chatbot-engine] insert chatbot_answer failed')
  await db.query(
    `INSERT INTO cs_main.cs_chatbot_answer_lang
       (id_answer, id_lang, question, recap_label, answer)
     VALUES (?, ?, ?, ?, ?)`,
    [idAnswer, idLang, question, recapLabel, answer],
  )
  return idAnswer
}

const SCENARIO_ROOTS = ['global', 'product', 'order', 'human'] as const
function pickRoot(input?: string): string {
  if (input && (SCENARIO_ROOTS as readonly string[]).includes(input)) return input
  return 'global'
}

/** Trouve le node racine d'un scenario donné. Fallback sur 'global'. */
function rootStartKey(tree: ChatTree, scenario: string): string {
  for (const k of Object.keys(tree)) {
    if (tree[k].scenarioRoot === scenario) return k
  }
  if (tree['global']) return 'global'
  // No root → first node of the dict (defensive)
  const firstKey = Object.keys(tree)[0]
  if (!firstKey) throw new Error('[chatbot-engine] arbre vide en DB — seed manquant ?')
  return firstKey
}

// ─── start / reply ─────────────────────────────────────────────────────

export interface StartOpts {
  scenario?:      string
  productId?:     number | null
  /** Quantity pre-filled via the +/- button on the product card. If > 1,
   * persist it in the link table and skip the qty question. */
  initialQty?:    number | null
  ipAddress?:     string
  userAgent?:     string
  idLang?:        number
}

export async function startConversation(opts: StartOpts, ctx: Ctx): Promise<BotMessageDTO> {
  const db = useClientDb(ctx.event)
  const idLang = opts.idLang || 1
  const tree = await loadTree(db, idLang)
  const root = pickRoot(opts.scenario)
  let startKey = rootStartKey(tree, root)
  // If there's a pre-filled quantity (> 1) on the product funnel, skip
  // product_q1_qty and go directly to product_q2_freq.
  const skipQty = root === 'product'
    && Number(opts.initialQty || 0) > 1
    && tree['product_q2_freq']
    && tree['product_q1_qty']
  if (skipQty) startKey = 'product_q2_freq'

  const node = tree[startKey]
  if (!node) throw new Error(`[chatbot-engine] start node "${startKey}" introuvable`)

  const token = genToken()

  // PK = id_conversation (adapter heuristic doesn't match) → RETURNING
  // explicit + db.get to retrieve the id.
  // unread_for_admin=TRUE from the start: the topbar bell must
  // alert the agent of a new conversation initiated.
  // last_message_at=NOW() so it appears at the top of the list.
  const ins = await db.get<any>(
    `INSERT INTO cs_main.cs_chatbot_conversation
       (conversation_token, source, scenario_root, current_node_key,
        product_id_context, ip_address, user_agent, status,
        unread_for_admin, last_message_at, date_add, date_upd)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', TRUE, NOW(), NOW(), NOW())
     RETURNING id_conversation`,
    [
      token, root, root, startKey,
      opts.productId || null,
      (opts.ipAddress || '').slice(0, 45),
      (opts.userAgent || '').slice(0, 500),
    ],
  )
  const idConversation = Number(ins?.id_conversation || 0)
  if (!idConversation) throw new Error('[chatbot-engine] insert conversation failed')

  // If quantity pre-filled: immediately persist the product line and
  // add a bot message user-side to show "Qty: X" in the timeline
  // (otherwise the user sees only the frequency without context).
  if (skipQty && opts.productId) {
    const qtyStr = String(opts.initialQty)
    await upsertProductCol(idConversation, opts.productId, 'qty', qtyStr, ctx)
    await db.query(
      `INSERT INTO cs_main.cs_chatbot_message
         (id_conversation, role, content, type, date_add)
       VALUES (?, 'user', ?, 'text', NOW())`,
      [idConversation, `Qté visée : ${qtyStr}`],
    )
    const qtyNode = tree['product_q1_qty']
    await persistAnswer(
      db, idConversation, 'product_q1_qty',
      qtyNode?.question || '',
      qtyNode?.recapLabel || null,
      qtyStr, idLang,
    )
  }

  // Dynamic placeholders (e.g. {{PRODUCT_NAME}} on product_q1_qty)
  const renderedQuestion = await renderQuestionPlaceholders(idConversation, node.question, ctx, idLang)
  const renderedNode: ChatNode = renderedQuestion === node.question ? node : { ...node, question: renderedQuestion }
  await persistBotMessage(idConversation, renderedNode, ctx)
  return toBotDTO(idConversation, token, renderedNode)
}

export interface ReplyOpts {
  conversationId:    number
  conversationToken: string
  message:           string
  idLang?:           number
}

export async function replyConversation(opts: ReplyOpts, ctx: Ctx): Promise<BotMessageDTO> {
  const db = useClientDb(ctx.event)
  let tree = await loadTree(db, opts.idLang || 1)

  const conv = await db.get<any>(
    `SELECT id_conversation, conversation_token, current_node_key, status, human_takeover
       FROM cs_main.cs_chatbot_conversation
      WHERE id_conversation = ? LIMIT 1`,
    [opts.conversationId],
  )
  if (!conv) throw new Error('Conversation introuvable')
  if (String(conv.conversation_token) !== opts.conversationToken) throw new Error('Token invalide')
  if (conv.status === 'closed') throw new Error('Conversation déjà clôturée')

  // ─── Takeover mode: bot disabled, user message persisted raw ───
  // The agent receives the notification (unread_for_admin=true) and replies via
  // /api/bo/chatbot/[token]/reply. Return a neutral DTO (no
  // bot node) so the storefront widget doesn't refresh anything
  // unusual — it polls state.get to receive agent messages.
  if (conv.human_takeover) {
    const userMessageTk = (opts.message || '').trim().slice(0, 2000)
    if (!userMessageTk) throw new Error('Message vide')
    await db.query(
      `INSERT INTO cs_main.cs_chatbot_message
         (id_conversation, role, content, type, date_add)
       VALUES (?, 'user', ?, 'text', NOW())`,
      [opts.conversationId, userMessageTk],
    )
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation
          SET unread_for_admin = TRUE, last_message_at = NOW(), date_upd = NOW()
        WHERE id_conversation = ?`,
      [opts.conversationId],
    )
    return {
      conversationId:    opts.conversationId,
      conversationToken: opts.conversationToken,
      nodeKey:           null,
      type:              'text',
      content:           '',
      terminal:          false,
      humanTakeover:     true,
    }
  }

  const currentKey = String(conv.current_node_key || '')
  const currentNode = tree[currentKey]
  if (!currentNode) throw new Error(`Node courant "${currentKey}" introuvable`)

  const userMessage = (opts.message || '').trim().slice(0, 2000)
  if (!userMessage) throw new Error('Message vide')

  // 1. Persist the user message + the captured response (q+r for recap).
  // db.query (not db.run) because the adapter's auto-RETURNING heuristic
  // expects `id_chatbot_message` long while the PK is `id_message`.
  await db.query(
    `INSERT INTO cs_main.cs_chatbot_message
       (id_conversation, role, content, type, date_add)
     VALUES (?, 'user', ?, 'text', NOW())`,
    [opts.conversationId, userMessage],
  )
  // Bump unread + last_message_at: every visitor message (bot mode OR
  // takeover) must re-light the topbar bell as long as not reviewed
  // in /hub/chatbot.
  await db.run(
    `UPDATE cs_main.cs_chatbot_conversation
        SET unread_for_admin = TRUE, last_message_at = NOW()
      WHERE id_conversation = ?`,
    [opts.conversationId],
  )
  await persistAnswer(
    db, opts.conversationId, currentKey,
    currentNode.question,
    currentNode.recapLabel || null,
    userMessage,
    opts.idLang || 1,
  )

  // 2. Optional capture. If validation fails (SIRET not found, email
  // malformed, etc.), push an error bot message and STAY on the
  // same node — the user re-enters their response. No progression.
  if (currentNode.capture) {
    const cap = await captureAnswer(opts.conversationId, currentNode.capture, userMessage, ctx)
    if (!cap.valid) {
      const errorBotMsg = `⚠️ ${cap.error || 'Réponse invalide.'}\n\n${currentNode.question}`
      await db.query(
        `INSERT INTO cs_main.cs_chatbot_message
           (id_conversation, role, content, type, date_add)
         VALUES (?, 'bot', ?, 'text', NOW())`,
        [opts.conversationId, errorBotMsg],
      )
      return {
        conversationId:    opts.conversationId,
        conversationToken: opts.conversationToken,
        nodeKey:           currentNode.nodeKey,
        type:              currentNode.type,
        content:           errorBotMsg,
        options:           currentNode.options?.length ? currentNode.options.map((o) => o.label) : undefined,
        terminal:          false,
      }
    }
  }

  // 3. Determine nextKey + node, drift-safe vs stale cache.
  //
  // Pipeline en 3 temps :
  // a) Initial computation on the current tree (may be stale)
  // b) If nextKey doesn't exist → reload cache and re-derive nextKey from
  // the refreshed current node (the tree was just seeded, the current
  // may point elsewhere now)
  // c) Semantic interceptions (invisible routers, UI signals) on the
  // final nextKey — otherwise interceptions don't apply after
  // a reload (cf. incidents "..." 2026-05-02)
  let nextKey: string | null = null
  let awaitMoreProduct = false

  function deriveFromNode(node: ChatNode | undefined, currentTree: ChatTree): string | null {
    if (!node) return null
    if (node.options?.length) {
      const match = node.options.find((o) => o.label === userMessage)
      if (match) return match.nextKey
      return node.options[0]?.nextKey || null
    }
    if (node.nextQuestion) return node.nextQuestion
    return currentTree['human_q1_subject'] ? 'human_q1_subject' : Object.keys(currentTree)[0] || null
  }

  // (a) Initial
  nextKey = deriveFromNode(currentNode, tree)

  // (b) Reload if not found
  let nextNode: ChatNode | undefined = nextKey ? tree[nextKey] : undefined
  if (!nextNode) {
    invalidateChatbotTreeCache(db)
    tree = await loadTree(db, opts.idLang || 1)
    const refreshedCurrent = tree[currentKey]
    nextKey = deriveFromNode(refreshedCurrent, tree)
    nextNode = nextKey ? tree[nextKey] : undefined
  }

  // (c) Semantic interceptions on final nextKey
  if (nextKey === 'product_route_after') {
    const hasIdentity = await hasCapturedIdentity(opts.conversationId, ctx)
    nextKey = hasIdentity ? 'review' : 'common_ask_siret'
    nextNode = tree[nextKey]
  }
  if (currentKey === 'review' && userMessage.startsWith('➕')) {
    nextKey = 'review'
    nextNode = tree[nextKey]
    awaitMoreProduct = true
  }

  if (!nextNode || !nextKey) {
    throw new Error(`[chatbot-engine] next node "${nextKey}" introuvable même après reload`)
  }
  await db.run(
    `UPDATE cs_main.cs_chatbot_conversation
        SET current_node_key = ?, date_upd = NOW()
      WHERE id_conversation = ?`,
    [nextKey, opts.conversationId],
  )
  // For the review node, inject the dynamic recap (placeholder
  // {{RECAP}} in the seeded question). For other nodes, render
  // the global placeholders (e.g. {{PRODUCT_NAME}} on product_q1_qty).
  let renderedNode: ChatNode
  if (nextKey === 'review') {
    renderedNode = await renderReviewNode(opts.conversationId, nextNode, ctx)
  } else {
    const q = await renderQuestionPlaceholders(opts.conversationId, nextNode.question, ctx, opts.idLang || 1)
    renderedNode = q === nextNode.question ? nextNode : { ...nextNode, question: q }
  }
  await persistBotMessage(opts.conversationId, renderedNode, ctx)

  // 4. Terminal → INSERT smartlead + smartproject + close
  if (renderedNode.terminal) {
    await finalizeAsLead(opts.conversationId, ctx)
  }

  const dto = toBotDTO(opts.conversationId, opts.conversationToken, renderedNode)
  if (awaitMoreProduct) (dto as any).awaitMoreProduct = true
  return dto
}

/** True if SIRET + email + fullname are all captured. */
async function hasCapturedIdentity(idConversation: number, ctx: Ctx): Promise<boolean> {
  const db = useClientDb(ctx.event)
  const r = await db.get<any>(
    `SELECT captured_siret, captured_email, captured_firstname
       FROM cs_main.cs_chatbot_conversation WHERE id_conversation = ?`,
    [idConversation],
  )
  if (!r) return false
  return Boolean(
    String(r.captured_siret || '').replace(/\D/g, '').length === 14
    && isEmailFormat(String(r.captured_email || ''))
    && String(r.captured_firstname || '').trim(),
  )
}

/** Builds the multi-product recap displayed in the `review` node. */
/**
 * Renders the dynamic placeholders for a question. Today:
 * - {{PRODUCT_NAME}} → product name in conversation context
 * (ps_product_lang.name via product_id_context). If no product context,
 * cleanly remove the quoted segment to
 * keep a clean sentence (« on this product "X", … » → « on this
 *     produit, … »).
 */
async function renderQuestionPlaceholders(
  idConversation: number, question: string, ctx: Ctx, idLang = 1,
): Promise<string> {
  if (!question.includes('{{PRODUCT_NAME}}')) return question
  const db = useClientDb(ctx.event)
  const productId = await getProductContext(idConversation, ctx)
  let name = ''
  if (productId) {
    const row = await db.get<any>(
      `SELECT name FROM cs_main.ps_product_lang
        WHERE id_product = ? AND id_lang = ? LIMIT 1`,
      [productId, idLang],
    )
    name = String(row?.name || '').trim()
  }
  if (name) return question.replace(/\{\{PRODUCT_NAME\}\}/g, name)
  // Pas de nom : on retire les guillemets/espaces qui entourent le placeholder
  return question
    .replace(/\s*«\s*\{\{PRODUCT_NAME\}\}\s*»\s*/g, ' ')
    .replace(/\s*"\{\{PRODUCT_NAME\}\}"\s*/g, ' ')
    .replace(/\s*\{\{PRODUCT_NAME\}\}\s*/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Exported for reuse by /api/chatbot/add-product (which doesn't go through replyConversation). */
export async function renderQuestionForConversation(
  idConversation: number, question: string, ctx: Ctx, idLang = 1,
): Promise<string> {
  return renderQuestionPlaceholders(idConversation, question, ctx, idLang)
}

async function renderReviewNode(idConversation: number, base: ChatNode, ctx: Ctx): Promise<ChatNode> {
  const db = useClientDb(ctx.event)
  const products = await db.query<any>(
    `SELECT id_product, qty, freq, target_price
       FROM cs_main.cs_chatbot_conversation_product
      WHERE id_conversation = ? ORDER BY id_link ASC`,
    [idConversation],
  ) as any[]
  let recap = ''
  if (products.length > 0) {
    recap = products.map((p) => {
      const parts = [`Produit #${p.id_product}`]
      if (p.qty)          parts.push(`qté ${p.qty}`)
      if (p.freq)         parts.push(`fréquence ${p.freq}`)
      if (p.target_price) parts.push(`prix cible ${p.target_price}`)
      return '• ' + parts.join(' · ')
    }).join('\n')
  } else {
    recap = '_Aucun produit ajouté pour l\'instant — vous pouvez en ajouter avec le bouton « Besoin d\'infos sur ce produit ? » sur une fiche._'
  }
  return { ...base, question: base.question.replace('{{RECAP}}', recap) }
}

// ─── helpers ───────────────────────────────────────────────────────────

interface CaptureResult { valid: boolean; error?: string }

/** Retrieves the current id_product (conversation context). */
async function getProductContext(idConversation: number, ctx: Ctx): Promise<number | null> {
  const db = useClientDb(ctx.event)
  const r = await db.get<any>(
    `SELECT product_id_context FROM cs_main.cs_chatbot_conversation WHERE id_conversation = ?`,
    [idConversation],
  )
  return r?.product_id_context ? Number(r.product_id_context) : null
}

/** Insert or update the current product line for the conversation+product. */
async function upsertProductCol(
  idConversation: number, idProduct: number, column: 'qty' | 'freq' | 'target_price',
  value: string, ctx: Ctx,
): Promise<void> {
  const db = useClientDb(ctx.event)
  // Manual upsert: try UPDATE then INSERT if absent (PostgreSQL without ON CONFLICT
  // as there's no UNIQUE constraint — the same product can be re-edited).
  const colName = column === 'qty' ? 'qty' : column === 'freq' ? 'freq' : 'target_price'
  const upd = await db.run(
    `UPDATE cs_main.cs_chatbot_conversation_product
        SET ${colName} = ?
      WHERE id_conversation = ? AND id_product = ?`,
    [value.slice(0, 64), idConversation, idProduct],
  )
  if (upd.affectedRows) return
  // Initial INSERT: fill the touched column + null for the others
  await db.query(
    `INSERT INTO cs_main.cs_chatbot_conversation_product
       (id_conversation, id_product, ${colName}, date_add)
     VALUES (?, ?, ?, NOW())`,
    [idConversation, idProduct, value.slice(0, 64)],
  )
}

async function captureAnswer(
  idConversation: number, kind: string, value: string, ctx: Ctx,
): Promise<CaptureResult> {
  const db = useClientDb(ctx.event)
  if (kind === 'fullname') {
    const parts = value.replace(/[^a-zA-ZÀ-ſ\s'-]/g, '').replace(/\s+/g, ' ').trim().split(' ')
    if (parts.length < 2 || parts[0].length < 2) {
      return { valid: false, error: 'Indiquez votre prénom ET votre nom (ex. « Marie Dupont »).' }
    }
    const firstname = (parts[0] || '').slice(0, 128)
    const lastname  = (parts.slice(1).join(' ') || '').slice(0, 128)
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation
          SET captured_firstname = ?, captured_lastname = ?
        WHERE id_conversation = ?`,
      [firstname, lastname, idConversation],
    )
    return { valid: true }
  }
  if (kind === 'email') {
    const clean = value.replace(/\s/g, '').toLowerCase().slice(0, 255)
    if (!isEmailFormat(clean)) {
      return { valid: false, error: 'Cet email ne semble pas valide. Vérifiez l\'orthographe.' }
    }
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation SET captured_email = ? WHERE id_conversation = ?`,
      [clean, idConversation],
    )
    return { valid: true }
  }
  if (kind === 'siret') {
    const r = await verifySiret(value)
    if (!r.valid) return { valid: false, error: r.error || 'SIRET invalide.' }
    // Valid SIRET → also store the auto-retrieved company name to
    // pre-fill the smartlead (the user no longer needs to re-enter it).
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation
          SET captured_siret = ?, captured_company = ?
        WHERE id_conversation = ?`,
      [r.siret || '', (r.companyName || '').slice(0, 255), idConversation],
    )
    return { valid: true }
  }
  if (kind === 'firstname') {
    if (!value.trim()) return { valid: false, error: 'Prénom vide.' }
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation SET captured_firstname = ? WHERE id_conversation = ?`,
      [value.slice(0, 128), idConversation],
    )
    return { valid: true }
  }
  if (kind === 'lastname') {
    if (!value.trim()) return { valid: false, error: 'Nom vide.' }
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation SET captured_lastname = ? WHERE id_conversation = ?`,
      [value.slice(0, 128), idConversation],
    )
    return { valid: true }
  }
  if (kind === 'phone') {
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation SET captured_phone = ? WHERE id_conversation = ?`,
      [value.slice(0, 32), idConversation],
    )
    return { valid: true }
  }
  if (kind === 'company') {
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation SET captured_company = ? WHERE id_conversation = ?`,
      [value.slice(0, 255), idConversation],
    )
    return { valid: true }
  }
  // Special captures for the product funnel (link in the N-N table)
  if (kind === 'product_qty' || kind === 'product_freq' || kind === 'product_price') {
    const idProduct = await getProductContext(idConversation, ctx)
    if (!idProduct) return { valid: true }  // pas de contexte : on persist rien, mais on ne bloque pas l'avancement
    const col = kind === 'product_qty' ? 'qty' : kind === 'product_freq' ? 'freq' : 'target_price'
    await upsertProductCol(idConversation, idProduct, col as any, value, ctx)
    return { valid: true }
  }
  return { valid: true }
}

async function persistBotMessage(idConversation: number, node: ChatNode, ctx: Ctx): Promise<void> {
  const db = useClientDb(ctx.event)
  const optionsJson = node.type === 'buttons' && node.options?.length
    ? JSON.stringify(node.options.map((o) => o.label))
    : null
  // db.query — cf. note in replyConversation, short PK `id_message`.
  await db.query(
    `INSERT INTO cs_main.cs_chatbot_message
       (id_conversation, role, content, type, options_json, date_add)
     VALUES (?, 'bot', ?, ?, ?, NOW())`,
    [idConversation, node.question, node.type, optionsJson],
  )
  // Denormalized bump for hub list sorting (idx_chatbot_conversation_last_msg).
  await db.run(
    `UPDATE cs_main.cs_chatbot_conversation
        SET last_message_at = NOW() WHERE id_conversation = ?`,
    [idConversation],
  )
}

/**
 * Send an agent message (sender='agent') on a conversation
 * in takeover mode. Mark the conversation as read (the agent
 * just replied) and bump last_message_at.
 *
 * Used by /api/bo/chatbot/[token]/reply.
 */
export async function sendAgentMessage(
  ctx: Ctx,
  idConversation: number,
  message: string,
  idEmployee?: number,
): Promise<void> {
  const db = useClientDb(ctx.event)
  const clean = (message || '').trim().slice(0, 2000)
  if (!clean) throw new Error('Message vide')
  await db.query(
    `INSERT INTO cs_main.cs_chatbot_message
       (id_conversation, role, content, type, date_add)
     VALUES (?, 'agent', ?, 'text', NOW())`,
    [idConversation, clean],
  )
  await db.run(
    `UPDATE cs_main.cs_chatbot_conversation
        SET unread_for_admin = FALSE,
            last_message_at  = NOW(),
            date_upd         = NOW()
            ${idEmployee ? ', id_employee = ?' : ''}
      WHERE id_conversation = ?`,
    idEmployee ? [idEmployee, idConversation] : [idConversation],
  )
}

/**
 * Switch a conversation to takeover mode: set flag to TRUE, employee
 * owner recorded, system bot message announcing the handoff
 * (visible to the visitor). Idempotent: re-call = noop.
 */
export async function takeoverConversation(
  ctx: Ctx,
  idConversation: number,
  idEmployee: number,
  greeting?: string,
): Promise<void> {
  const db = useClientDb(ctx.event)
  const conv = await db.get<any>(
    `SELECT human_takeover FROM cs_main.cs_chatbot_conversation
      WHERE id_conversation = ?`,
    [idConversation],
  )
  if (!conv) throw new Error('Conversation introuvable')
  if (conv.human_takeover) return
  await db.run(
    `UPDATE cs_main.cs_chatbot_conversation
        SET human_takeover    = TRUE,
            id_employee       = ?,
            human_takeover_at = NOW(),
            unread_for_admin  = FALSE,
            last_message_at   = NOW(),
            date_upd          = NOW()
      WHERE id_conversation = ?`,
    [idEmployee, idConversation],
  )
  const greet = (greeting || '👋 Un commercial vient de prendre la main, il vous répond directement.').slice(0, 500)
  await db.query(
    `INSERT INTO cs_main.cs_chatbot_message
       (id_conversation, role, content, type, date_add)
     VALUES (?, 'bot', ?, 'text', NOW())`,
    [idConversation, greet],
  )
}

/** Marque une conversation comme lue côté admin (sans envoyer de message). */
export async function markConversationRead(ctx: Ctx, idConversation: number): Promise<void> {
  const db = useClientDb(ctx.event)
  await db.run(
    `UPDATE cs_main.cs_chatbot_conversation
        SET unread_for_admin = FALSE WHERE id_conversation = ?`,
    [idConversation],
  )
}

/** Manual close (agent). Different from finalizeAsLead (FSM terminal). */
export async function closeConversation(ctx: Ctx, idConversation: number): Promise<void> {
  const db = useClientDb(ctx.event)
  await db.run(
    `UPDATE cs_main.cs_chatbot_conversation
        SET status = 'closed', unread_for_admin = FALSE, date_upd = NOW()
      WHERE id_conversation = ?`,
    [idConversation],
  )
}

function toBotDTO(idConversation: number, token: string, node: ChatNode): BotMessageDTO {
  return {
    conversationId:    idConversation,
    conversationToken: token,
    nodeKey:           node.nodeKey,
    type:              node.type,
    content:           unescapeNl(node.question),
    options:           node.options?.length ? node.options.map((o) => o.label) : undefined,
    terminal:          node.terminal,
  }
}

async function finalizeAsLead(idConversation: number, ctx: Ctx): Promise<void> {
  const db = useClientDb(ctx.event)
  const conv = await db.get<any>(
    `SELECT captured_firstname, captured_lastname, captured_email, captured_phone,
            captured_company, captured_siret,
            scenario_root, product_id_context, id_smartlead
       FROM cs_main.cs_chatbot_conversation
      WHERE id_conversation = ?`,
    [idConversation],
  )
  if (!conv) return
  if (conv.id_smartlead) {
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation
          SET status='closed', date_upd=NOW() WHERE id_conversation=?`,
      [idConversation],
    )
    return
  }

  const email     = String(conv.captured_email || '').trim()
  const firstname = String(conv.captured_firstname || '').trim()
  const lastname  = String(conv.captured_lastname || '').trim()
  const phone     = String(conv.captured_phone || '').trim()
  const company   = String(conv.captured_company || '').trim()
  const siret     = String(conv.captured_siret || '').trim()
  const scenario  = String(conv.scenario_root || 'global')

  // Pre-flight check: create smartlead+project ONLY if email is valid AND SIRET is valid.
  // Otherwise close the conversation without persisting (case where the tree would be
  // configured without mandatory final capture).
  if (!email || !isEmailFormat(email) || siret.replace(/\D/g, '').length !== 14) {
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation
          SET status='closed', date_upd=NOW()
        WHERE id_conversation = ?`,
      [idConversation],
    )
    console.warn('[chatbot-engine] finalize skipped — email ou siret manquant/invalide', { email, siret })
    return
  }

  // - list of negotiated products (qty/freq/price per product)
  // - then contextual Q/A (establishment type, volume, reason, etc.)
  const productRows = await db.query<any>(
    `SELECT id_product, qty, freq, target_price
       FROM cs_main.cs_chatbot_conversation_product
      WHERE id_conversation = ? ORDER BY id_link ASC`,
    [idConversation],
  ) as any[]
  const productLines = productRows.map((p) => {
    const parts = [`Produit #${p.id_product}`]
    if (p.qty)          parts.push(`qté ${p.qty}`)
    if (p.freq)         parts.push(`fréquence ${p.freq}`)
    if (p.target_price) parts.push(`prix cible ${p.target_price}`)
    return '• ' + parts.join(' · ')
  })

  // conversation switched to English one day, add id_lang to the conversation
  // and propagate it here.
  const answers = await db.query<any>(
    `SELECT al.recap_label, al.answer
       FROM cs_main.cs_chatbot_answer a
       JOIN cs_main.cs_chatbot_answer_lang al
         ON al.id_answer = a.id_answer AND al.id_lang = 1
      WHERE a.id_conversation = ? ORDER BY a.id_answer ASC`,
    [idConversation],
  ) as any[]
  const answerLines = answers
    .filter((a) => a.recap_label && a.answer
      // exclude individual product Q/A: already summarized via productLines
      && !['Quantité visée', 'Fréquence livraison', 'Prix cible', 'SIRET', 'Email', 'Contact'].includes(String(a.recap_label)))
    .map((a) => `• ${a.recap_label} : ${a.answer}`)

  const recap = [
    productRows.length > 0 ? `🛒 Produits négociés (${productRows.length}) :\n${productLines.join('\n')}` : '',
    answerLines.length > 0 ? `\n📋 Qualif :\n${answerLines.join('\n')}` : '',
  ].filter(Boolean).join('\n')

  const noteParts = [`Chatbot — tunnel "${scenario}". SIRET ${siret}.`]
  if (conv.product_id_context) noteParts.push(`Produit id=${conv.product_id_context}.`)
  noteParts.push(`Conversation #${idConversation}.`)
  const note = noteParts.join(' ')

  // ── 1. Smartlead (merge if email already known) ──
  let idSmartlead = 0
  const existing = await db.get<any>(
    `SELECT id_ac_smartlead FROM cs_main.cs_smartlead WHERE email = ? LIMIT 1`,
    [email],
  )
  if (existing?.id_ac_smartlead) {
    idSmartlead = Number(existing.id_ac_smartlead)
    await db.run(
      `UPDATE cs_main.cs_smartlead
          SET note = COALESCE(note,'') || E'\n' || ?, date_upd = CURRENT_TIMESTAMP
        WHERE id_ac_smartlead = ?`,
      [note, idSmartlead],
    )
  } else {
    const r = await db.get<any>(
      `INSERT INTO cs_main.cs_smartlead
         (firstname, lastname, email, phone, company_name, type, status, lead_source, lead_intent, note, date_add, date_upd)
       VALUES (?, ?, ?, ?, ?, 'Prospect', 'new', 'chatbot', ?, ?, NOW(), NOW())
       RETURNING id_ac_smartlead`,
      [firstname, lastname, email, phone, company, `chatbot_${scenario}`, note],
    )
    idSmartlead = Number(r?.id_ac_smartlead || 0)
  }

  // ── 2. Smartproject (visible in /hub/projects pipeline) ──
  // id_owner = 1 (system, cf. existing rows). The agent assigns later
  // from the pipeline. Initial stage 'lead_entrant' = « Incoming » column.
  const projectTitle = makeProjectTitle(scenario, company, conv.product_id_context)
  let idSmartproject = 0
  try {
    const r = await db.get<any>(
      `INSERT INTO cs_main.cs_smartproject
         (id_owner, id_ac_smartlead, project_title, project_type, project_intention,
          project_status, needs, date_add, date_upd, is_archived)
       VALUES (1, ?, ?, ?, ?, 'lead_entrant', ?, NOW(), NOW(), 0)
       RETURNING id_ac_smartproject`,
      [idSmartlead, projectTitle, scenario, scenario, recap],
    )
    idSmartproject = Number(r?.id_ac_smartproject || 0)
  } catch (e: any) {
    console.error('[chatbot-engine] smartproject insert failed:', e?.message)
  }

  await db.run(
    `UPDATE cs_main.cs_chatbot_conversation
        SET status='closed', id_smartlead = ?, date_upd=NOW()
      WHERE id_conversation = ?`,
    [idSmartlead || null, idConversation],
  )
  console.log('[chatbot-engine] finalize OK', { idConversation, idSmartlead, idSmartproject })
}

function makeProjectTitle(scenario: string, company: string, productId?: number | null): string {
  const co = company || 'prospect'
  if (scenario === 'product') return `Demande produit — ${co}` + (productId ? ` (id ${productId})` : '')
  if (scenario === 'b2b' || scenario === 'global') return `Nouveau client B2B — ${co}`
  if (scenario === 'order') return `SAV commande — ${co}`
  if (scenario === 'human') return `Contact direct — ${co}`
  return `Lead chatbot — ${co}`
}
