import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchEmployees } from '@/features/employees/api/employeesApi';

export interface EmployeeOption {
  id: string;
  label: string;
}

/**
 * A debounced typeahead over `GET /employees/search` — there's no bounded
 * list of employees to just dump into a `<select>` (could be hundreds), so
 * this is a real search, not a truncated dropdown. Used by the employee
 * form's manager field today; general enough to reuse for shift assignment
 * later.
 */
export function EmployeePicker({
  value,
  onChange,
  placeholder = 'Search by name or employee code…',
}: {
  value: EmployeeOption | null;
  onChange: (next: EmployeeOption | null) => void;
  placeholder?: string;
}) {
  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedTerm(term), 300);
    return () => clearTimeout(timeout);
  }, [term]);

  const { data: results } = useQuery({
    queryKey: ['employees', 'search', debouncedTerm],
    queryFn: () => searchEmployees(debouncedTerm),
    enabled: debouncedTerm.trim().length > 0,
  });

  if (value && !isOpen) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-[14.5px]">
        <span>{value.label}</span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setTerm('');
          }}
          className="text-text-dim hover:text-danger"
          aria-label="Clear selection"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)} // lets a click on a result register first
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-[14.5px] text-text placeholder:text-text-faint focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
      />
      {isOpen && debouncedTerm.trim().length > 0 && (
        <div className="absolute z-10 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-[#0a0a0d] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]">
          {!results || results.length === 0 ? (
            <p className="px-3.5 py-3 text-[13px] text-text-dim">No matches.</p>
          ) : (
            results.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => {
                  onChange({
                    id: emp.id,
                    label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`,
                  });
                  setTerm('');
                  setIsOpen(false);
                }}
                className="block w-full px-3.5 py-2.5 text-left text-[13.5px] hover:bg-white/[0.05]"
              >
                {emp.firstName} {emp.lastName}{' '}
                <span className="font-mono text-[11.5px] text-text-dim">{emp.employeeCode}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
