# Attaches an uploaded file item (a document with doc_type file) to a task.
class TaskFile < ApplicationRecord
  belongs_to :task
  belongs_to :file, class_name: "Document"

  validates :file_id, uniqueness: { scope: :task_id }
  validate :file_is_a_file_in_the_same_space

  private

  def file_is_a_file_in_the_same_space
    return if task.nil? || file.nil?
    errors.add(:file, "must be an uploaded file") unless file.doc_type == "file"
    errors.add(:file, "must be in the same space") if file.folder.workspace_id != task.workspace_id
  end
end
