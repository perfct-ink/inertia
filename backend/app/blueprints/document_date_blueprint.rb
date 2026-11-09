class DocumentDateBlueprint < Blueprinter::Base
  identifier :id
  fields :date, :label, :document_id, :folder_id, :created_at, :updated_at
  # The title of the document the date was made in, for the calendar entry's link.
  field :document_title do |document_date|
    document_date.document&.title
  end
end
