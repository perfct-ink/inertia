# Puts a document in a release. The document must be in the release's Space.
class ReleaseDocument < ApplicationRecord
  belongs_to :release
  belongs_to :document

  validates :document_id, uniqueness: { scope: :release_id }
  validate :document_in_workspace

  private

  def document_in_workspace
    return if release.nil? || document.nil? || document.folder.workspace_id == release.workspace_id
    errors.add(:document, "must be in this space")
  end
end
