# A document in a feature folder is a feature (a requirements doc). Features nest
# under features, have an owner and a status (set by hand, or derived from their
# tasks when nil), and can belong to an epic and a milestone.
class AddFeatureFieldsToDocuments < ActiveRecord::Migration[7.2]
  def change
    add_reference :documents, :parent_feature, foreign_key: { to_table: :documents, on_delete: :nullify }
    add_reference :documents, :feature_owner, foreign_key: { to_table: :users, on_delete: :nullify }
    add_column :documents, :feature_status, :integer
    add_reference :documents, :epic, foreign_key: { on_delete: :nullify }
    add_reference :documents, :milestone, foreign_key: { on_delete: :nullify }
  end
end
