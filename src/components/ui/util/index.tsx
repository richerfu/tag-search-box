import { forwardRef, useRef, useEffect, useState, useCallback } from "react";

export function searchFilter(optionValue: string, inputValue: string) {
  return String(optionValue)
    .trim()
    .toLowerCase()
    .includes(String(inputValue).trim().toLowerCase());
}

export const withOutsideClickHook = (Component: any, closeFnName = "close") => {
  return forwardRef((props: any, ref) => {
    const componentRef = useRef<any>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          componentRef.current &&
          !componentRef.current.contains(event.target) &&
          !(event.target as any)?.closest?.(".ignore-outside-click")
        ) {
          if (componentRef.current[closeFnName]) {
            componentRef.current[closeFnName]();
          }
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    return (
      <Component
        {...props}
        ref={(r: any) => {
          if (typeof ref === "function") {
            ref(r);
          } else if (ref) {
            ref.current = r;
          }
          componentRef.current = r;
        }}
      />
    );
  });
};

export function useCallbackState<T>(initialState: T | (() => T)) {
  const [state, setState] = useState(initialState);
  const callbackRef = useRef<((state: T) => void) | null>(null);

  const setCallbackState = useCallback(
    (state: T, callback: (state: T) => void) => {
      callbackRef.current = callback;
      setState(state);
    },
    []
  );

  useEffect(() => {
    if (callbackRef.current) {
      callbackRef.current(state);
      callbackRef.current = null;
    }
  }, [state]);

  return [state, setCallbackState] as const;
}
