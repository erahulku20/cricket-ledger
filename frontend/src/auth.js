import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext({
  user: null,
  loading: false,
});

export function AuthProvider({ children }) {
  const [user] = useState(null);

  const value = useMemo(() => ({
    user,
    loading: false,
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
