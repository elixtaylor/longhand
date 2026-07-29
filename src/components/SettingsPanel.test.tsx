import { render, screen } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';

describe('SettingsPanel compact layout', () => {
  it('keeps each setting to one labelled row without descriptions', () => {
    const onShowPalette = vi.fn();
    render(
      <SettingsPanel
        theme="mono"
        onTheme={vi.fn()}
        revealMode="all"
        onRevealMode={vi.fn()}
        dark={false}
        onDark={vi.fn()}
        textSize="md"
        onTextSize={vi.fn()}
        showPalette
        onShowPalette={onShowPalette}
      />,
    );

    expect(document.querySelectorAll('.setting-row')).toHaveLength(5);
    expect(document.querySelectorAll('.setting-hint')).toHaveLength(0);
    expect(screen.getByText('Theme')).toBeTruthy();
    expect(screen.getByText('Light or dark')).toBeTruthy();
    expect(screen.getByText('Text size')).toBeTruthy();
    expect(screen.getByText('Working out')).toBeTruthy();
    expect(
      screen
        .getByRole('switch', { name: 'Equation buttons' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    screen.getByRole('switch', { name: 'Equation buttons' }).click();
    expect(onShowPalette).toHaveBeenCalledWith(false);
  });
});
