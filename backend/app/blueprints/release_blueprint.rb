class ReleaseBlueprint < Blueprinter::Base
  identifier :id
  field :folder_id
  fields :title, :kind, :release_date, :created_at, :updated_at
  field(:document_ids) { |release| release.release_documents.map(&:document_id) }
  field :tasks_count
  field :done_tasks_count
end
