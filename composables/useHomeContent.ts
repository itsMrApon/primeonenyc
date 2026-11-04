import home from "~/content/home.json";

export type HomeContent = typeof home;

export function useHomeContent(): HomeContent {
  return home;
}
