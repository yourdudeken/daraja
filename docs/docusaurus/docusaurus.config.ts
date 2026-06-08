import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "M-Pesa SDK",
  tagline: "Production-grade SDK ecosystem for Safaricom M-Pesa Daraja API",
  favicon: "img/favicon.ico",
  url: "https://yourdudeken.github.io",
  baseUrl: "/mpesa-sdk/",
  organizationName: "yourdudeken",
  projectName: "mpesa-sdk",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/yourdudeken/mpesa-sdk/edit/main/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: "M-Pesa SDK",
      items: [
        { type: "docSidebar", sidebarId: "docsSidebar", position: "left", label: "Docs" },
        { href: "https://github.com/yourdudeken/mpesa-sdk", label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Getting Started", to: "/docs/intro" },
            { label: "TypeScript SDK", to: "/docs/typescript" },
            { label: "Python SDK", to: "/docs/python" },
            { label: "Go SDK", to: "/docs/go" },
          ],
        },
        {
          title: "Community",
          items: [
            { label: "GitHub", href: "https://github.com/yourdudeken/mpesa-sdk" },
            { label: "Issues", href: "https://github.com/yourdudeken/mpesa-sdk/issues" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} M-Pesa SDK. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["typescript", "python", "go", "bash", "json"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
