import { NextResponse } from "next/server"
import { calculateTipDistribution } from "@/lib/tip-calculator"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, amount, novelId, userId } = body

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Calculate tip distribution
    const distribution = calculateTipDistribution(amount)

    // Create mock tip record
    const tip = {
      id: Date.now().toString(),
      username,
      amount,
      novelId,
      userId,
      date: new Date(),
    }

    // In a real app, this would update the database
    // For now, we'll just return success

    return NextResponse.json({
      tip,
      distribution,
      message: "Tip processed successfully",
    })
  } catch (error) {
    console.error("Error processing tip:", error)
    return NextResponse.json({ error: "Failed to process tip" }, { status: 500 })
  }
}
