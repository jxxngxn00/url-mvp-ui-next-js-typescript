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
          50: "#eef7ff",
          100: "#d7ecff",
          200: "#b4dcff",
          300: "#82c7ff",
          400: "#36d7ff",
          500: "#1e88ff",
          600: "#1870db",
          700: "#155ab2",
          800: "#154b8a",
          900: "#12345f",
        },
        danger: {
          500: "#ff2fb3",
        },
        success: {
          500: "#6dff8c",
        },
        warning: {
          500: "#ff8a35",
        },
        background: {
          body: "#111216",
          surface: "#20242d",
          level1: "#171a21",
          level2: "#2a303b",
          level3: "#3a4352",
        },
        text: {
          primary: "#f2f6ff",
          secondary: "#c8d2e1",
          tertiary: "#9aa7b9",
        },
        divider: "#3a4352",
        neutral: {
          50: "#f2f6ff",
          100: "#d9e1ee",
          200: "#b9c5d6",
          300: "#8e9caf",
          400: "#6d788a",
          500: "#4e5867",
          600: "#3a4352",
          700: "#2a303b",
          800: "#20242d",
          900: "#171a21",
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
    body: "Inter, Arial, Helvetica, sans-serif",
    display: "Inter, Arial, Helvetica, sans-serif",
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
