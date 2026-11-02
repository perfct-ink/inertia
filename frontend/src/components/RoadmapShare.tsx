import { Link2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useCreateRoadmapShare, useDeleteRoadmapShare, useRoadmapShare } from '@/api/roadmapShare'
import { sharedRoadmapUrl } from '@/data/share'

// Makes, shows and revokes the Space's public read-only roadmap link.
export default function RoadmapShare() {
  const { data: share } = useRoadmapShare()
  const create = useCreateRoadmapShare()
  const revoke = useDeleteRoadmapShare()

  if (!share) {
    return (
      <Button onClick={() => create.mutate()} disabled={create.isPending}>
        <Link2 aria-hidden="true" /> Share read-only link
      </Button>
    )
  }
  return (
    <div role="group" aria-label="Public roadmap link">
      <Input
        readOnly
        aria-label="Public roadmap link"
        value={sharedRoadmapUrl(window.location.origin, share.token)}
        onFocus={(e) => e.currentTarget.select()}
      />
      <Button onClick={() => revoke.mutate()} disabled={revoke.isPending}>Stop sharing</Button>
    </div>
  )
}
