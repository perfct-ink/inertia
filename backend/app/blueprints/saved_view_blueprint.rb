class SavedViewBlueprint < Blueprinter::Base
  identifier :id
  fields :page, :name, :config, :shared, :user_id, :created_at
  field(:owner_name) { |view| view.user.name }
end
