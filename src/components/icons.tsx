import type { CategoryIconKey } from "@/lib/classify";

type P = { size?: number };

function Svg({ size = 18, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />
  </Svg>
);
export const IconList = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </Svg>
);
export const IconPlusCircle = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v8M8 12h8" />
  </Svg>
);
export const IconReceipt = (p: P) => (
  <Svg {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6" />
  </Svg>
);
export const IconTag = (p: P) => (
  <Svg {...p}>
    <path d="M20 12 12 4H5v7l8 8z" />
    <circle cx="8.5" cy="8.5" r="1" />
  </Svg>
);
export const IconBars = (p: P) => (
  <Svg {...p}>
    <path d="M5 20V10M10 20V4M15 20v-7M20 20V8" />
  </Svg>
);
export const IconWallet = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <path d="M3 10h18M16 15h2" />
  </Svg>
);
export const IconBudget = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h16M6 16V9m4 7V6m4 10v-5m4 5v-8" />
  </Svg>
);
export const IconFlag = (p: P) => (
  <Svg {...p}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Svg>
);
export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V4M4 20h16M8 16l3-5 3 3 5-7" />
  </Svg>
);
export const IconReport = (p: P) => (
  <Svg {...p}>
    <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Svg>
);
export const IconSettings = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);
export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Svg>
);
export const IconChevronLeft = (p: P) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);
export const IconChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const IconChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const IconCamera = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 12 4.5 4.5L19 7" />
  </Svg>
);
export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const IconArrowUp = (p: P) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
);
export const IconArrowDown = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
);
export const IconCloud = (p: P) => (
  <Svg {...p}>
    <path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.75 3.75 0 0 1 17.5 18z" />
    <path d="m9.5 13.5 2 2 3.5-3.5" />
  </Svg>
);
export const IconCard = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18M7 15h4" />
  </Svg>
);
export const IconGamepad = (p: P) => (
  <Svg {...p}>
    <path d="M7 8h10a4 4 0 0 1 4 4v2a3 3 0 0 1-5.4 1.8L14.5 14h-5l-1.1 1.8A3 3 0 0 1 3 14v-2a4 4 0 0 1 4-4z" />
    <path d="M8 11v3M6.5 12.5h3M16 11.5h.01M18 13h.01" />
  </Svg>
);
export const IconBulb = (p: P) => (
  <Svg {...p}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  </Svg>
);
export const IconGauge = (p: P) => (
  <Svg {...p}>
    <path d="M4 16a8 8 0 1 1 16 0" />
    <path d="m12 16 4-5" />
  </Svg>
);

export const IconLayers = (p: P) => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 12.5 9 5 9-5M3 16.5l9 5 9-5" />
  </Svg>
);
export const IconPie = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v9h9a9 9 0 1 1-9-9z" />
    <path d="M15 3.5A9 9 0 0 1 20.5 9H15z" />
  </Svg>
);
export const IconDoc = (p: P) => (
  <Svg {...p}>
    <path d="M7 3h7l4 4v14H7z" />
    <path d="M14 3v4h4M10 12h5M10 16h5" />
  </Svg>
);
export const IconTagStack = (p: P) => (
  <Svg {...p}>
    <path d="M19 12.5 11.5 5H5v6.5l7.5 7.5z" />
    <path d="M21 14.5 13.5 22" />
    <circle cx="8.5" cy="8.5" r="1" />
  </Svg>
);
export const IconGrid = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Svg>
);
export const IconRows = (p: P) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
  </Svg>
);
export const IconMore = (p: P) => (
  <Svg {...p}>
    <circle cx="6" cy="12" r="1.1" />
    <circle cx="12" cy="12" r="1.1" />
    <circle cx="18" cy="12" r="1.1" />
  </Svg>
);
export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconPencil = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
  </Svg>
);
export const IconMerge = (p: P) => (
  <Svg {...p}>
    <path d="M6 4v4a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v4" />
    <path d="M18 4v4a4 4 0 0 1-4 4" />
    <path d="m15 17 3 3 3-3" />
  </Svg>
);
export const IconArchive = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="5" rx="1" />
    <path d="M5 9v11h14V9M10 13h4" />
  </Svg>
);
export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
  </Svg>
);
export const IconCheckCircle = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 3 3 5-6" />
  </Svg>
);
export const IconTrendDown = (p: P) => (
  <Svg {...p}>
    <path d="M4 7l6 6 4-4 6 6M20 10v5h-5" />
  </Svg>
);
export const IconTrendUp = (p: P) => (
  <Svg {...p}>
    <path d="M4 17l6-6 4 4 6-6M20 14V9h-5" />
  </Svg>
);
export const IconPalette = (p: P) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 1.5-2.2-.5-1.3.3-2.3 1.7-2.3H18a3 3 0 0 0 3-3c0-5.6-4-10.5-9-10.5z" />
    <circle cx="7.5" cy="11" r="1" />
    <circle cx="10" cy="7" r="1" />
    <circle cx="15" cy="7.5" r="1" />
  </Svg>
);

const CATEGORY_PATHS: Record<CategoryIconKey, React.ReactNode> = {
  cart: (
    <>
      <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
      <circle cx="9" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
    </>
  ),
  home: <path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z" />,
  car: (
    <>
      <path d="M5 16V11l2-5h10l2 5v5" />
      <path d="M3 16h18v3H3zM5 11h14" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 13H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  fork: (
    <>
      <path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10" />
      <path d="M17 21V3c-2 1-3 4-3 7h3" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  ),
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6z" />,
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  baby: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21a6 6 0 0 1 12 0" />
    </>
  ),
  dots: (
    <>
      <circle cx="6" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="18" cy="12" r="1" />
    </>
  ),
  dollar: (
    <>
      <path d="M12 3v18" />
      <path d="M16.5 7.5c-.8-1.2-2.4-2-4.5-2-2.5 0-4 1.3-4 3s1.5 2.6 4 3.2 4 1.5 4 3.3-1.6 3-4 3c-2.2 0-3.8-.8-4.7-2.2" />
    </>
  ),
  cutlery: (
    <>
      <path d="M6 3v6a2 2 0 0 0 4 0V3M8 9v12" />
      <path d="M17 21V3c-2.2 0-3.5 2.8-3.5 6.5 0 2 1 3 3.5 3" />
    </>
  ),
  pulse: (
    <>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      <path d="M7 12h2.5l1.5-2.5 2 4 1.5-1.5H17" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 12h5M10 16h5" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7 8h10a4 4 0 0 1 4 4v2a3 3 0 0 1-5.4 1.8L14.5 14h-5l-1.1 1.8A3 3 0 0 1 3 14v-2a4 4 0 0 1 4-4z" />
      <path d="M8 11v3M6.5 12.5h3M16 11.5h.01M18 13h.01" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="10" cy="6.5" rx="6" ry="2.5" />
      <path d="M4 6.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4" />
      <path d="M4 10.5v4c0 1.4 2.7 2.5 6 2.5 1 0 2-.1 2.8-.3" />
      <circle cx="17" cy="16" r="4" />
    </>
  ),
  plane: <path d="M10.5 13.5 3 11l1.5-1.5 7 1 4.5-5c1-1 2.5-1.3 3-.8s.2 2-.8 3l-5 4.5 1 7L12.5 21z" />,
  gift: (
    <>
      <path d="M4 10h16v4H4zM5 14h14v7H5zM12 10v11" />
      <path d="M12 10c-1.5-3-5-3.5-5-1.5S10 10 12 10zm0 0c1.5-3 5-3.5 5-1.5S14 10 12 10z" />
    </>
  ),
  paw: (
    <>
      <circle cx="7" cy="10" r="1.6" />
      <circle cx="10.5" cy="6.5" r="1.6" />
      <circle cx="14.5" cy="6.5" r="1.6" />
      <circle cx="18" cy="10" r="1.6" />
      <path d="M12.5 12c-3 0-5.5 3.5-5.5 5.5 0 1.5 1.5 2 3 1.6 1.6-.4 3.4-.4 5 0 1.5.4 3-.1 3-1.6 0-2-2.5-5.5-5.5-5.5z" />
    </>
  ),
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z" />
      <path d="M4 20a2 2 0 0 0 2 2h13v-4" />
    </>
  ),
};

export function CategoryIcon({ icon, size = 14 }: { icon: CategoryIconKey; size?: number }) {
  return <Svg size={size}>{CATEGORY_PATHS[icon]}</Svg>;
}
