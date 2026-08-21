import { useState } from 'react';
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from '@/shared/constants/countryCodes';
import { Input, Select } from '@/shared/ui/Field';

/** Longest dial code first, so `+1` doesn't shadow a match for a longer code that happens to also start with `1` (e.g. `+1` vs India's own `+91` — matching shortest-first would never misfire here since `+91` doesn't start with `+1`, but this stays correct in general rather than relying on today's specific list never colliding). */
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

/**
 * A country-calling-code selector (real ITU-T E.164 codes, `countryCodes.ts`)
 * combined with the local-number input, rather than a single free-text
 * field that only ever *hinted* at a code via placeholder text — the
 * placeholder disappears the moment someone starts typing, so it was easy
 * to end up with a number that has no country code in it at all despite
 * the backend's own `PHONE_REGEX` accepting that (it doesn't require a
 * leading `+`). The combined `dialCode + ' ' + number` is still a single
 * string on the way out, matching `phone`'s existing shape everywhere else
 * in this app (form state, the API contract, the backend's validator) —
 * this component only changes how that one string gets *composed*, not
 * what it looks like once composed.
 *
 * `value` is only ever read to seed the initial split (lazy `useState`
 * initializer, runs once on mount) — deliberately not kept in sync via an
 * effect for later external changes, since every place this is used
 * remounts fresh per employee (a route change, not a prop swap on a
 * still-mounted instance) rather than reusing one instance across
 * different employees. If a future caller ever needs "sync from a later
 * external value change" behavior, a `key` prop forcing a remount is the
 * React-recommended way to get it — not a setState-in-effect resync.
 */
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
      {/* `Select`/`Input` both bake `w-full` into their own base classes
          (Field.tsx's CONTROL_CLASSES), so handing the Select a width
          utility via its own `className` fights that `w-full` on the same
          element — an unreliable cascade-order battle that empirically
          lost, collapsing the number input next to it to zero width. A
          fixed-width, non-growing wrapper sidesteps the conflict entirely:
          the Select's own `w-full` just fills this 7.5rem box instead of
          trying to override it. */}
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
      {/* min-w-0 guards against the flex-item default of `min-width: auto`,
          which can otherwise refuse to let a flex child shrink below its
          content's natural width — belt-and-suspenders alongside the fixed-
          width wrapper above, not strictly required for a plain text input,
          but removes any doubt rather than leaving it to chance. */}
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
