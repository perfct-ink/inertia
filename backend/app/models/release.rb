# A release with a date, the documents (songs) in it, and through them its tasks.
class Release < ApplicationRecord
  belongs_to :workspace
  has_many :release_documents, dependent: :destroy
  has_many :documents, through: :release_documents

  enum :kind, { single: 0, ep: 1, album: 2, music_video: 3 }, prefix: :kind

  validates :title, presence: true

  # Every task in the release's documents, once each, even when a task's
  # document is in more than one of them.
  def tasks
    workspace.tasks.where(document_id: release_documents.select(:document_id))
  end

  def tasks_count = tasks.count
  def done_tasks_count = tasks.where(status: :done).count
end
