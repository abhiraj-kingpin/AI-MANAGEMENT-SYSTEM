import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Popover } from '@/shared/ui/Popover';

interface OptionItem {
  value: string;
  label: ReactNode;
  disabled: boolean;
}

interface OptionElementProps {
  value: string;
  children?: ReactNode;
  disabled?: boolean;
}

/** Walks `<option>` children (static or `.map()`-produced) into a flat list —
 *  the same shape every call site in this app already passes to a native
 *  `<select>`, so this is a drop-in replacement with no call-site changes. */
function collectOptions(children: ReactNode): OptionItem[] {
  const items: OptionItem[] = [];
  const walk = (node: ReactNode) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object' && 'type' in node) {
      const el = node as ReactElement<OptionElementProps>;
      if (el.type === 'option') {
        items.push({ value: el.props.value, label: el.props.children, disabled: !!el.props.disabled });
        return;
      }
      const childProps = el.props as { children?: ReactNode } | undefined;
      if (childProps && 'children' in childProps) walk(childProps.children);
    }
  };
  walk(children);
  return items;
}

export interface SelectProps {
  id?: string;
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  'aria-label'?: string;
  placeholder?: string;
}

const TRIGGER_CLASSES =
  'flex w-full items-center justify-between gap-2 rounded-xl border border-border-strong bg-card-subtle px-3.5 py-2.5 text-left text-[14.5px] outline-none transition-colors focus:border-accent-light focus:bg-accent/[0.06] disabled:cursor-not-allowed disabled:opacity-50';

const MENU_CLASSES =
  'flex max-h-64 flex-col overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(20,20,50,0.25)]';

export function Select({
  id,
  value,
  onChange,
  children,
  className = '',
  disabled,
  required,
  name,
  'aria-label': ariaLabel,
  placeholder = 'Select…',
}: SelectProps) {
  const options = useMemo(() => collectOptions(children), [children]);
  const selectableIndexes = useMemo(
    () => options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i !== -1),
    [options],
  );

  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<number>(-1);
  const typeaheadRef = useRef('');
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = `${id ?? 'select'}-listbox`;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex !== -1 ? options[selectedIndex] : null;

  const close = () => setOpen(false);

  const openMenu = () => {
    if (disabled) return;
    setHighlighted(selectedIndex !== -1 && !selected?.disabled ? selectedIndex : (selectableIndexes[0] ?? -1));
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange({ target: { value: option.value } });
    close();
    triggerRef.current?.focus();
  };

  const moveHighlight = (direction: 1 | -1) => {
    if (selectableIndexes.length === 0) return;
    const pos = selectableIndexes.indexOf(highlighted);
    const nextPos =
      pos === -1
        ? direction === 1
          ? 0
          : selectableIndexes.length - 1
        : (pos + direction + selectableIndexes.length) % selectableIndexes.length;
    setHighlighted(selectableIndexes[nextPos]);
  };

  const typeahead = (char: string) => {
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
    typeaheadRef.current += char.toLowerCase();
    const buffer = typeaheadRef.current;
    typeaheadTimer.current = setTimeout(() => {
      typeaheadRef.current = '';
    }, 500);
    const match = options.findIndex(
      (o) => !o.disabled && String(o.label ?? '').toLowerCase().startsWith(buffer),
    );
    if (match !== -1) setHighlighted(match);
  };

  const handleTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveHighlight(-1);
        break;
      case 'Home':
        e.preventDefault();
        if (selectableIndexes.length) setHighlighted(selectableIndexes[0]);
        break;
      case 'End':
        e.preventDefault();
        if (selectableIndexes.length) setHighlighted(selectableIndexes[selectableIndexes.length - 1]);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(highlighted);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) typeahead(e.key);
    }
  };

  useEffect(() => {
    if (!open) typeaheadRef.current = '';
  }, [open]);

  const displayLabel = selected ? selected.label : placeholder;
  const isPlaceholder = !selected || selected.disabled;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        name={name}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        aria-label={ariaLabel}
        role="combobox"
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={TRIGGER_CLASSES}
      >
        <span className={`truncate ${isPlaceholder ? 'text-text-faint' : 'text-text'}`}>
          {displayLabel}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-text-faint transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <Popover anchorRef={triggerRef} open={open} onClose={close} sameWidthAsAnchor className={MENU_CLASSES}>
        <div id={listboxId} role="listbox" aria-label={ariaLabel} tabIndex={-1}>
          {options.length === 0 ? (
            <p className="px-3 py-2.5 text-[13px] text-text-dim">No options available</p>
          ) : (
            options.map((option, index) => (
              <div
                key={index}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
                onMouseEnter={() => !option.disabled && setHighlighted(index)}
                onClick={() => commit(index)}
                className={`flex cursor-pointer items-center justify-between gap-2 truncate rounded-lg px-3 py-2 text-[13.5px] ${
                  option.disabled
                    ? 'cursor-default text-text-faint'
                    : index === highlighted
                      ? 'bg-accent/[0.09] text-text'
                      : option.value === value
                        ? 'bg-ink/[0.04] text-text'
                        : 'text-text hover:bg-ink/[0.04]'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && !option.disabled && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-accent"
                    aria-hidden="true"
                  >
                    <path d="M5 13l4.5 4.5L19 7" />
                  </svg>
                )}
              </div>
            ))
          )}
        </div>
      </Popover>
    </div>
  );
}
