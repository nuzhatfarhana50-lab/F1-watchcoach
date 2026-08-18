import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/auth/configuration";

const configuredMiddleware = isClerkConfigured() ? clerkMiddleware() : null;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return configuredMiddleware ? configuredMiddleware(request, event) : NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)|.well-known/workflow).*)",
    "/(api|trpc)(.*)",
  ],
};
