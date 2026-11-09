# One change an agent made, so the agent shows as the author (a person's name is
# never put on it). Kept even after the token is revoked; it goes with the token
# only when the token itself is deleted (its folder or Space was deleted).
class AgentActivity < ApplicationRecord
  SUMMARY_LENGTH = 255

  belongs_to :agent_token
  belongs_to :workspace
  belongs_to :subject, polymorphic: true, optional: true

  validates :action, presence: true

  # Newest first.
  scope :recent, -> { order(created_at: :desc, id: :desc) }

  def self.record!(token, action, subject = nil, summary = nil)
    create!(agent_token: token, workspace_id: token.workspace_id, action: action, subject: subject, summary: summary&.truncate(SUMMARY_LENGTH))
  end
end
