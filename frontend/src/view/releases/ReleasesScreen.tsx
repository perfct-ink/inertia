import { useState } from 'react'
import { Disc3, Loader2, Plus, X } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import {
  useAddReleaseDocument, useCreateRelease, useDeleteRelease, useReleases, useReleaseTasks,
  useRemoveReleaseDocument, useUpdateRelease,
} from '@/api/releases'
import { useWorkspace } from '@/api/workspace'
import { RELEASE_KINDS, songCandidates, sortReleases } from '@/data/release'
import { donePercent } from '@/data/schedule'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Document, Release, ReleaseKind } from '@/types'
import '../planning/PlanningScreen.scss'

// Releases (single, EP, album, music video): a date, the song documents in it
// (a song can be in several releases), and every task from those documents.
export default function ReleasesScreen() {
  usePageTitle('Releases')
  const { data: releases = [], isLoading } = useReleases()
  const { data: workspace } = useWorkspace()
  const createRelease = useCreateRelease()
  const [title, setTitle] = useState('')
  const songs = songCandidates(workspace?.folders ?? [])

  function add() {
    const value = title.trim()
    if (!value) return
    createRelease.mutate({ title: value }, { onSuccess: () => setTitle('') })
  }

  return (
    <WorkspaceLayout>
      <div className="view-planning view-releases">
        <div className="planning-header">
          <h1 className="planning-title">Releases</h1>
        </div>
        <div className="planning-body">
          <div className="planning-list">
            <div className="planning-new_card">
              <Input
                aria-label="New release"
                placeholder="New release, e.g. Debut EP"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') add() }}
              />
              <Button variant="primary" onClick={add} disabled={!title.trim() || createRelease.isPending}>
                <Plus className="planning-icon" aria-hidden="true" /> Add release
              </Button>
            </div>

            {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}

            {!isLoading && releases.length === 0 && (
              <div className="planning-empty">
                <Disc3 className="planning-empty_icon" aria-hidden="true" />
                <p>No releases yet. A release is a single, EP, album or video with a date, the songs in it, and their tasks.</p>
              </div>
            )}

            {sortReleases(releases).map((release) => <ReleaseCard key={release.id} release={release} songs={songs} />)}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}

function ReleaseCard({ release, songs }: { release: Release; songs: Document[] }) {
  const update = useUpdateRelease()
  const remove = useDeleteRelease()
  const addSong = useAddReleaseDocument()
  const removeSong = useRemoveReleaseDocument()
  const [showTasks, setShowTasks] = useState(false)
  const { data: tasks = [] } = useReleaseTasks(release.id, showTasks)
  const inRelease = songs.filter((s) => release.document_ids.includes(s.id))
  const available = songs.filter((s) => !release.document_ids.includes(s.id))

  return (
    <article className="planning-card" aria-label={release.title}>
      <div className="planning-card-top">
        <h2 className="planning-card-title">{release.title}</h2>
        <Button className="planning-card-delete" aria-label={`Delete ${release.title}`} onClick={() => remove.mutate(release.id)}>
          <X className="planning-delete_icon" aria-hidden="true" />
        </Button>
      </div>
      <div className="planning-card-dates">
        <Select aria-label="Kind" value={release.kind} onChange={(e) => update.mutate({ id: release.id, kind: e.target.value as ReleaseKind })}>
          {RELEASE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </Select>
        <Input
          type="date"
          aria-label="Release date"
          value={release.release_date ?? ''}
          onChange={(e) => update.mutate({ id: release.id, release_date: e.target.value || null })}
        />
      </div>
      <ProgressBar percent={donePercent(release)} />
      <p className="planning-description">{release.done_tasks_count}/{release.tasks_count} tasks done</p>

      <ul>
        {inRelease.map((song) => (
          <li key={song.id}>
            {song.title}
            <Button aria-label={`Remove ${song.title} from ${release.title}`} onClick={() => removeSong.mutate({ id: release.id, documentId: song.id })}>
              <X className="planning-delete_icon" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      <Select
        aria-label={`Add a song to ${release.title}`}
        value=""
        onChange={(e) => e.target.value && addSong.mutate({ id: release.id, documentId: Number(e.target.value) })}
      >
        <option value="">Add a song…</option>
        {available.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
      </Select>

      <Button onClick={() => setShowTasks((v) => !v)} aria-expanded={showTasks}>{showTasks ? 'Hide tasks' : 'Show tasks'}</Button>
      {showTasks && (
        <ul>
          {tasks.length === 0 && <li>No tasks in these songs yet.</li>}
          {tasks.map((t) => <li key={t.id}>{t.title} <span className="planning-date">{t.status.replace('_', ' ')}{t.document ? ` · ${t.document.title}` : ''}</span></li>)}
        </ul>
      )}
    </article>
  )
}
