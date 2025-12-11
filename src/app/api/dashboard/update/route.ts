import { NextResponse } from 'next/server';

// This API route will be called by cron job daily at 8am (Mon-Fri)
export async function POST(request: Request) {
  try {
    // Check if it's a weekday (Monday-Friday)
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    if (day === 0 || day === 6) {
      return NextResponse.json({
        success: false,
        message: 'Dashboard update skipped (weekend)',
        timestamp: now.toISOString(),
      });
    }

    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch latest data from database
    // In real app, this would query your database
    const stats = await fetchDashboardStats();

    // Update cache or static data
    // You can use Redis, file system, or database
    await updateDashboardCache(stats);

    return NextResponse.json({
      success: true,
      message: 'Dashboard updated successfully',
      timestamp: now.toISOString(),
      stats,
    });
  } catch (error) {
    console.error('Dashboard update error:', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard' },
      { status: 500 }
    );
  }
}

async function fetchDashboardStats() {
  // Mock implementation
  // In real app, query your database here
  return {
    total: 150,
    baharu: 80,
    pembaharuan: 60,
    tidakRenew: 10,
    byStatus: {
      pending: 20,
      approved: 100,
      rejected: 30,
    },
    lastUpdated: new Date().toISOString(),
  };
}

async function updateDashboardCache(stats: any) {
  // Mock implementation
  // In real app, update your cache here (Redis, file, etc.)
  console.log('Dashboard cache updated:', stats);
  return true;
}

// GET endpoint for manual trigger (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to update dashboard',
    schedule: 'Daily at 8:00 AM (Monday-Friday)',
    cronExpression: '0 8 * * 1-5',
  });
}
