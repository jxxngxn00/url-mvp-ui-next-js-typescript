"use client";

import { CssBaseline } from "@mui/joy";
import { CssVarsProvider, extendTheme } from "@mui/joy/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          50: "#eef5ff",
          100: "#d9e9ff",
          200: "#b9d6ff",
          300: "#8fbdff",
          400: "#5b9af8",
          500: "#2f75dc",
          600: "#2459c6",
          700: "#2048a2",
          800: "#203f80",
          900: "#1f3768",
        },
        warning: {
          500: "#f7a928",
        },
        background: {
          body: "#f5f7fb",
          surface: "#ffffff",
        },
      },
    },
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "8px",
    xl: "8px",
  },
  fontFamily: {
    body: "Arial, Helvetica, sans-serif",
    display: "Arial, Helvetica, sans-serif",
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CssVarsProvider defaultMode="light" theme={theme}>
        <CssBaseline />
        {children}
      </CssVarsProvider>
    </QueryClientProvider>
  );
}
