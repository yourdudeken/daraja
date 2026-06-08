// app/api/mpesa/stkpush/route.ts (Next.js App Router)
import { NextRequest, NextResponse } from "next/server";
import { Mpesa } from "@yourdudeken/mpesa-sdk";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: process.env.MPESA_ENV === "production" ? "production" : "sandbox",
  passkey: process.env.MPESA_PASSKEY!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await mpesa.stkPush.initiate({
      BusinessShortCode: parseInt(process.env.MPESA_SHORTCODE!),
      TransactionType: "CustomerPayBillOnline",
      Amount: body.amount,
      PartyA: body.phoneNumber,
      PartyB: parseInt(process.env.MPESA_SHORTCODE!),
      PhoneNumber: body.phoneNumber,
      CallBackURL: `${process.env.BASE_URL}/api/mpesa/callback`,
      AccountReference: body.reference || "NX-API",
      TransactionDesc: body.description || "Payment",
      Password: "",
      Timestamp: "",
    });

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 400 }
    );
  }
}
