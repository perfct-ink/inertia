import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Button, FormError, Input, Modal, Select } from '@/components/ui'
import { useAgentTokens, useCreateAgentToken, useRevokeAgentToken } from '@/api/agentTokens'
import { useWorkspace } from '@/api/workspace'
import { errorMessage } from '@/util/errorMessage'
import { agentScope, claudeCodeCommand, sortTokens } from '@/data/agentAccess'
import { flattenFolders } from '@/data/folder'
import type { NewAgentToken } from '@/types'

// Owners and admins let outside agents (Claude, Claude Code...) read and edit the
// Space: make a token, copy it once, and revoke it when done. Changes an agent
// makes are logged against its token.
export function AgentAccess({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: workspace } = useWorkspace()
  const { data: tokens = [] } = useAgentTokens(open)
  const create = useCreateAgentToken()
  const revoke = useRevokeAgentToken()
  const [name, setName] = useState('')
  const [permission, setPermission] = useState<'read' | 'write'>('read')
  const [folderId, setFolderId] = useState('')
  const [created, setCreated] = useState<NewAgentToken | null>(null)
  const [error, setError] = useState<string | null>(null)
  const folders = flattenFolders(workspace?.folders ?? []).filter((f) => !f.archived && !f.root)
  const folderName = (id: number | null) => folders.find((f) => f.id === id)?.name

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    setError(null)
    create.mutate(
      { name: trimmed, permission, ...(folderId ? { folder_id: Number(folderId) } : {}) },
      { onSuccess: (token) => { setCreated(token); setName('') }, onError: (e) => setError(errorMessage(e)) },
    )
  }

  return (
    <Modal open={open} title="Agent access" description="Let Claude or another agent read and edit this space. Each token reaches only this space (or one folder), and can be revoked." onClose={() => { setCreated(null); onClose() }}>
      {created && (
        <div role="status" className="agent_access-created">
          <p><strong>Copy this token now.</strong> It won&rsquo;t be shown again.</p>
          <Input readOnly aria-label="New agent token" value={created.token} onFocus={(e) => e.currentTarget.select()} />
          <p>MCP server URL: <code>{created.mcp_url}</code></p>
          <p>Claude Code:</p>
          <Input readOnly aria-label="Claude Code command" value={claudeCodeCommand(created.mcp_url, created.token)} onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}
      <ul>
        {sortTokens(tokens).map((t) => (
          <li key={t.id}>
            <strong>{t.name}</strong> · {agentScope(t, folderName(t.folder_id))} · {t.token_prefix}…
            {t.last_used_at ? ` · last used ${format(parseISO(t.last_used_at), 'MMM d, h:mm a')}` : ' · never used'}
            {t.revoked_at ? ' · revoked' : (
              <Button aria-label={`Revoke ${t.name}`} onClick={() => revoke.mutate(t.id, { onError: (e) => setError(errorMessage(e)) })}>Revoke</Button>
            )}
          </li>
        ))}
        {tokens.length === 0 && <li>No agent tokens yet.</li>}
      </ul>
      <Input aria-label="Agent name" placeholder="Name, e.g. Claude Code" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
      <Select aria-label="Agent permission" value={permission} onChange={(e) => setPermission(e.target.value as 'read' | 'write')}>
        <option value="read">Read only</option>
        <option value="write">Read and write</option>
      </Select>
      <Select aria-label="Limit to a folder" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
        <option value="">Whole space</option>
        {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </Select>
      <Button variant="primary" disabled={!name.trim() || create.isPending} onClick={submit}>Create token</Button>
      <FormError message={error} />
    </Modal>
  )
}
