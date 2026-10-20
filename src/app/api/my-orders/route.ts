import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const orderNumber = searchParams.get('orderNumber') || searchParams.get('order');

    if (!phone && !orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number or order number is required' },
        { status: 400 }
      );
    }

    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const cleanOrderNum = orderNumber ? orderNumber.trim() : '';
    const strippedOrderNum = cleanOrderNum.replace(/^#/, '');
    const withHashOrderNum = cleanOrderNum.startsWith('#') ? cleanOrderNum : `#${cleanOrderNum}`;

    // 1. Try Prisma / Supabase if DATABASE_URL is set
    if (process.env.DATABASE_URL && prisma) {
      try {
        const conditions: any[] = [];
        if (cleanPhone && cleanPhone.length >= 4) {
          conditions.push({ phone: { contains: cleanPhone.slice(-10) } });
        }
        if (cleanOrderNum) {
          conditions.push({ orderNumber: { equals: cleanOrderNum, mode: 'insensitive' } });
          conditions.push({ orderNumber: { equals: strippedOrderNum, mode: 'insensitive' } });
          conditions.push({ orderNumber: { equals: withHashOrderNum, mode: 'insensitive' } });
          conditions.push({ id: { equals: cleanOrderNum } });
          conditions.push({ id: { equals: strippedOrderNum } });
        }

        const dbOrders = await prisma.order.findMany({
          where: conditions.length > 0 ? { OR: conditions } : undefined,
          orderBy: { createdAt: 'desc' },
        });

        if (dbOrders.length > 0) {
          return NextResponse.json({ success: true, orders: dbOrders });
        }
      } catch (dbErr) {
        console.warn('Prisma query fallback notice:', dbErr);
      }
    }

    // 2. Fallback to local data/orders.json
    const ordersFilePath = path.join(process.cwd(), 'data', 'orders.json');
    let allOrders: any[] = [];
    try {
      if (fs.existsSync(ordersFilePath)) {
        const data = fs.readFileSync(ordersFilePath, 'utf-8');
        allOrders = JSON.parse(data);
      }
    } catch (parseErr) {
      allOrders = [];
    }

    if (Array.isArray(allOrders) && allOrders.length > 0) {
      const matched = allOrders.filter((o: any) => {
        if (cleanOrderNum) {
          const matchNum =
            (o.orderNumber && (
              o.orderNumber.toLowerCase() === cleanOrderNum.toLowerCase() ||
              o.orderNumber.toLowerCase() === strippedOrderNum.toLowerCase() ||
              o.orderNumber.toLowerCase() === withHashOrderNum.toLowerCase()
            )) ||
            (o.id && (o.id === cleanOrderNum || o.id === strippedOrderNum));
          if (matchNum) return true;
        }
        if (cleanPhone && cleanPhone.length >= 4) {
          const orderPhone = (o.phone || '').replace(/[^0-9]/g, '');
          if (
            orderPhone.includes(cleanPhone) ||
            cleanPhone.includes(orderPhone) ||
            (cleanPhone.length >= 10 && orderPhone.endsWith(cleanPhone.slice(-10)))
          ) {
            return true;
          }
        }
        return false;
      });

      return NextResponse.json({
        success: true,
        orders: matched.reverse(),
      });
    }

    return NextResponse.json({ success: true, orders: [] });
  } catch (error) {
    console.error('Error in my-orders API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order history' },
      { status: 500 }
    );
  }
}
