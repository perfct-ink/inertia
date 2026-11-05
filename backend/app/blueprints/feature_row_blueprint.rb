class FeatureRowBlueprint < Blueprinter::Base
  field(:id) { |row| row.document.id }
  field(:title) { |row| row.document.title }
  field(:folder_id) { |row| row.document.folder_id }
  field(:parent_feature_id) { |row| row.document.parent_feature_id }
  field(:owner_id) { |row| row.document.feature_owner_id }
  field(:owner_name) { |row| row.document.feature_owner&.name }
  field(:epic_id) { |row| row.document.epic_id }
  field(:milestone_id) { |row| row.document.milestone_id }
  fields :depth, :tasks_count, :done_tasks_count, :percent, :status, :status_derived
end
