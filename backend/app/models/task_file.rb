# An uploaded file (a document with doc_type "file") attached to a task. The
# file stays an item of its own in the folder tree; this only links it, so
# detaching a file never deletes it, and deleting the file or the task removes
# the link.
class TaskFile < ApplicationRecord
  belongs_to :task
  belongs_to :file, class_name: "Document", inverse_of: :task_files

  validates :file_id, uniqueness: { scope: :task_id }
  validate :file_is_an_uploaded_file_in_the_tasks_space

  private

  def file_is_an_uploaded_file_in_the_tasks_space
    return if task.nil? || file.nil?
    errors.add(:file, "must be an uploaded file") unless file.doc_type == "file"
    errors.add(:file, "must be in the same Space as the task") unless file.workspace_id == task.workspace_id
  end
end
