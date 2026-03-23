import { useEffect, useRef, useState } from 'react';

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type CustomSelectProps<T extends string | number> = {
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  ariaLabel?: string;
};

export function CustomSelect<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setOpenUpward(false);
      return;
    }

    const calculateDirection = () => {
      const root = rootRef.current;
      if (!root) {
        return;
      }

      const menu = root.querySelector('.custom-select__menu') as HTMLDivElement | null;
      if (!menu) {
        return;
      }

      const triggerRect = root.getBoundingClientRect();
      const menuHeight = menu.getBoundingClientRect().height;
      const availableBottom = window.innerHeight - triggerRect.bottom;
      const availableTop = triggerRect.top;

      const needsOpenUpward = availableBottom < menuHeight + 8 && availableTop > availableBottom;
      setOpenUpward(needsOpenUpward);
    };

    const frameId = window.requestAnimationFrame(calculateDirection);
    window.addEventListener('resize', calculateDirection);
    window.addEventListener('scroll', calculateDirection, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', calculateDirection);
      window.removeEventListener('scroll', calculateDirection, true);
    };
  }, [isOpen, options.length]);

  const rootClassName = [
    'select-wrap',
    'custom-select',
    isOpen ? 'custom-select--open' : '',
    openUpward ? 'custom-select--up' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={rootRef} className={rootClassName}>
      <button
        type="button"
        className="custom-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        {selected?.label ?? ''}
      </button>

      {isOpen ? (
        <div className="custom-select__menu" role="listbox">
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={
                option.value === value
                  ? 'custom-select__option custom-select__option--active'
                  : 'custom-select__option'
              }
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
