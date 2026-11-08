# Existing epics become features (Alex, 2026-11-09; docs/features/feature_requirements_docs.md):
# every epic with no requirements document gets a blank one, made from the requirements template
# (frozen below as it was when this was written, so the migration doesn't change when the
# template does), titled like the epic, by the Space's creator.
#
# A feature is within a project, so the document goes in the epic's folder, or, for an epic with
# none, in the Space's "Personal Project" (the project that new things made with no project open
# are filed in; made here if the Space has none). Such an epic is filed in that project too, so
# the feature and its document agree.
#
# Safe to rerun: it only touches epics whose document_id is null, locks each epic and checks again,
# and does one epic per transaction, so an interruption leaves whole features and a rerun carries
# on (it also heals a feature whose document was deleted with its folder). Nothing is deleted, and
# `down` does nothing: the documents are ordinary documents and may already hold people's writing.
# The previous release ignores the column, so a rollback of the app needs no undo here.
class GiveEpicsRequirementsDocuments < ActiveRecord::Migration[7.2]
  PERSONAL_PROJECT_NAME = "Personal Project".freeze
  DOCUMENT = 0
  PROJECT = 1

  class MigrationEpic < ActiveRecord::Base
    self.table_name = "epics"
  end

  class MigrationWorkspace < ActiveRecord::Base
    self.table_name = "workspaces"
  end

  class MigrationFolder < ActiveRecord::Base
    self.table_name = "folders"
  end

  class MigrationDocument < ActiveRecord::Base
    self.table_name = "documents"
  end

  def up
    [ MigrationEpic, MigrationWorkspace, MigrationFolder, MigrationDocument ].each(&:reset_column_information)
    made = 0
    new_projects = 0
    skipped = 0

    MigrationEpic.where(document_id: nil).find_each do |epic|
      MigrationEpic.transaction do
        epic.lock!
        next if epic.document_id

        workspace = MigrationWorkspace.find_by(id: epic.workspace_id)
        if workspace.nil?
          skipped += 1
          next
        end

        folder_id = epic.folder_id
        if folder_id.nil?
          folder_id, created = personal_project_id(workspace)
          new_projects += 1 if created
        end

        document = MigrationDocument.create!(
          title: epic.title,
          doc_type: DOCUMENT,
          folder_id: folder_id,
          created_by_id: workspace.user_id,
          content: starting_content(epic.title)
        )
        epic.update_columns(document_id: document.id, folder_id: folder_id)
        made += 1
      end
    end

    say "requirements documents made: #{made}; Personal Projects made: #{new_projects}; epics skipped (no Space): #{skipped}"
  end

  def down
    say "nothing to undo: the requirements documents are kept"
  end

  private

  # [id, whether it was made now] of the Space's Personal Project, made when there is none.
  def personal_project_id(workspace)
    existing = MigrationFolder.where(workspace_id: workspace.id, kind: PROJECT, archived_at: nil, name: PERSONAL_PROJECT_NAME).order(:id).first
    return [ existing.id, false ] if existing

    [ MigrationFolder.create!(workspace_id: workspace.id, parent_id: workspace.root_folder_id, name: PERSONAL_PROJECT_NAME, kind: PROJECT).id, true ]
  end

  # The requirements template (RequirementsTemplate.content) as editor (TipTap) JSON.
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
