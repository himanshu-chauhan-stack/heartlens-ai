"use client";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps as NextThemesProviderProps,
} from "next-themes";
import { MotionConfig } from "framer-motion";

export function ThemeProvider({ children, ...props }: NextThemesProviderProps) {
  return <NextThemesProvider {...props}><MotionConfig reducedMotion="user">{children}</MotionConfig></NextThemesProvider>;
}
