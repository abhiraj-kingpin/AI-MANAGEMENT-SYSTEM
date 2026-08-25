import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { createEmployee } from '@/features/employees/api/employeesApi';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { pushToast } from '@/stores/toastStore';
import type { CreateEmployeeInput } from '@/types/api';

const TEMPLATE_HEADER = 'firstName,lastName,email,phone,department,designation,dateOfJoining\n';
const TEMPLATE_ROW = 'Amara,Ellison,amara@company.com,+15550100001,Design,Product Designer,2026-09-01\n';

interface RowResult {
  row: number;
  name: string;
  ok: boolean;
  message?: string;
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim()));
}

export function BulkImportModal({ onClose }: { onClose: () => void }) {
  const { data: departments } = useDepartments();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<RowResult[] | null>(null);

  const departmentIdByName = new Map((departments ?? []).map((d) => [d.name.toLowerCase(), d.id]));

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_HEADER, TEMPLATE_ROW], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employees-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    const rows = parseCsv(csvText);
    if (rows.length === 0) return;

    const [header, ...dataRows] = rows;
    const cols = header.map((c) => c.toLowerCase());
    const idx = (name: string) => cols.indexOf(name);

    setIsImporting(true);
    const rowResults: RowResult[] = [];

    // Sequential, not Promise.all — each createEmployee touches shared
    // per-department sequence counters (employee codes), so parallel
    // requests would race each other for the same code.
    for (let i = 0; i < dataRows.length; i += 1) {
      const cells = dataRows[i];
      const firstName = cells[idx('firstname')] ?? '';
      const lastName = cells[idx('lastname')] ?? '';
      const name = `${firstName} ${lastName}`.trim() || `Row ${i + 2}`;
      const departmentName = cells[idx('department')] ?? '';
      const departmentId = departmentIdByName.get(departmentName.toLowerCase());

      if (!departmentId) {
        rowResults.push({ row: i + 2, name, ok: false, message: `Unknown department "${departmentName}"` });
        continue;
      }

      const input: CreateEmployeeInput = {
        firstName,
        lastName,
        email: cells[idx('email')] ?? '',
        phone: cells[idx('phone')] ?? '',
        departmentId,
        designation: cells[idx('designation')] ?? '',
        dateOfJoining: cells[idx('dateofjoining')] ?? new Date().toISOString().slice(0, 10),
      };

      try {
        await createEmployee(input);
        rowResults.push({ row: i + 2, name, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed';
        rowResults.push({ row: i + 2, name, ok: false, message });
      }
    }

    setResults(rowResults);
    setIsImporting(false);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    const succeeded = rowResults.filter((r) => r.ok).length;
    pushToast(`Imported ${succeeded} of ${rowResults.length} employee(s)`);
  };

  return (
    <Modal title="Bulk import employees" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[12px] leading-relaxed text-text-dim">
          CSV with columns: firstName, lastName, email, phone, department (must match an existing
          department name), designation, dateOfJoining (YYYY-MM-DD).
        </p>
        <button type="button" onClick={downloadTemplate} className="self-start text-[12px] font-semibold text-accent-light hover:underline">
          Download CSV template
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="text-[12.5px]"
        />

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={6}
          placeholder="Paste CSV rows here, or choose a file above…"
          className="w-full rounded-xl border border-border-strong bg-card-subtle px-3.5 py-2.5 font-mono text-[12px] text-text placeholder:text-text-faint focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
        />

        {results && (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-border">
            {results.map((r) => (
              <div
                key={r.row}
                className={`flex items-center gap-2 border-b border-border/60 px-3 py-2 text-[12px] last:border-0 ${r.ok ? '' : 'bg-danger/5'}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.ok ? 'bg-success' : 'bg-danger'}`} />
                <span className="flex-1 truncate font-semibold">{r.name}</span>
                <span className={r.ok ? 'text-text-dim' : 'text-danger'}>{r.ok ? 'Added' : r.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void runImport()}
            disabled={isImporting || !csvText.trim()}
            className="rounded-2xl bg-accent px-5 py-3 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {isImporting ? 'Importing…' : 'Import'}
          </button>
          <button type="button" onClick={onClose} className="rounded-2xl bg-card-subtle px-4.5 py-3 text-[13px] font-bold text-text-dim">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
