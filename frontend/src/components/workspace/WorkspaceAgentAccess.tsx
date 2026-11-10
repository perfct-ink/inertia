import { useState, type FormEvent } from 'react'
import { Button, ConfirmDialog, FormError, Input, Modal, Select, Textarea, classNames } from '@/components/ui'
import { useAgentActivities, useAgentTokens, useCreateAgentToken, useRevokeAgentToken } from '@/api/agentTokens'
import {
  AGENT_NAME_MAX_LENGTH, AGENT_PERMISSIONS, activityTime, isRevoked, lastUsedLabel, permissionLabel, revokedLabel, scopeLabel,
  sortActivities, sortTokens, validTokenName, type AgentPermission, type AgentToken, type NewAgentToken,
} from '@/data/agentToken'
import { claudeCodeCommand } from '@/data/agentHandoff'
import { flattenFolders, folderChoices } from '@/data/folder'
import { errorMessage } from '@/util/errorMessage'
import type { Workspace } from '@/types'
import './WorkspaceAgentAccess.scss'

// A copy field for something shown once: the text, selectable, and a button.
function CopyField({ label, value, multiline, onFailed }: { label: string; value: string; multiline?: boolean; onFailed: (message: string) => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch (e) {
      onFailed(errorMessage(e))
    }
  }

  return (
    <div className="workspace_agent_access-copy">
      {multiline
        ? <Textarea readOnly aria-label={label} rows={3} value={value} onFocus={(e) => e.currentTarget.select()} />
        : <Input readOnly aria-label={label} value={value} onFocus={(e) => e.currentTarget.select()} />}
      <Button type="button" variant="secondary" aria-label={`Copy ${label.toLowerCase()}`} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
    </div>
  )
}

// A token as made: shown once, with the MCP URL and the Claude Code command.
function NewTokenNotice({ made, onDone }: { made: NewAgentToken; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  return (
    <div role="status" className="workspace_agent_access-made">
      <p><strong>Copy this token now.</strong> It cannot be shown again; if you lose it, revoke it and make another.</p>
      <CopyField label="Token" value={made.token} onFailed={setError} />
      <CopyField label="MCP URL" value={made.mcp_url} onFailed={setError} />
      <CopyField label="Claude Code command" value={claudeCodeCommand(made.mcp_url, made.token)} multiline onFailed={setError} />
      <FormError message={error} />
      <Button type="button" variant="primary" onClick={onDone}>Done</Button>
    </div>
  )
}

function TokenRow({ token, scope, onRevoke, onActivity }: { token: AgentToken; scope: string; onRevoke: () => void; onActivity: () => void }) {
  const revoked = isRevoked(token)
  return (
    <li className={classNames('workspace_agent_access-token', revoked && 'workspace_agent_access-token--revoked')}>
      <div className="workspace_agent_access-who">
        <p className="workspace_agent_access-name">{token.name}</p>
        <p className="workspace_agent_access-meta">
          {permissionLabel(token.permission)} · {scope} · {token.token_prefix}…
        </p>
        <p className="workspace_agent_access-meta">
          Made by {token.created_by_name ?? 'someone who has left'} · {revoked ? revokedLabel(token) : lastUsedLabel(token)}
        </p>
      </div>
      <div className="workspace_agent_access-actions">
        <Button type="button" variant="ghost" className="workspace_agent_access-touch" aria-label={`Show activity of ${token.name}`} onClick={onActivity}>Activity</Button>
        {!revoked && (
          <Button type="button" variant="ghost" className="workspace_agent_access-touch" aria-label={`Revoke ${token.name}`} onClick={onRevoke}>Revoke</Button>
        )}
      </div>
    </li>
  )
}

// "Agent access" in the Space menu, for owners: make an agent token (shown once),
// see every token with what it reaches and when it was last used, revoke one, and
// read what agents changed. The server refuses everyone but owners, so the menu
// shows it to owners only. Failed calls show an error.
export function WorkspaceAgentAccess({ workspace, open, onClose }: { workspace: Workspace; open: boolean; onClose: () => void }) {
  const { data: tokens = [] } = useAgentTokens(open)
  const [activityOf, setActivityOf] = useState<number | null>(null)
  const { data: activities = [] } = useAgentActivities(activityOf, open)
  const create = useCreateAgentToken()
  const revoke = useRevokeAgentToken()
  const [name, setName] = useState('')
  const [permission, setPermission] = useState<AgentPermission>('write')
  const [folderId, setFolderId] = useState<number | null>(null)
  const [made, setMade] = useState<NewAgentToken | null>(null)
  const [revoking, setRevoking] = useState<AgentToken | null>(null)
  const [error, setError] = useState<string | null>(null)
  const folders = folderChoices(flattenFolders(workspace.folders ?? []))

  function submit(e: FormEvent) {
    e.preventDefault()
    const clean = validTokenName(name)
    if (!clean) return setError('Give the token a name.')
    setError(null)
    create.mutate(
      { name: clean, permission, folder_id: folderId },
      { onSuccess: (token) => { setMade(token); setName('') }, onError: (err) => setError(errorMessage(err)) },
    )
  }

  function close() {
    setMade(null)
    setError(null)
    onClose()
  }

  return (
    <Modal open={open} title={`Agent access in ${workspace.name}`} description="Let Claude Code or another agent read and change this Space through its MCP server. Every change it makes is recorded as the agent's." onClose={close} className="workspace_agent_access">
      {made ? (
        <NewTokenNotice made={made} onDone={() => setMade(null)} />
      ) : (
        <form onSubmit={submit} className="workspace_agent_access-form">
          <Input aria-label="Token name" placeholder="e.g. Claude Code on my laptop" maxLength={AGENT_NAME_MAX_LENGTH} value={name} onChange={(e) => setName(e.target.value)} />
          <Select aria-label="Permission" value={permission} onChange={(e) => setPermission(e.target.value as AgentPermission)}>
            {AGENT_PERMISSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <Select aria-label="Limited to" value={folderId ?? ''} onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Whole Space</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </Select>
          <Button type="submit" variant="primary" disabled={create.isPending}>New token</Button>
          <FormError message={error} />
        </form>
      )}

      <h3 className="workspace_agent_access-heading">Tokens</h3>
      {tokens.length === 0 ? (
        <p className="workspace_agent_access-empty">No agent tokens yet.</p>
      ) : (
        <ul aria-label="Agent tokens" className="workspace_agent_access-list">
          {sortTokens(tokens).map((token) => (
            <TokenRow key={token.id} token={token} scope={scopeLabel(token, folders)} onRevoke={() => setRevoking(token)} onActivity={() => setActivityOf(token.id)} />
          ))}
        </ul>
      )}

      <h3 className="workspace_agent_access-heading">Activity</h3>
      {tokens.length > 0 && (
        <Select aria-label="Show activity of" value={activityOf ?? ''} onChange={(e) => setActivityOf(e.target.value ? Number(e.target.value) : null)}>
          <option value="">All agents</option>
          {tokens.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      )}
      {activities.length === 0 ? (
        <p className="workspace_agent_access-empty">No agent has changed anything yet.</p>
      ) : (
        <ul aria-label="Agent activity" className="workspace_agent_access-list">
          {sortActivities(activities).map((a) => (
            <li key={a.id} className="workspace_agent_access-activity">
              <span><strong>{a.agent_name}</strong> {a.summary}</span>
              <span className="workspace_agent_access-meta">{activityTime(a)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="ui-modal-actions">
        <Button type="button" variant="secondary" onClick={close}>Close</Button>
      </div>

      <ConfirmDialog
        open={revoking !== null}
        title={`Revoke ${revoking?.name ?? 'this token'}?`}
        description="The agent loses access on its next request. Its past activity stays in the list."
        confirmLabel="Revoke token"
        destructive
        onConfirm={() => { if (revoking) revoke.mutate(revoking.id, { onError: (err) => setError(errorMessage(err)) }) }}
        onClose={() => setRevoking(null)}
      />
    </Modal>
  )
}
