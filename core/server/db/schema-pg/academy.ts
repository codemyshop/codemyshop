/**
 *
 * Drizzle PG schema — academy domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const academyLearner = vaisseauMereAcSchema.table(
  'cs_academy_learner',
  {
    idLearner: serial('id_learner').primaryKey(),
    type: varchar('type', { length: 5 }).notNull().default('human'),
    email: varchar('email', { length: 255 }),
    pseudo: varchar('pseudo', { length: 60 }).notNull(),
    agentCodename: varchar('agent_codename', { length: 64 }),
    agentOrigin: varchar('agent_origin', { length: 128 }),
    apiKey: varchar('api_key', { length: 128 }),
    avatarUrl: varchar('avatar_url', { length: 512 }).notNull().default(''),
    modulesStarted: integer('modules_started').notNull().default(0),
    modulesCompleted: integer('modules_completed').notNull().default(0),
    totalScore: integer('total_score').notNull().default(0),
    active: smallint('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const academyLesson = vaisseauMereAcSchema.table(
  'cs_academy_lesson',
  {
    idLesson: serial('id_lesson').primaryKey(),
    clientId: varchar('client_id', { length: 32 }).notNull().default('ac'),
    moduleSlug: varchar('module_slug', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    takeaway: text('takeaway'),
    mentorQuote: text('mentor_quote'),
    mentorSource: varchar('mentor_source', { length: 255 }),
    dictionaryTerms: text('dictionary_terms'),
    active: smallint('active').notNull().default(1),
    position: integer('position').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const academyProgress = vaisseauMereAcSchema.table(
  'cs_academy_progress',
  {
    idProgress: serial('id_progress').primaryKey(),
    idLearner: integer('id_learner').notNull(),
    moduleSlug: varchar('module_slug', { length: 100 }).notNull(),
    lessonIndex: smallint('lesson_index').notNull().default(0),
    status: varchar('status', { length: 9 }).notNull().default('started'),
    score: smallint('score'),
    timeSpent: integer('time_spent').notNull().default(0),
    completedAt: timestamp('completed_at', { mode: 'date', precision: 0 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const academyQa = vaisseauMereAcSchema.table(
  'cs_academy_qa',
  {
    idQa: serial('id_qa').primaryKey(),
    moduleSlug: varchar('module_slug', { length: 100 }).notNull(),
    lessonIndex: smallint('lesson_index').notNull().default(0),
    idStudent: integer('id_student').notNull(),
    question: text('question').notNull(),
    aiAnswer: text('ai_answer'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    upvotes: integer('upvotes').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const academyStudent = vaisseauMereAcSchema.table(
  'cs_academy_student',
  {
    idStudent: serial('id_student').primaryKey(),
    idCustomer: integer('id_customer').notNull(),
    pseudo: varchar('pseudo', { length: 60 }).notNull(),
    bio: varchar('bio', { length: 500 }).notNull().default(''),
    avatarUrl: varchar('avatar_url', { length: 512 }).notNull().default(''),
    modulesCompleted: text('modules_completed'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const academySuggestion = vaisseauMereAcSchema.table(
  'cs_academy_suggestion',
  {
    idSuggestion: serial('id_suggestion').primaryKey(),
    moduleSlug: varchar('module_slug', { length: 100 }).notNull(),
    lessonIndex: smallint('lesson_index').notNull().default(0),
    question: text('question').notNull(),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
