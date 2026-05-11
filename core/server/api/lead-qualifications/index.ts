

import { readQualifications } from '~/server/utils/lead-qualifications'

export default defineEventHandler(async (event) => await readQualifications(event))
