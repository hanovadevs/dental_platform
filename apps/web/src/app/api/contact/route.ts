import { NextResponse } from 'next/server';
import { z } from 'zod';

const contactSubmissionSchema = z.object({
  clinicName: z.string().min(2, 'Clinic name must be at least 2 characters'),
  contactName: z.string().min(2, 'Contact name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(7, 'Please enter a valid phone number'),
  location: z.string().min(2, 'Please specify your city or country'),
  clinicSize: z.string().min(1, 'Please specify your clinic size or number of chairs'),
  message: z.string().min(5, 'Message must be at least 5 characters'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = contactSubmissionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { clinicName, contactName, email, phone, location, clinicSize, message } = result.data;

    // Log the inquiry securely in production telemetry
    console.log('[Clinic Inquiry Received]', {
      timestamp: new Date().toISOString(),
      clinicName,
      contactName,
      email,
      phone,
      location,
      clinicSize,
      messagePreview: message.slice(0, 100),
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your interest. A dental practice specialist will reach out within 24 hours.',
    });
  } catch (err: any) {
    console.error('[Contact API Error]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error. Please try again or email us directly.' },
      { status: 500 }
    );
  }
}
