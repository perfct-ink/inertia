# A named snapshot of a folder's planned task dates. Tasks without a due date
# are not captured (they have no end to draw on the Gantt).
class Baseline < ApplicationRecord
  belongs_to :workspace
  belongs_to :folder
  belongs_to :created_by, class_name: "User", optional: true
  has_many :baseline_tasks, dependent: :destroy

  validates :name, presence: true
  validate :folder_in_workspace

  # Copies the current dates of every dated task in the folder (and its
  # subfolders and their documents).
  def self.snapshot!(folder:, name:, created_by: nil)
    transaction do
      baseline = create!(workspace_id: folder.workspace_id, folder: folder, name: name, created_by: created_by)
      folder.scheduled_tasks.where.not(due_date: nil).find_each do |task|
        baseline.baseline_tasks.create!(task: task, start_date: task.start_date, due_date: task.due_date)
      end
      baseline
    end
  end

  private

  def folder_in_workspace
    errors.add(:folder, "must be in this space") if folder && folder.workspace_id != workspace_id
  end
end
