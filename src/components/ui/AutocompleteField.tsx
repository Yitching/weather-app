import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './AutocompleteField.module.css';
import { TextField } from './TextField';

interface AutocompleteFieldProps<T> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: T[];
  getKey: (item: T) => string;
  renderSuggestion: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  placeholder?: string;
  maxLength?: number;
}

/**
 * Text field with a suggestion list, following the WAI-ARIA combobox pattern:
 * ↑/↓ move through suggestions, Enter picks one, Escape closes the list.
 * When no suggestion is highlighted, Enter submits the surrounding form as usual.
 */
export function AutocompleteField<T>({
  label,
  value,
  onChange,
  suggestions,
  getKey,
  renderSuggestion,
  onSelect,
  ...inputProps
}: AutocompleteFieldProps<T>) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const isListVisible = isOpen && suggestions.length > 0;
  // Suggestions can change while the list is open; never point past the end.
  const currentIndex = activeIndex < suggestions.length ? activeIndex : -1;
  const optionId = (index: number) => `${listId}-option-${index}`;

  const close = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const select = (item: T) => {
    onSelect(item);
    close();
  };

  const handleChange = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = suggestions.length;
    switch (event.key) {
      case 'ArrowDown':
        if (count === 0) return;
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex(isListVisible ? (currentIndex + 1) % count : 0);
        break;
      case 'ArrowUp':
        if (!isListVisible) return;
        event.preventDefault();
        setActiveIndex(currentIndex <= 0 ? count - 1 : currentIndex - 1);
        break;
      case 'Enter': {
        const activeItem = isListVisible ? suggestions[currentIndex] : undefined;
        if (activeItem === undefined) return; // let the form submit
        event.preventDefault();
        select(activeItem);
        break;
      }
      case 'Escape':
        if (isListVisible) {
          event.preventDefault();
          close();
        }
        break;
    }
  };

  return (
    <div className={styles.wrapper}>
      <TextField
        label={label}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={close}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isListVisible}
        aria-controls={listId}
        aria-activedescendant={
          isListVisible && currentIndex >= 0 ? optionId(currentIndex) : undefined
        }
        // Our own list replaces the browser's autofill dropdown, which would cover it.
        autoComplete="off"
        {...inputProps}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={`${label} suggestions`}
        className={styles.list}
        hidden={!isListVisible}
      >
        {isListVisible &&
          suggestions.map((item, index) => (
            <li
              key={getKey(item)}
              id={optionId(index)}
              role="option"
              aria-selected={index === currentIndex}
              className={styles.option}
              // mousedown (not click) fires before the input loses focus and closes the list.
              onMouseDown={(event) => {
                event.preventDefault();
                select(item);
              }}
              onMouseMove={() => setActiveIndex(index)}
            >
              {renderSuggestion(item)}
            </li>
          ))}
      </ul>
    </div>
  );
}
