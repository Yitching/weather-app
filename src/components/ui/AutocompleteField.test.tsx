import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AutocompleteField } from './AutocompleteField';

const FRUITS = ['Apple', 'Apricot', 'Avocado'];

function renderField({ suggestions = FRUITS } = {}) {
  const onSelect = vi.fn();
  const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());

  function Harness() {
    const [value, setValue] = useState('');
    return (
      <form onSubmit={onSubmit}>
        <AutocompleteField
          label="Fruit"
          value={value}
          onChange={setValue}
          suggestions={suggestions}
          getKey={(item) => item}
          renderSuggestion={(item) => item}
          onSelect={(item) => {
            setValue(item);
            onSelect(item);
          }}
        />
      </form>
    );
  }

  render(<Harness />);
  return { onSelect, onSubmit, user: userEvent.setup(), input: screen.getByRole('combobox') };
}

describe('AutocompleteField', () => {
  it('is a labelled combobox that starts closed', () => {
    const { input } = renderField();

    expect(input).toHaveAccessibleName('Fruit');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('opens the suggestions when the user types', async () => {
    const { input, user } = renderField();

    await user.type(input, 'a');

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox', { name: 'Fruit suggestions' })).toBeVisible();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('stays closed when there are no suggestions', async () => {
    const { input, user } = renderField({ suggestions: [] });

    await user.type(input, 'zzz');

    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('selects a suggestion with the mouse', async () => {
    const { input, user, onSelect } = renderField();
    await user.type(input, 'a');

    await user.click(screen.getByRole('option', { name: 'Apricot' }));

    expect(onSelect).toHaveBeenCalledWith('Apricot');
    expect(input).toHaveValue('Apricot');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('moves with the arrow keys (wrapping around) and selects with Enter', async () => {
    const { input, user, onSelect, onSubmit } = renderField();
    await user.type(input, 'a');

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Apple' })).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]?.id);

    await user.keyboard('{ArrowUp}'); // wraps to the last item
    expect(screen.getByRole('option', { name: 'Avocado' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('Avocado');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the form and closes the list on Enter when no suggestion is highlighted', async () => {
    const { input, user, onSelect, onSubmit } = renderField();

    await user.type(input, 'a{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('closes with Escape and when focus leaves the field', async () => {
    const { input, user } = renderField();

    await user.type(input, 'a');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}'); // reopens
    expect(screen.getAllByRole('option')).toHaveLength(3);

    await user.tab();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
