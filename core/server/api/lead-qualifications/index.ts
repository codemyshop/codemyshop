/**
 *
 * GET /api/lead-qualifications → all qualifications (bulk)
 */

import { readQualifications } from '~/server/utils/lead-qualifications'

export default defineEventHandler(async (event) => await readQualifications(event))
