import { NextResponse } from "next/server"
import { mockNovels } from "@/lib/mock-data"

export async function GET() {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    const novels = mockNovels.map((novel) => ({
      ...novel,
      _count: {
        tips: novel.tips.length,
      },
    }))

    return NextResponse.json(novels)
  } catch (error) {
    console.error("Error fetching novels:", error)
    return NextResponse.json({ error: "Failed to fetch novels" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, author, description, coverImage, chapters } = body

    const newNovel = {
      id: Date.now().toString(),
      title,
      author,
      description,
      coverImage,
      totalTips: 0,
      tipCount: 0,
      loves: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      chapters: chapters.map((chapter: any, index: number) => ({
        id: `ch_${Date.now()}_${index}`,
        title: chapter.title,
        content: chapter.content,
        order: index + 1,
        loves: 0,
        novelId: Date.now().toString(),
      })),
      tips: [],
    }

    return NextResponse.json(newNovel)
  } catch (error) {
    console.error("Error creating novel:", error)
    return NextResponse.json({ error: "Failed to create novel" }, { status: 500 })
  }
}
