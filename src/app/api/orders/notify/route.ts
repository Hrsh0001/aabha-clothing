import { NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '../../../../lib/auth-guard';
import { sendEmail, generateDispatchNoticeHtml } from '../../../../lib/email';
import type { CODOrder } from '../route';

// POST /api/orders/notify — Admin dispatches client email notification
export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin privileges required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { order } = body;

    if (!order || !order.customerName) {
      return NextResponse.json(
        { success: false, error: 'Order details required for dispatch notification' },
        { status: 400 }
      );
    }

    if (order.email) {
      const result = await sendEmail({
        to: order.email,
        subject: `Your AABHA CLOTHING Order #${order.orderNumber} is Dispatched & Out for Delivery`,
        html: generateDispatchNoticeHtml({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          phone: order.phone,
          city: order.city,
          total: order.total,
          riderNavUrl: order.mapUrl,
        }),
      });

      return NextResponse.json({
        success: true,
        sentTo: order.email,
        message: `Dispatch email successfully sent to ${order.email}!`,
        result,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Notification simulated for customer phone ${order.phone} (no email specified).`,
    });
  } catch (error: any) {
    console.error('Dispatch notification error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
