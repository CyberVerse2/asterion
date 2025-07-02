import NovelCard from "@/components/novel-card"

interface NovelGridProps {
  novels: any[]
}

export default function NovelGrid({ novels }: NovelGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {novels.map((novel) => (
        <NovelCard key={novel.id} novel={novel} />
      ))}
    </div>
  )
}
