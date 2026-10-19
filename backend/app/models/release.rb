# A release with a date, the documents (songs) in it, and through them its tasks.
class Release < ApplicationRecord
  belongs_to :workspace
  has_many :release_documents, dependent: :destroy
  has_many :documents, through: :release_documents
  has_many :plan_tasks, class_name: "Task", dependent: :nullify, inverse_of: :release

  enum :kind, { single: 0, ep: 1, album: 2, music_video: 3 }, prefix: :kind

  validates :title, presence: true

  # Every task in the release's documents, once each, even when a task's
  # document is in more than one of them.
  def tasks
    workspace.tasks.where(document_id: release_documents.select(:document_id)).or(workspace.tasks.where(release_id: id))
  end

  # Moving the release date moves every plan task with it, keeping its offset.
  after_update :shift_plan_tasks, if: :saved_change_to_release_date?

  def tasks_count = tasks.count
  def done_tasks_count = tasks.where(status: :done).count

  private

  def shift_plan_tasks
    return if release_date.nil?
    plan_tasks.where.not(release_offset_days: nil).find_each do |task|
      task.update!(due_date: release_date + task.release_offset_days)
    end
  end
end
