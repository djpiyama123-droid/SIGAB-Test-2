import { useCallback } from 'react';

export function usePrintFormato() {
  const print = useCallback(() => {
    window.print();
  }, []);
  return { print };
}
