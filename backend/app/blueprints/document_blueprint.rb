class DocumentBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :doc_type, :pinned, :created_at, :updated_at, :content_updated_at

  field :folder_id

  # For uploaded files: how to download or preview it, and what it is.
  field :file do |document, _options|
    next unless document.doc_type == "file" && document.file.attached?
    blob = document.file.blob
    { url: Rails.application.routes.url_helpers.rails_blob_path(blob, only_path: true), filename: blob.filename.to_s, content_type: blob.content_type, byte_size: blob.byte_size }
  end

  view :with_content do
    field :content
  end
end
