import { NextResponse } from "next/server"
import { mockNovels } from "@/lib/mock-data"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    const novel = mockNovels.find((n) => n.id === params.id)

    if (!novel) {
      return NextResponse.json({ error: "Novel not found" }, { status: 404 })
    }

    return NextResponse.json(novel)
  } catch (error) {
    console.error("Error fetching novel:", error)
    return NextResponse.json({ error: "Failed to fetch novel" }, { status: 500 })
  }
}
