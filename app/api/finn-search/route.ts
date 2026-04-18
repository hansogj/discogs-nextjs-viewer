import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ count: null }, { status: 400 });
  }

  const finnUrl = `https://www.finn.no/recommerce/forsale/search?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(finnUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ count: null });
    }

    const html = await res.text();

    // Try meta description: "Du finner X annonse(r)..."
    const metaMatch = html.match(
      /Du finner (\d+) annonse/,
    );
    if (metaMatch) {
      return NextResponse.json({ count: parseInt(metaMatch[1], 10) });
    }

    // Fallback: count itemListElement in JSON-LD
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        const items = data?.mainEntity?.itemListElement;
        if (Array.isArray(items)) {
          return NextResponse.json({ count: items.length });
        }
      } catch {
        // JSON parse failed, fall through
      }
    }

    return NextResponse.json({ count: null });
  } catch {
    return NextResponse.json({ count: null });
  }
}
