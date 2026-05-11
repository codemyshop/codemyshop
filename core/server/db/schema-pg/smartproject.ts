

import {
  integer,
  numeric,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const smartproject = vaisseauMereAcSchema.table(
  'cs_smartproject',
  {
    idAcSmartproject: serial('id_ac_smartproject').primaryKey(),
    idOwner: integer('id_owner').notNull(),
    idAcSmartlead: integer('id_ac_smartlead'),
    avatarType: varchar('avatar_type', { length: 32 }),
    idCustomer: integer('id_customer'),
    projectTitle: varchar('project_title', { length: 255 }).notNull(),
    projectType: varchar('project_type', { length: 32 }),
    projectIntention: varchar('project_intention', { length: 64 }),
    budget: varchar('budget', { length: 32 }),
    needs: text('needs').notNull(),
    meetingDate: timestamp('meeting_date', { mode: 'date', precision: 0 }),
    referenceClient: varchar('reference_client', { length: 64 }),
    projectStatus: varchar('project_status', { length: 64 }),
    finalPrice: numeric('final_price', { precision: 10, scale: 2 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
    isArchived: smallint('is_archived').notNull().default(0),
  },
)

export const smarttask = vaisseauMereAcSchema.table(
  'cs_smarttask',
  {
    idAcSmarttask: serial('id_ac_smarttask').primaryKey(),
    idOwner: integer('id_owner').notNull(),
    idAcSmartproject: integer('id_ac_smartproject'),
    idAcSmartlead: integer('id_ac_smartlead'),
    idCustomer: integer('id_customer'),
    taskTitle: varchar('task_title', { length: 255 }).notNull(),
    taskStatus: varchar('task_status', { length: 32 }).notNull(),
    taskDescription: text('task_description'),
    dateDeadline: timestamp('date_deadline', { mode: 'date', precision: 0 }),
    assignedTo: integer('assigned_to').notNull(),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)

export const smarttaskTemplate = vaisseauMereAcSchema.table(
  'cs_smarttask_template',
  {
    idAcSmarttaskTemplate: serial('id_ac_smarttask_template').primaryKey(),
    idOwner: integer('id_owner').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    defaultDescription: text('default_description'),
    defaultStatus: varchar('default_status', { length: 32 }),
    daysToDeadline: integer('days_to_deadline'),
    nextStep: integer('next_step'),
    active: smallint('active').notNull().default(1),
  },
)

export const smartteam = vaisseauMereAcSchema.table(
  'cs_smartteam',
  {
    idAcSmartteam: serial('id_ac_smartteam').primaryKey(),
    idOwner: integer('id_owner').notNull(),
    email: varchar('email', { length: 255 }),
    firstname: varchar('firstname', { length: 128 }),
    lastname: varchar('lastname', { length: 128 }),
    role: varchar('role', { length: 32 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)
