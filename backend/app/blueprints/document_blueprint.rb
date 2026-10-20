class DocumentBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :doc_type, :pinned, :created_at, :updated_at, :content_updated_at

  field :folder_id
  fields :parent_feature_id, :feature_status, :feature_owner_id, :epic_id, :milestone_id

  view :with_content do
    field :content
  end
end
