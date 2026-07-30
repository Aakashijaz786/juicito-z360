/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allows an isolated build dir (e.g. NEXT_DIST_DIR=.next-verify) so a
  // verification build doesn't clobber a running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
