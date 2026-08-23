import { useState } from 'react';
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from '@/shared/constants/countryCodes';
import { Input, Select } from '@/shared/ui/Field';

const CODES_BY_LENGTH_DESC = [...COUNTRY_CODES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length,
);

function splitPhone(value: string): { dialCode: string; number: string } {
  const trimmed = value.trim();
  const match = CODES_BY_LENGTH_DESC.find((c) => trimmed.startsWith(c.dialCode));
  if (!match) {
    return { dialCode: DEFAULT_COUNTRY_CODE.dialCode, number: trimmed };
  }
  return { dialCode: match.dialCode, number: trimmed.slice(match.dialCode.length).trim() };
}

export function PhoneInput({
  id,
  value,
  onChange,
  required,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [dialCode, setDialCode] = useState(() => splitPhone(value).dialCode);
  const [number, setNumber] = useState(() => splitPhone(value).number);

  function emit(nextDialCode: string, nextNumber: string) {
    onChange(nextNumber ? `${nextDialCode} ${nextNumber}` : nextDialCode);
  }

  return (
    <div className="flex gap-2">
      {}
      <div className="w-[7.5rem] shrink-0">
        <Select
          aria-label="Country calling code"
          value={dialCode}
          onChange={(e) => {
            setDialCode(e.target.value);
            emit(e.target.value, number);
          }}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.iso} value={c.dialCode}>
              {c.flag} {c.dialCode}
            </option>
          ))}
        </Select>
      </div>
      {}
      <div className="min-w-0 flex-1">
        <Input
          id={id}
          required={required}
          type="tel"
          inputMode="tel"
          value={number}
          onChange={(e) => {
            setNumber(e.target.value);
            emit(dialCode, e.target.value);
          }}
          placeholder="98765 43210"
        />
      </div>
    </div>
  );
}
