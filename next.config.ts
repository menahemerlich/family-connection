import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  typedRoutes: true,
  /** מדכא אזהרה כשיש package-lock נוסף מחוץ לפרויקט (למשל ב־User) */
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default withNextIntl(nextConfig);
