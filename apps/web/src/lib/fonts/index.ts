import localFont from "next/font/local";

export const styleFont = localFont({
  src: "../../../public/fonts/Geom.ttf",
});

export const mainItalicFont = localFont({
  src: "../../../public/fonts/Geom-Italic.ttf",
});

const mainFont = localFont({
  src: "../../../public/fonts/NataSans.ttf",
});

export default mainFont;
