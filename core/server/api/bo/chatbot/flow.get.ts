/**
 *
 * GET /api/bo/chatbot/flow — Complete chatbot flow tree for the editor.
 * Returns: { nodes: [...], options: [...] } with translations in all languages.
 */
import { useClientDb } from '~/server/utils/db'

interface NodeRow {
  id_node: number
  node_key: string
  type: string
  capture: string | null
  next_question: string | null
  terminal: number
  scenario_root: string | null
  position: number
}
interface NodeLangRow {
  id_node: number
  id_lang: number
  question: string
  recap_label: string | null
}
interface OptionRow {
  id_option: number
  id_node: number
  position: number
  next_node_key: string | null
}
interface OptionLangRow {
  id_option: number
  id_lang: number
  label_text: string
}

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const nodes = await db.query<NodeRow>(
    `SELECT id_node, node_key, type, capture, next_question, terminal, scenario_root, position
       FROM cs_chatbot_node ORDER BY scenario_root NULLS LAST, position, id_node`,
  )
  const nodeLangs = await db.query<NodeLangRow>(
    `SELECT id_node, id_lang, question, recap_label FROM cs_chatbot_node_lang`,
  )
  const options = await db.query<OptionRow>(
    `SELECT id_option, id_node, position, next_node_key FROM cs_chatbot_option ORDER BY id_node, position`,
  )
  const optionLangs = await db.query<OptionLangRow>(
    `SELECT id_option, id_lang, label_text FROM cs_chatbot_option_lang`,
  )

  // Group langs par parent
  const langsByNode = new Map<number, NodeLangRow[]>()
  for (const l of nodeLangs) {
    if (!langsByNode.has(l.id_node)) langsByNode.set(l.id_node, [])
    langsByNode.get(l.id_node)!.push(l)
  }
  const langsByOption = new Map<number, OptionLangRow[]>()
  for (const l of optionLangs) {
    if (!langsByOption.has(l.id_option)) langsByOption.set(l.id_option, [])
    langsByOption.get(l.id_option)!.push(l)
  }

  return {
    nodes: nodes.map((n) => ({
      idNode: Number(n.id_node),
      nodeKey: n.node_key,
      type: n.type,
      capture: n.capture || '',
      nextQuestion: n.next_question || '',
      terminal: Number(n.terminal) === 1,
      scenarioRoot: n.scenario_root || '',
      position: Number(n.position),
      langs: (langsByNode.get(Number(n.id_node)) || []).map((l) => ({
        idLang: Number(l.id_lang),
        question: String(l.question || ''),
        recapLabel: String(l.recap_label || ''),
      })),
    })),
    options: options.map((o) => ({
      idOption: Number(o.id_option),
      idNode: Number(o.id_node),
      position: Number(o.position),
      nextNodeKey: o.next_node_key || '',
      langs: (langsByOption.get(Number(o.id_option)) || []).map((l) => ({
        idLang: Number(l.id_lang),
        labelText: String(l.label_text || ''),
      })),
    })),
  }
})
