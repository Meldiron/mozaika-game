import { Client, TablesDB } from 'node-appwrite'

const endpoint = process.env.APPWRITE_ENDPOINT
const projectId = process.env.APPWRITE_PROJECT_ID
const apiKey = process.env.APPWRITE_API_KEY

export const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? ''
export const APPWRITE_TABLE_ID = process.env.APPWRITE_TABLE_ID ?? ''

export const isAppwriteConfigured =
  !!endpoint && !!projectId && !!apiKey && !!APPWRITE_DATABASE_ID && !!APPWRITE_TABLE_ID

let tablesDB: TablesDB | null = null

export function getTablesDB(): TablesDB {
  if (!tablesDB) {
    const client = new Client()
      .setEndpoint(endpoint!)
      .setProject(projectId!)
      .setKey(apiKey!)
    tablesDB = new TablesDB(client)
  }
  return tablesDB
}
