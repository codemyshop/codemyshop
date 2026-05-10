/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function getDictionaryEntryBySlug(...args: any[]): Promise<any> { return undefined }
export async function listDictionaryEntries(...args: any[]): Promise<any> { return undefined }
export async function listDictionarySitemapEntries(...args: any[]): Promise<any> { return undefined }
export async function searchDictionarySuggest(...args: any[]): Promise<any> { return undefined }
