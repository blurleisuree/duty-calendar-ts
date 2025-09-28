import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // request типизирован: можно использовать request.nextUrl.pathname, request.cookies и т.д.
  // ...логика...
  return NextResponse.next();
}
