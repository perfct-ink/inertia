# A document, folder or task sent to an outside agent. It records who sent it,
# what it covers, the instruction and the agent token handed over (the token
# itself is shown once, to the sender), so the item can show the run's history.
class AgentHandoff < ApplicationRecord
  SUBJECTS = { "document" => "Document", "folder" => "Folder", "task" => "Task" }.freeze

  belongs_to :workspace
  belongs_to :agent_token
  belongs_to :sent_by, class_name: "User", optional: true
  belongs_to :subject, polymorphic: true

  validates :agent_name, :prompt, presence: true
  validate :subject_in_workspace

  # "sent" until the agent first uses its token, then "working", and "closed"
  # once the token is revoked.
  def status
    return "closed" if agent_token.revoked?
    agent_token.last_used_at ? "working" : "sent"
  end

  # Hands `subject` to an agent: makes a token scoped to the folder it lives in
  # and builds the prompt. Returns [handoff, plain token].
  def self.hand_off!(subject:, sent_by:, agent_name:, instruction: nil, permission: :write, mcp_url:)
    folder = scope_folder(subject)
    token, plain = AgentToken.issue!(workspace: subject_workspace(subject), name: agent_name, permission: permission, folder: folder, created_by: sent_by)
    prompt = AgentHandoffPrompt.build(subject: subject, instruction: instruction, mcp_url: mcp_url, writable: token.writable?)
    handoff = create!(workspace: token.workspace, agent_token: token, sent_by: sent_by, subject: subject, agent_name: agent_name,
                      instruction: instruction.presence, prompt: prompt)
    [ handoff, plain ]
  end

  # The token reaches only the folder the item lives in (nil = whole Space for a task with no folder).
  def self.scope_folder(subject)
    case subject
    when Folder then subject
    when Document then subject.folder
    when Task then subject.folder || subject.document&.folder
    end
  end

  def self.subject_workspace(subject)
    subject.is_a?(Folder) ? subject.workspace : (subject.respond_to?(:workspace) && subject.workspace) || subject.folder.workspace
  end

  private

  def subject_in_workspace
    errors.add(:subject, "must be in the same space") if subject && self.class.subject_workspace(subject).id != workspace_id
  end
end
