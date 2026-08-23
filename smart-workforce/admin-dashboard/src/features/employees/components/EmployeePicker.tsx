import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Popover } from '@/shared/ui/Popover';
import { searchEmployees } from '@/features/employees/api/employeesApi';

export interface EmployeeOption {
  id: string;
  label: string;
}

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
  const inputRef = useRef<HTMLInputElement>(null);

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
      <div className="flex items-center justify-between rounded-xl border border-border-strong bg-card-subtle px-3.5 py-2.5 text-[14.5px]">
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

  const showMenu = isOpen && debouncedTerm.trim().length > 0;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border-strong bg-card-subtle px-3.5 py-2.5 text-[14.5px] text-text placeholder:text-text-faint focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none"
      />
      <Popover
        anchorRef={inputRef}
        open={showMenu}
        onClose={() => setIsOpen(false)}
        sameWidthAsAnchor
        className="flex max-h-56 flex-col overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-[0_16px_40px_-12px_rgba(20,20,50,0.25)]"
      >
        {!results || results.length === 0 ? (
          <p className="px-3 py-3 text-[13px] text-text-dim">No matches.</p>
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
              className="block w-full rounded-lg px-3 py-2.5 text-left text-[13.5px] hover:bg-ink/[0.04]"
            >
              {emp.firstName} {emp.lastName}{' '}
              <span className="font-mono text-[11.5px] text-text-dim">{emp.employeeCode}</span>
            </button>
          ))
        )}
      </Popover>
    </div>
  );
}
