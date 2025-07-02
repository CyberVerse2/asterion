import { Suspense } from "react"
import { mockNovels } from "@/lib/mock-data"
import LoadingSkeleton from "@/components/loading-skeleton"
import NovelGrid from "@/components/novel-grid"

function getPopularNovels() {
  return mockNovels.sort((a, b) => b.totalTips - a.totalTips)
}

export default function HomePage() {
  const novels = getPopularNovels()

  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSkeleton />}>
          <NovelGrid novels={novels} />
        </Suspense>
      </section>
    </div>
  )
}
