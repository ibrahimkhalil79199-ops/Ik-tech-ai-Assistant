
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outputDir = path.join(__dirname, "icons");

fs.mkdirSync(outputDir, { recursive: true });

function createSVG(maskable = false) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#07152d"/>
        <stop offset="100%" stop-color="#020611"/>
      </linearGradient>
      <linearGradient id="blue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#00eaff"/>
        <stop offset="100%" stop-color="#1264ff"/>
      </linearGradient>
    </defs>

    <rect width="512" height="512" fill="url(#bg)"/>

    <g transform="${maskable ? "translate(51.2 51.2) scale(0.8)" : ""}">
      <rect x="12" y="12" width="488" height="488" rx="100"
        fill="none" stroke="url(#blue)" stroke-width="10"/>

      <circle cx="256" cy="170" r="105"
        fill="#0b2446" stroke="url(#blue)" stroke-width="9"/>

      <rect x="176" y="112" width="160" height="112" rx="42"
        fill="#eaf7ff"/>

      <circle cx="220" cy="165" r="13" fill="#087cff"/>
      <circle cx="292" cy="165" r="13" fill="#087cff"/>

      <path d="M220 192 Q256 218 292 192"
        fill="none" stroke="#087cff" stroke-width="9"
        stroke-linecap="round"/>

      <text x="256" y="350" text-anchor="middle"
        font-family="Arial" font-size="132"
        font-weight="900" fill="white">IK</text>

      <text x="256" y="410" text-anchor="middle"
        font-family="Arial" font-size="43"
        font-weight="bold" fill="url(#blue)">TECH AI</text>
    </g>
  </svg>`;
}

async function generateIcons() {
  const normalSVG = createSVG(false);
  const maskableSVG = createSVG(true);

  fs.writeFileSync(path.join(outputDir, "icon.svg"), normalSVG);

  await sharp(Buffer.from(normalSVG))
    .resize(192, 192)
    .png()
    .toFile(path.join(outputDir, "icon-192.png"));

  await sharp(Buffer.from(normalSVG))
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, "icon-512.png"));

  await sharp(Buffer.from(maskableSVG))
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, "icon-512-maskable.png"));

  console.log("IK TECH AI icons created successfully!");
}

generateIcons().catch(error => {
  console.error("Icon generation failed:", error);
});
