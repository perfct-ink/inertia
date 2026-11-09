# A date picked or typed in a document. The document shows it as a chip; the
# calendar shows it as an entry that opens the document at the chip. Changing the
# date on either side changes this one record. Deleting the line the chip sat in
# lets the user keep the entry, unlinked (document_id nil), see
# docs/features/document_dates.md. It is not an Event: events have a title, a
# type and tasks, a date has only a day and a label.
class DocumentDate < ApplicationRecord
  belongs_to :workspace
  belongs_to :document, optional: true
  belongs_to :folder, optional: true

  validates :date, presence: true
  validates :label, length: { maximum: 255 }
  validate :document_in_same_workspace
  validate :folder_in_same_workspace

  # A date lives in the project of its document, so the calendar narrowed to a
  # project shows it; unlinking keeps the folder.
  before_validation :file_in_documents_folder

  scope :in_order, -> { order(:date, :id) }

  private

  def file_in_documents_folder
    self.folder_id = document.folder_id if document && folder_id.nil?
  end

  def document_in_same_workspace
    return if document.nil? || document.workspace_id == workspace_id
    errors.add(:document, "must be in the same space")
  end

  def folder_in_same_workspace
    return if folder.nil? || folder.workspace_id == workspace_id
    errors.add(:folder, "must be in the same space")
  end
end
