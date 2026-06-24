import { SessionData } from "./types";

export const sessionOptions = {
  password: process.env.AUTH_SECRET as string,
  cookieName: "discogs-viewer-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 8, // Expire session after 8 hours of inactivity
  },
};

export type { SessionData };

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error(
    "AUTH_SECRET environment variable is not set or is too short (must be at least 32 characters).",
  );
}
