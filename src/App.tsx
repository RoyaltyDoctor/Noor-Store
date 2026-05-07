/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import Layout from "./components/Layout";
import { useEffect } from "react";
import { useThemeStore } from "./themeStore";

// Use a data router to support useBlocker
const router = createBrowserRouter([
  {
    path: "*",
    element: <Layout />
  }
]);

export default function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = () => {
      root.classList.remove("light", "dark");
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return <RouterProvider router={router} />;
}
