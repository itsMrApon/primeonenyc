/**
 * The reference preloads every Rive file before it reveals the page
 * (window "allriveloaded"), and its boot screen stays up until they are in.
 * Same here: one shared fetch per file, reused by any section that needs it.
 */
const FILES = {
  "btn-ui": "btn-ui.riv",
  circuits: "circuits.riv",
  reef: "reef.riv",
  phrases: "phrases.riv",
  logo: "ln4.riv",
  "mob-landscape": "mob-landscape.riv"
} as const;

export type RiveFileKey = keyof typeof FILES;

let pending: Promise<Record<RiveFileKey, ArrayBuffer>> | null = null;

export function loadAllRiveFiles() {
  pending ??= Promise.all(
    (Object.entries(FILES) as [RiveFileKey, string][]).map(async ([key, file]) => {
      const res = await fetch(`/rive/${file}`);
      if (!res.ok) throw new Error(`Rive file ${file}: ${res.status}`);
      return [key, await res.arrayBuffer()] as const;
    })
  ).then((entries) => Object.fromEntries(entries) as Record<RiveFileKey, ArrayBuffer>);
  return pending;
}
