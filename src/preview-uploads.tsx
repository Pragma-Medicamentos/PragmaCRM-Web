/**
 * ARCHIVO TEMPORAL — solo para revisar los estados de la pantalla de
 * importación sin levantar Supabase ni la API. Borrar después.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/shadcn.css'
import './index.css'
import { ImportStepper } from './features/uploads/ImportStepper'
import { UploadSummaryCard } from './features/uploads/UploadSummaryCard'
import { SalesFileDropzone } from './features/uploads/SalesFileDropzone'
import type { SalesUploadState } from './features/uploads/useSalesUpload'
import type { SalesUploadSummary } from './features/uploads/uploads.types'

const fakeFile = new File(['[]'], 'ventas_efactsoft_2026-09-01.json', {
  type: 'application/json',
})
Object.defineProperty(fakeFile, 'size', { value: 2_517_000 })

const summary: SalesUploadSummary = {
  upload_id: '9f3c1b7e-5d21-4a08-bb44-0c2e77a91d35',
  sales_received: 8914,
  accepted: 8562,
  rejected: 12,
  inserted: 340,
  updated: 8222,
  sync_failed: 0,
  range: { from: '2026-08-01', to: '2026-08-31' },
  rejections: [
    { index: 118, erp_sale_id: 44120, reason: 'customer_nit: Required' },
    { index: 204, erp_sale_id: null, reason: 'erp_sale_id: Expected number, received null' },
    { index: 310, erp_sale_id: 44987, reason: 'total: Invalid decimal format' },
  ],
  rejections_truncated: 9,
  warnings: {
    sales_without_customer: 23,
    sales_without_user: 4,
    quotations_skipped: 340,
  },
}

const ready: SalesUploadState = {
  status: 'ready',
  file: fakeFile,
  salesCount: 8914,
  quotationsCount: 340,
  deep: true,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-8">
      <Section title="Encabezado">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-bold">Carga manual de historial</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Archivo JSON exportado desde Efactsoft
            </p>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            Última carga: 28 ago 2026, 9:12 a. m.
          </p>
        </header>
      </Section>

      <Section title="Stepper — paso 1 (idle)">
        <ImportStepper status="idle" />
      </Section>
      <Section title="Stepper — paso 1 con error (invalid)">
        <ImportStepper status="invalid" />
      </Section>
      <Section title="Stepper — paso 2 (ready)">
        <ImportStepper status="ready" />
      </Section>
      <Section title="Stepper — paso 3 (uploading)">
        <ImportStepper status="uploading" />
      </Section>
      <Section title="Stepper — completo (success)">
        <ImportStepper status="success" />
      </Section>

      <Section title="Dropzone vacío">
        <SalesFileDropzone state={{ status: 'idle' }} onSelectFile={() => {}} onClear={() => {}} />
      </Section>

      <Section title="Dropzone con archivo (ready)">
        <SalesFileDropzone state={ready} onSelectFile={() => {}} onClear={() => {}} />
      </Section>

      <Section title="Resumen de resultado">
        <UploadSummaryCard summary={summary} />
      </Section>
    </div>
  </StrictMode>
)
