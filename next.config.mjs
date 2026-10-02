/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Product photos come straight from Shopify's CDN; nothing else may be optimised through /_next/image.
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com", pathname: "/**" }],
    formats: ["image/avif", "image/webp"],
  },
};
export default nextConfig;
