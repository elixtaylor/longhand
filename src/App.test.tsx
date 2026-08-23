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

  it('keeps the menu control below the masthead in the workspace', () => {
    window.localStorage.clear();
    render(<App />);
    const masthead = document.querySelector('.masthead');
    expect(masthead?.querySelector('.masthead-top .wordmark')).not.toBeNull();
    expect(
      document.querySelector(
        '.home-workspace .masthead-menu [aria-label="Open menu"]',
      ),
    ).not.toBeNull();
  });

  it('gives the settings route a page heading', () => {
    window.history.replaceState(null, '', '/settings');
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeTruthy();
    window.history.replaceState(null, '', '/');
  });
});
