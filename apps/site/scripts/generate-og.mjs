import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/og.png");

const INTER_REGULAR =
  "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf";
const FRAUNCES_EXTRABOLD =
  "https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58njr1a03gg7S2nfgRYIcNxyjDg.ttf";

async function loadFont(url) {
  const res = await fetch(url);
  return res.arrayBuffer();
}

// Abstract helix mark — two flowing crescents spiraling around each other
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M32 4 A28 28 0 0 1 60 32 A14 14 0 0 1 32 32 Z" fill="#171717"/>
  <path d="M32 60 A28 28 0 0 1 4 32 A14 14 0 0 1 32 32 Z" fill="#171717"/>
</svg>`;
const logoDataUri = `data:image/svg+xml,${encodeURIComponent(logoSvg)}`;

async function main() {
  const [interData, frauncesData] = await Promise.all([
    loadFont(INTER_REGULAR),
    loadFont(FRAUNCES_EXTRABOLD),
  ]);

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          fontFamily: "Inter",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginBottom: -4,
              },
              children: [
                {
                  type: "img",
                  props: {
                    src: logoDataUri,
                    width: 72,
                    height: 72,
                    style: {},
                  },
                },
                {
                  type: "p",
                  props: {
                    style: {
                      fontSize: 80,
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                      color: "#171717",
                      fontFamily: "Fraunces",
                    },
                    children: "Kellix",
                  },
                },
              ],
            },
          },
          {
            type: "p",
            props: {
              style: {
                fontSize: 26,
                color: "#A3A3A3",
              },
              children: "An assistant for your everyday.",
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: interData, weight: 400, style: "normal" },
        { name: "Inter", data: interData, weight: 600, style: "normal" },
        { name: "Fraunces", data: frauncesData, weight: 800, style: "normal" },
      ],
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  const png = resvg.render().asPng();

  writeFileSync(OUT, png);
  console.log(`og.png written to ${OUT} (${png.length} bytes)`);
}

main();
