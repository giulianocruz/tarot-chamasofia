import { getCard } from "@/lib/tarot";

export const dynamic = "force-static";

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[char] || char));
}

const SUIT_GLYPH: Record<string, string> = {
  Paus: "✦",
  Copas: "♡",
  Espadas: "◇",
  Ouros: "◈",
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const card = getCard(id);
  if (!card || card.arcana !== "minor") return new Response("Carta não encontrada", { status: 404 });

  const suit = "suit" in card ? String(card.suit) : "";
  const glyph = SUIT_GLYPH[suit] || card.symbol || "✦";
  const name = esc(card.name);
  const keywords = esc(card.keywords.slice(0, 2).join(" · "));
  const repeated = Array.from({ length: Math.max(1, Math.min(card.number, 10)) }, (_, index) => {
    const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(Math.min(card.number, 10)))));
    const row = Math.floor(index / cols);
    const col = index % cols;
    const spacingX = 116 / Math.max(1, cols - 1);
    const x = cols === 1 ? 210 : 152 + col * spacingX;
    const rows = Math.ceil(Math.min(card.number, 10) / cols);
    const spacingY = 150 / Math.max(1, rows - 1);
    const y = rows === 1 ? 300 : 225 + row * spacingY;
    return `<text x="${x}" y="${y}" class="pip">${glyph}</text>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="660" viewBox="0 0 420 660">
    <defs>
      <radialGradient id="bg" cx="50%" cy="35%" r="75%">
        <stop offset="0" stop-color="#2a1743"/>
        <stop offset=".52" stop-color="#100d21"/>
        <stop offset="1" stop-color="#050712"/>
      </radialGradient>
      <linearGradient id="gold" x1="0" x2="1">
        <stop offset="0" stop-color="#8b6427"/>
        <stop offset=".45" stop-color="#f2ce7b"/>
        <stop offset="1" stop-color="#9f7330"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <style>
        .serif{font-family:Georgia,'Times New Roman',serif}.small{font-family:Arial,sans-serif;letter-spacing:2px}
        .pip{font-family:Georgia,serif;font-size:34px;text-anchor:middle;fill:#e8c26d;filter:url(#glow)}
      </style>
    </defs>
    <rect width="420" height="660" rx="28" fill="url(#bg)"/>
    <rect x="13" y="13" width="394" height="634" rx="22" fill="none" stroke="url(#gold)" stroke-width="3"/>
    <rect x="25" y="25" width="370" height="610" rx="18" fill="none" stroke="#8d6b35" stroke-width="1" opacity=".7"/>
    <circle cx="210" cy="300" r="132" fill="none" stroke="#b38a45" stroke-width="1" opacity=".45"/>
    <circle cx="210" cy="300" r="104" fill="none" stroke="#72598f" stroke-width="1" opacity=".55"/>
    <path d="M210 155 L332 371 L88 371 Z" fill="none" stroke="#b38a45" stroke-width="1" opacity=".38"/>
    <path d="M100 300 H320 M210 190 V410" stroke="#7f6893" stroke-width="1" opacity=".3"/>
    <text x="54" y="72" class="serif" font-size="28" fill="#e8c26d">${card.number}</text>
    <text x="366" y="72" text-anchor="end" class="serif" font-size="28" fill="#e8c26d">${glyph}</text>
    ${repeated}
    <circle cx="210" cy="300" r="49" fill="#0b0a18" stroke="#e1b960" stroke-width="2" opacity=".96"/>
    <text x="210" y="316" text-anchor="middle" class="serif" font-size="58" fill="#f3d890" filter="url(#glow)">${glyph}</text>
    <line x1="70" y1="466" x2="350" y2="466" stroke="#a27a38" opacity=".65"/>
    <text x="210" y="515" text-anchor="middle" class="serif" font-size="27" fill="#f4dfac">${name}</text>
    <text x="210" y="550" text-anchor="middle" class="small" font-size="10" fill="#b9a8c6">${keywords}</text>
    <text x="210" y="603" text-anchor="middle" class="small" font-size="9" fill="#d1ab58">CHAMA SOFIA · TAROT</text>
    <circle cx="58" cy="602" r="3" fill="#d1ab58"/><circle cx="362" cy="602" r="3" fill="#d1ab58"/>
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
