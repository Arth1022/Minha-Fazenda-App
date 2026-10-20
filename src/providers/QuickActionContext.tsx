import React, { createContext, useCallback, useContext, useRef } from 'react';

type QuickActionHandler = () => void;

interface QuickActionContextValue {
  registerQuickAction: (routeKey: string, handler: QuickActionHandler) => () => void;
  triggerQuickAction: (routeKey: string) => void;
}

const QuickActionContext = createContext<QuickActionContextValue>({
  registerQuickAction: () => () => {},
  triggerQuickAction: () => {},
});

export function QuickActionProvider({ children }: { children: React.ReactNode }) {
  const handlersRef = useRef<Record<string, QuickActionHandler>>({});

  const registerQuickAction = useCallback(
    (routeKey: string, handler: QuickActionHandler) => {
      handlersRef.current[routeKey] = handler;
      return () => {
        if (handlersRef.current[routeKey] === handler) {
          delete handlersRef.current[routeKey];
        }
      };
    },
    []
  );

  const triggerQuickAction = useCallback((routeKey: string) => {
    const handler = handlersRef.current[routeKey];
    if (handler) {
      handler();
    }
  }, []);

  return (
    <QuickActionContext.Provider
      value={{ registerQuickAction, triggerQuickAction }}>
      {children}
    </QuickActionContext.Provider>
  );
}

export function useQuickAction() {
  return useContext(QuickActionContext);
}
