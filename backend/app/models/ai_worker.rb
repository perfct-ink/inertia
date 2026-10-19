# A named AI worker a Space can hand tasks to (backlog section 25). The
# instructions become its system prompt; the model is passed to the client.
class AiWorker < ApplicationRecord
  belongs_to :workspace
  has_many :ai_runs, dependent: :destroy

  validates :name, presence: true
  validates :model, presence: true
end
