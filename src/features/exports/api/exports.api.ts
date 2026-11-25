import { httpFile } from '@/shared/api/http-client'

export type ExportSection = 'animals' | 'health' | 'services' | 'births'

export interface ExcelExportParams {
  /** Secciones marcadas, separadas por coma al enviarlas. */
  sections: ExportSection[]
  species?: 'SHEEP' | 'GOAT'
  /** YYYY-MM-DD: sanidad, montas, diagnósticos y partos (no la hoja de animales). */
  from?: string
  to?: string
  /** Solo la hoja de animales. `ALIVE` = inventario actual. */
  status?: string
  /** Solo la hoja de animales. */
  includeExternal?: boolean
}

export const exportsApi = {
  /** Archivo .xlsx; el nombre viene en `Content-Disposition`. */
  excel: ({ sections, ...filters }: ExcelExportParams) =>
    httpFile('/exports/excel', { query: { sections: sections.join(','), ...filters } }),
}
