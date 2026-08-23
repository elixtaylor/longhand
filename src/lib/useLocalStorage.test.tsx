import { act, renderHook } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem('longhand.test');
  });

  it('does not rewrite storage when the serialised value is unchanged', () => {
    localStorage.setItem('longhand.test', JSON.stringify('saved'));
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    const { result } = renderHook(() =>
      useLocalStorage('longhand.test', 'fallback'),
    );

    expect(result.current[0]).toBe('saved');
    expect(setItem).not.toHaveBeenCalled();

    act(() => result.current[1]('updated'));
    expect(setItem).toHaveBeenCalledOnce();
    expect(localStorage.getItem('longhand.test')).toBe(
      JSON.stringify('updated'),
    );
  });
});
