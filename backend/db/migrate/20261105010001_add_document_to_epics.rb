# A feature is an epic with a requirements document (docs/features/feature_requirements_docs.md).
# The column stays nullable in the database: the model requires a document when a feature is
# created, and a document deleted along with its folder leaves the feature without one.
# Existing epics each get a requirements document here, in their folder (or the Space's root),
# made by the Space's creator.
class AddDocumentToEpics < ActiveRecord::Migration[7.2]
  class MigrationEpic < ActiveRecord::Base
    self.table_name = "epics"
  end

  class MigrationWorkspace < ActiveRecord::Base
    self.table_name = "workspaces"
  end

  class MigrationDocument < ActiveRecord::Base
    self.table_name = "documents"
  end

  def up
    add_reference :epics, :document, foreign_key: { on_delete: :nullify }, index: { unique: true }
    MigrationEpic.reset_column_information

    MigrationEpic.where(document_id: nil).find_each do |epic|
      workspace = MigrationWorkspace.find_by(id: epic.workspace_id)
      folder_id = epic.folder_id || workspace&.root_folder_id
      next if workspace.nil? || folder_id.nil?

      document = MigrationDocument.create!(
        title: epic.title,
        doc_type: 0,
        folder_id: folder_id,
        created_by_id: workspace.user_id,
        content: starting_content(epic.title)
      )
      epic.update_columns(document_id: document.id)
    end
  end

  def down
    remove_reference :epics, :document, foreign_key: { on_delete: :nullify }, index: { unique: true }
  end

  private

  # The requirements template (RequirementsTemplate.content) frozen as it was when this ran, so
  # the migration doesn't change when the template does.
  def starting_content(title)
    heading = ->(level, value) { { "type" => "heading", "attrs" => { "level" => level }, "content" => value.empty? ? [] : [ { "type" => "text", "text" => value } ] } }
    bullets = { "type" => "bulletList", "content" => [ { "type" => "listItem", "content" => [ { "type" => "paragraph" } ] } ] }
    {
      "type" => "doc",
      "content" => [
        heading.call(1, title),
        heading.call(2, "Problem"),
        { "type" => "paragraph", "content" => [ { "type" => "text", "text" => "What is wrong or missing today, and for whom?" } ] },
        heading.call(2, "Goals"), bullets,
        heading.call(2, "User stories"),
        { "type" => "bulletList", "content" => [ { "type" => "listItem", "content" => [ { "type" => "paragraph", "content" => [ { "type" => "text", "text" => "As a …, I want …, so that …" } ] } ] } ] },
        heading.call(2, "Acceptance criteria"), bullets,
        heading.call(2, "Out of scope"), bullets,
        heading.call(2, "Tasks"),
        { "type" => "workspaceTaskList", "content" => [ { "type" => "workspaceTaskItem", "content" => [ { "type" => "paragraph" } ] } ] }
      ]
    }
  end
end
