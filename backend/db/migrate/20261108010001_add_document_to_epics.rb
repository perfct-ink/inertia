# A feature is an epic with a requirements document (docs/features/feature_requirements_docs.md).
# This adds the link; the next migration gives the epics that exist their documents.
#
# The column stays nullable and the foreign key nulls it when the document goes: a document
# deleted along with its folder leaves the feature without one, and the previous release
# (which knows nothing of the column) must keep working against the new schema. The model
# requires a document when a feature is created.
class AddDocumentToEpics < ActiveRecord::Migration[7.2]
  def change
    add_reference :epics, :document, foreign_key: { on_delete: :nullify }, index: { unique: true }
  end
end
