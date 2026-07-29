import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('home reset', () => {
  it('makes the wordmark return to a blank equation input', async () => {
    window.localStorage.clear();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('mono');
    fireEvent.change(screen.getByLabelText('Your problem'), {
      target: { value: '2x + 3 = 9' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Longhand home, clear the current problem',
      }),
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText('Your problem') as HTMLInputElement).value,
      ).toBe(''),
    );
  });

  it('keeps the menu control beside the equation input', () => {
    window.localStorage.clear();
    render(<App />);
    const masthead = document.querySelector('.masthead');
    expect(masthead?.querySelector('.masthead-top .wordmark')).not.toBeNull();
    expect(
      document.querySelector(
        '.worksheet-input-row .worksheet-menu[aria-label="Open menu"]',
      ),
    ).not.toBeNull();
  });
});
