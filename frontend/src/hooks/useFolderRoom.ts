import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { useAuthStore } from '@/store/auth'
import { FOLDER_CHANGED, otherPeople, presenceField, type RoomPerson } from '@/data/presence'

// The live room of a folder (`folder-<id>` on the collab server): who else has
// the folder open, and a "changed" ping both ways. The server lets someone in
// only when the API would let them read the folder, so an invited person and a
// Space member land in the same room. It holds no content.
//
// Sends the ping after any change this person saves while the page is open
// (every successful mutation), and refetches what the folder page shows when
// somebody else's ping arrives. `enabled` is false for a folder only one
// person can reach, which has nobody to meet. A room that can't connect just
// shows nobody; the page works as before.
export function useFolderRoom(folderId: number, enabled: boolean): RoomPerson[] {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const userName = useAuthStore((s) => s.user?.name)
  const [people, setPeople] = useState<RoomPerson[]>([])

  useEffect(() => {
    if (!enabled || !folderId || userId == null) return
    const provider = new HocuspocusProvider({
      url: process.env.COLLAB_URL ?? 'ws://localhost:1234',
      name: `folder-${folderId}`,
      document: new Y.Doc(),
      token: () => useAuthStore.getState().token ?? '',
    })
    provider.setAwarenessField('user', presenceField({ id: userId, name: userName ?? 'Someone' }))
    const awareness = provider.awareness
    const refreshPeople = () => setPeople(otherPeople(awareness?.getStates().values() ?? [], userId))
    awareness?.on('change', refreshPeople)
    refreshPeople()

    provider.on('stateless', ({ payload }: { payload: string }) => {
      if (payload !== FOLDER_CHANGED) return
      qc.invalidateQueries({ queryKey: ['folder-contents', folderId] })
      qc.invalidateQueries({ queryKey: ['workspace'] })
      qc.invalidateQueries({ queryKey: ['shared-folders'] })
    })
    const stopWatching = qc.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return
      try {
        provider.sendStateless(FOLDER_CHANGED)
      } catch {
        // Not connected (yet): the others pick the change up on their next refetch.
      }
    })

    return () => {
      stopWatching()
      awareness?.off('change', refreshPeople)
      provider.destroy()
      setPeople([])
    }
  }, [qc, folderId, enabled, userId, userName])

  return people
}
