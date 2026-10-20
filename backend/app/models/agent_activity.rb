# One change an agent made, so documents and tasks can show the agent as author.
class AgentActivity < ApplicationRecord
  belongs_to :agent_token
  belongs_to :workspace
  belongs_to :subject, polymorphic: true, optional: true

  validates :action, presence: true

  def self.record!(token, action, subject = nil, summary = nil)
    create!(agent_token: token, workspace_id: token.workspace_id, action: action, subject: subject, summary: summary)
  end
end
