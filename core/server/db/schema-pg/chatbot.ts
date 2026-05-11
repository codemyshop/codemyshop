

import {
  serial, integer, varchar, text, timestamp, boolean, pgSchema, index, uniqueIndex,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const chatbotConversation = vaisseauMereAcSchema.table(
  'cs_chatbot_conversation',
  {
    idConversation:     serial('id_conversation').primaryKey(),
    conversationToken:  varchar('conversation_token', { length: 64 }).notNull(),
    source:             varchar('source', { length: 64 }).notNull().default('global'),
    scenarioRoot:       varchar('scenario_root', { length: 64 }).notNull(),
    currentNodeKey:     varchar('current_node_key', { length: 64 }),
    productIdContext:   integer('product_id_context'),
    ipAddress:          varchar('ip_address', { length: 45 }),
    userAgent:          varchar('user_agent', { length: 500 }),
    capturedFirstname:  varchar('captured_firstname', { length: 128 }),
    capturedLastname:   varchar('captured_lastname', { length: 128 }),
    capturedEmail:      varchar('captured_email', { length: 255 }),
    capturedPhone:      varchar('captured_phone', { length: 32 }),
    capturedCompany:    varchar('captured_company', { length: 255 }),
    capturedSiret:      varchar('captured_siret', { length: 14 }),
    status:             varchar('status', { length: 16 }).notNull().default('open'),
    idSmartlead:        integer('id_smartlead'),
    
    
    
    humanTakeover:      boolean('human_takeover').notNull().default(false),
    idEmployee:         integer('id_employee'),
    humanTakeoverAt:    timestamp('human_takeover_at', { mode: 'date', precision: 0 }),
    unreadForAdmin:     boolean('unread_for_admin').notNull().default(false),
    lastMessageAt:      timestamp('last_message_at', { mode: 'date', precision: 0 }),
    dateAdd:            timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd:            timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    uqToken:    uniqueIndex('idx_chatbot_conversation_token').on(t.conversationToken),
    kStatus:    index('idx_chatbot_conversation_status').on(t.status),
    kTakeover:  index('idx_chatbot_conversation_takeover').on(t.humanTakeover),
    kUnread:    index('idx_chatbot_conversation_unread').on(t.unreadForAdmin),
    kLastMsg:   index('idx_chatbot_conversation_last_msg').on(t.lastMessageAt),
  }),
)

export const chatbotMessage = vaisseauMereAcSchema.table(
  'cs_chatbot_message',
  {
    idMessage:       serial('id_message').primaryKey(),
    idConversation:  integer('id_conversation').notNull(),
    role:            varchar('role', { length: 16 }).notNull(), 
    content:         text('content').notNull(),
    type:            varchar('type', { length: 16 }).notNull().default('text'), 
    optionsJson:     text('options_json'),
    dateAdd:         timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    kConv: index('idx_chatbot_message_conv').on(t.idConversation),
  }),
)

export const chatbotAnswer = vaisseauMereAcSchema.table(
  'cs_chatbot_answer',
  {
    idAnswer:        serial('id_answer').primaryKey(),
    idConversation:  integer('id_conversation').notNull(),
    nodeKey:         varchar('node_key', { length: 64 }).notNull(),
    dateAdd:         timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    kConv: index('idx_chatbot_answer_conv').on(t.idConversation),
  }),
)

export const chatbotAnswerLang = vaisseauMereAcSchema.table(
  'cs_chatbot_answer_lang',
  {
    idAnswer:    integer('id_answer').notNull(),
    idLang:      integer('id_lang').notNull(),
    question:    text('question'),
    recapLabel:  varchar('recap_label', { length: 128 }),
    answer:      text('answer'),
  },
)

export const chatbotNode = vaisseauMereAcSchema.table(
  'cs_chatbot_node',
  {
    idNode:        serial('id_node').primaryKey(),
    nodeKey:       varchar('node_key', { length: 64 }).notNull(),
    type:          varchar('type', { length: 16 }).notNull().default('text'),
    capture:       varchar('capture', { length: 32 }),
    nextQuestion:  varchar('next_question', { length: 64 }),
    terminal:      integer('terminal').notNull().default(0),
    scenarioRoot:  varchar('scenario_root', { length: 32 }),
    position:      integer('position').notNull().default(0),
    dateAdd:       timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd:       timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    uqKey:      uniqueIndex('uq_chatbot_node_key').on(t.nodeKey),
    kScenario:  index('idx_chatbot_node_scenario').on(t.scenarioRoot),
  }),
)

export const chatbotNodeLang = vaisseauMereAcSchema.table(
  'cs_chatbot_node_lang',
  {
    idNode:      integer('id_node').notNull(),
    idLang:      integer('id_lang').notNull(),
    question:    text('question').notNull(),
    recapLabel:  varchar('recap_label', { length: 128 }),
  },
)

export const chatbotOption = vaisseauMereAcSchema.table(
  'cs_chatbot_option',
  {
    idOption:      serial('id_option').primaryKey(),
    idNode:        integer('id_node').notNull(),
    position:      integer('position').notNull().default(0),
    nextNodeKey:   varchar('next_node_key', { length: 64 }).notNull(),
  },
  (t) => ({
    kNode: index('idx_chatbot_option_node').on(t.idNode),
  }),
)

export const chatbotOptionLang = vaisseauMereAcSchema.table(
  'cs_chatbot_option_lang',
  {
    idOption:    integer('id_option').notNull(),
    idLang:      integer('id_lang').notNull(),
    labelText:   varchar('label_text', { length: 200 }).notNull(),
  },
)

export const chatbotConversationProduct = vaisseauMereAcSchema.table(
  'cs_chatbot_conversation_product',
  {
    idLink:          serial('id_link').primaryKey(),
    idConversation:  integer('id_conversation').notNull(),
    idProduct:       integer('id_product').notNull(),
    qty:             varchar('qty', { length: 64 }),
    freq:            varchar('freq', { length: 64 }),
    targetPrice:     varchar('target_price', { length: 64 }),
    dateAdd:         timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    kConv: index('idx_chatbot_conv_product_conv').on(t.idConversation),
  }),
)
