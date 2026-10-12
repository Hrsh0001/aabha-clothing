import { NextResponse } from 'next/server';
import { getUploadedImage } from '../../../../lib/image-store';

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

    return new NextResponse(new Uint8Array(img.buffer), {
      status: 200,
      headers: {
        'Content-Type': img.mimeType,
        'Content-Length': String(img.buffer.length),
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
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
