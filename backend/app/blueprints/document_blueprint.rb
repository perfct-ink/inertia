class DocumentBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :slug, :doc_type, :pinned, :created_at, :updated_at, :content_updated_at

  field :folder_id

  view :with_content do
    field :content
  end
end
