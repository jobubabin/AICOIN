/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ecole-eft-france.fr" },
      { protocol: "https", hostname: "www.ecole-eft-france.fr" },
    ],
  },
};

module.exports = nextConfig;

