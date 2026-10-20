import { NextResponse } from 'next/server';
import { getUploadedImage } from '../../../../lib/image-store';

const CACHE_CONTROL_HEADER =
  'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Image ID is required' },
        { status: 400 }
      );
    }

    const img = await getUploadedImage(id);
    if (!img) {
      return NextResponse.json(
        { success: false, error: `Image "${id}" not found` },
        { status: 404 }
      );
    }

    const ifNoneMatch = request.headers.get('if-none-match');
    if (
      ifNoneMatch &&
      (ifNoneMatch === '*' ||
        ifNoneMatch === img.etag ||
        ifNoneMatch.includes(img.etag) ||
        ifNoneMatch.replace(/^W\//, '') === img.etag ||
        ifNoneMatch.replace(/"/g, '') === img.etag.replace(/"/g, ''))
    ) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: img.etag,
          'Cache-Control': CACHE_CONTROL_HEADER,
        },
      });
    }

    return new NextResponse(new Uint8Array(img.buffer), {
      status: 200,
      headers: {
        'Content-Type': img.mimeType,
        'Content-Length': String(img.buffer.length),
        ETag: img.etag,
        'Cache-Control': CACHE_CONTROL_HEADER,
      },
    });
  } catch (err) {
    console.warn('GET /api/images/[id] notice:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve image' },
      { status: 500 }
    );
  }
}
