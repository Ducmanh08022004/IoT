import { useEffect, useRef, useState } from 'react';

export function CustomSelect({ value, options, onChange, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
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

      const menu = root.querySelector('.custom-select__menu');
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