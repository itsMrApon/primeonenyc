import { ScrollTrigger } from "gsap/ScrollTrigger";
import local from "~/content/services.json";

/** One of the 16 Prime One services (dashboard table `services`). */
export interface Service {
  id: string;
  no: number;
  name: string;
  /** Short chip label, e.g. TAX, TLC. */
  code: string;
  logo: string;
  headline: string;
  details: string;
  /** Turnaround shown in the open service, e.g. "24" + "hrs". */
  ready: string;
  readyUnit?: string;
  /** Lime laurel beside the docs count. */
  featured?: boolean;
}

/** A downloadable document for a service (dashboard table `service_docs`). */
export interface ServiceDoc {
  id: string;
  /** Service id. */
  service: string;
  sort: number;
  name: string;
  /** Form number or short label on the chip, e.g. MV-82. */
  code: string;
  issuer: string;
  /** e.g. PDF */
  format: string;
  /** File link (dashboard upload or official form). */
  url: string;
}

/** One key date (dashboard table `calendar_events`). `date` is YYYY-MM-DD. */
export interface ServiceDate {
  id: string;
  date: string;
  title: string;
  /** Service id. */
  service: string;
  perk: string;
  perkSuffix?: string;
  gift?: boolean;
  gov: string;
  govUnit?: string;
  note?: string;
}

export interface ServicesData {
  services: Service[];
  docs: ServiceDoc[];
  calendar: {
    columns: Record<"no" | "noMobile" | "event" | "when" | "perk" | "perkMobile" | "gov" | "govMobile", string>;
    events: ServiceDate[];
  };
  formsSection: {
    titleTop: string;
    titleBottom: string;
    body: string;
    columns: Record<
      "open" | "service" | "docs" | "ready" | "no" | "doc" | "from" | "format" | "download" | "noDocs",
      string
    >;
  };
}

/**
 * Prime One services: the 16 services, their downloadable docs, the key-dates calendar and copy.
 * With NUXT_PUBLIC_SERVICES_URL set (the dashboard endpoint, same JSON shape as
 * content/services.json) it is fetched at runtime and stays null until it arrives; any part
 * missing or malformed in the response falls back to the bundled JSON, as does an error.
 * Without the URL the bundled JSON is used immediately.
 */
export function useServices() {
  const url = useRuntimeConfig().public.servicesUrl as string;
  const fallback = local as ServicesData;
  const data = shallowRef<ServicesData | null>(url ? null : fallback);

  if (url) {
    const list = <T>(v: unknown, fb: T[]) => (Array.isArray(v) ? (v as T[]) : fb);
    $fetch<Partial<ServicesData>>(url, { timeout: 5000 })
      .then((r) => {
        data.value = {
          services: list(r?.services, fallback.services),
          docs: list(r?.docs, fallback.docs),
          calendar: {
            columns: { ...fallback.calendar.columns, ...r?.calendar?.columns },
            events: list(r?.calendar?.events, fallback.calendar.events)
          },
          formsSection: {
            ...fallback.formsSection,
            ...r?.formsSection,
            columns: { ...fallback.formsSection.columns, ...r?.formsSection?.columns }
          }
        };
      })
      .catch(() => (data.value = fallback))
      .finally(async () => {
        // The lists arrive after the page's triggers were measured.
        await nextTick();
        ScrollTrigger.refresh();
      });
  }

  return data;
}
