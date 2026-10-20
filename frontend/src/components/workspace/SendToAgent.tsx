import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Bot } from 'lucide-react'
import { Button, FormError, Input, Modal, Select, Textarea } from '@/components/ui'
import { useAgentHandoffs, useSendToAgent } from '@/api/agentHandoffs'
import { errorMessage } from '@/util/errorMessage'
import { handoffMessage, handoffStatusLabel } from '@/data/agentAccess'
import type { HandoffSubject, NewAgentHandoff } from '@/types'
import './SendToAgent.scss'

// "Send to agent" on a document, folder or task: hands it to Claude Code (or any
// MCP agent) with a prompt, the MCP URL and a token limited to that folder.
export function SendToAgent({ subjectType, subjectId, title, className }: { subjectType: HandoffSubject; subjectId: number; title: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const [agentName, setAgentName] = useState('Claude Code')
  const [instruction, setInstruction] = useState('')
  const [permission, setPermission] = useState<'read' | 'write'>('write')
  const [sent, setSent] = useState<NewAgentHandoff | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const send = useSendToAgent(subjectType, subjectId)
  const { data: history = [] } = useAgentHandoffs(subjectType, subjectId, open)

  function close() {
    setOpen(false)
    setSent(null)
    setCopied(false)
  }

  function submit() {
    setError(null)
    send.mutate(
      { agent_name: agentName.trim() || 'Claude Code', instruction: instruction.trim(), permission },
      { onSuccess: (handoff) => { setSent(handoff); setInstruction('') }, onError: (e) => setError(errorMessage(e)) },
    )
  }

  async function copy(handoff: NewAgentHandoff) {
    try {
      await navigator.clipboard.writeText(handoffMessage(handoff))
      setCopied(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <>
      <Button className={className} title="Send to agent" aria-label={`Send ${title} to agent`} onClick={() => setOpen(true)}>
        <Bot className="send_to_agent-icon" />
      </Button>
      <Modal open={open} title="Send to agent" description={`Hand "${title}" to Claude Code or another agent. It can read this ${subjectType === 'folder' ? 'folder' : 'item'} through Inertia's MCP server; its token reaches only that folder and can be revoked under Agent access.`} onClose={close}>
        {sent ? (
          <div role="status" className="send_to_agent-sent">
            <p><strong>Copy this now.</strong> The token won&rsquo;t be shown again.</p>
            <Textarea readOnly aria-label="Handoff for the agent" rows={10} value={handoffMessage(sent)} onFocus={(e) => e.currentTarget.select()} />
            <Button variant="primary" onClick={() => copy(sent)}>{copied ? 'Copied' : 'Copy handoff'}</Button>
          </div>
        ) : (
          <>
            <Input aria-label="Agent name" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
            <Textarea aria-label="Instruction" placeholder='What should it do? e.g. "Build this" or "Draft the release plan"' rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} />
            <Select aria-label="Agent permission" value={permission} onChange={(e) => setPermission(e.target.value as 'read' | 'write')}>
              <option value="write">Read and write</option>
              <option value="read">Read only</option>
            </Select>
            <Button variant="primary" disabled={send.isPending} onClick={submit}>Send</Button>
          </>
        )}
        <FormError message={error} />
        {history.length > 0 && (
          <ul aria-label="Earlier handoffs">
            {history.map((h) => (
              <li key={h.id}>{h.agent_name} · {handoffStatusLabel(h.status)} · {h.sent_by_name ?? 'Someone'}, {format(parseISO(h.created_at), 'MMM d, h:mm a')}{h.instruction ? ` · ${h.instruction}` : ''}</li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  )
}
