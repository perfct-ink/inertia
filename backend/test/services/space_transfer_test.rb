require "test_helper"

class SpaceTransferTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "transfer-ada@example.com", password: "password123")
    @source = @user.workspace
    @team = Workspace.create!(name: "Team", user: @user)
    @source_folder = @source.folders.create!(name: "Plans")
    @team_root = @team.root_folder
  end

  def transfer_into(folder)
    SpaceTransfer.new(user: @user, target_folder: folder)
  end

  def task_lines(*task_ids)
    items = task_ids.map { |id| { "type" => "workspaceTaskItem", "attrs" => { "taskId" => id }, "content" => [ { "type" => "paragraph" } ] } }
    { "type" => "doc", "content" => [ { "type" => "taskList", "content" => items } ] }
  end

  def line_task_ids(content)
    content["content"].first["content"].map { |line| line["attrs"]["taskId"] }
  end

  def table_in(folder, title)
    folder.documents.create!(title: title, doc_type: :table, created_by: @user)
  end

  # Contacts link to Companies; one company ("Acme") and one contact linked to it.
  def linked_collections(folder)
    companies = table_in(folder, "Companies")
    name = companies.table_fields.create!(name: "Name", data_type: "text")
    acme = companies.table_records.create!
    acme.table_cells.create!(table_field: name, value: "Acme")
    contacts = table_in(folder, "Contacts")
    company = contacts.table_fields.create!(name: "Company", data_type: "relation", relation_table: companies)
    ada = contacts.table_records.create!
    ada.table_cells.create!(table_field: company, related_record: acme)
    [ companies, contacts ]
  end

  test "remap_task_ids points checklist lines at the copies and unlinks the rest" do
    content = task_lines(5, 99)
    content["content"] << { "type" => "paragraph", "attrs" => { "taskId" => 5 } }

    mapped = SpaceTransfer.remap_task_ids(content, { 5 => 50 })

    assert_equal [ 50, nil ], line_task_ids(mapped)
    assert_equal 5, mapped["content"].last["attrs"]["taskId"]
    assert_equal [ 5, 99 ], line_task_ids(content)
  end

  test "copying a document copies its content and tasks and leaves the original alone" do
    document = @source_folder.documents.create!(title: "Plan", created_by: @user)
    parent = @source.tasks.create!(title: "Ship", document: document, status: :in_progress, due_date: Date.new(2026, 11, 20))
    child = @source.tasks.create!(title: "Test", document: document, parent: parent)
    document.update!(content: task_lines(parent.id, child.id, 9999))

    copy = transfer_into(@team_root).copy_document(document)

    assert_equal @team_root, copy.folder
    assert_equal "Plan", copy.title
    assert_equal @user, copy.created_by
    copied = @team.tasks.where(document: copy).order(:id).to_a
    assert_equal %w[Ship Test], copied.map(&:title)
    assert_equal "in_progress", copied.first.status
    assert_equal Date.new(2026, 11, 20), copied.first.due_date
    assert_equal copied.first, copied.last.parent
    assert_equal [ copied.first.id, copied.last.id, nil ], line_task_ids(copy.content)
    assert_equal [ parent.id, child.id, 9999 ], line_task_ids(document.reload.content)
    assert_equal 2, @source.tasks.where(document: document).count
    assert_equal @source_folder, document.folder
  end

  test "copied tasks keep an assignee only when they belong to the target Space" do
    teammate = User.create!(name: "Grace", email: "transfer-teammate@example.com", password: "password123")
    stranger = User.create!(name: "Alan", email: "transfer-stranger@example.com", password: "password123")
    @team.memberships.create!(user: teammate, role: :member)
    document = @source_folder.documents.create!(title: "Plan", created_by: @user)
    @source.tasks.create!(title: "Mine", document: document, assignee: teammate)
    @source.tasks.create!(title: "Theirs", document: document, assignee: stranger)

    copy = transfer_into(@team_root).copy_document(document)

    assert_equal [ [ "Mine", teammate.id ], [ "Theirs", nil ] ], @team.tasks.where(document: copy).order(:id).map { |t| [ t.title, t.assignee_id ] }
  end

  test "copying a Collection copies its fields, records and values" do
    companies, = linked_collections(@source_folder)

    copy = transfer_into(@team_root).copy_document(companies)

    assert copy.table?
    assert_equal %w[Name], copy.table_fields.map(&:name)
    assert_equal [ "Acme" ], copy.table_records.flat_map { |record| record.table_cells.map(&:value) }
    assert_equal 1, companies.table_records.count
  end

  test "a Collection that links to one left behind can't be copied to another Space" do
    _companies, contacts = linked_collections(@source_folder)

    error = assert_raises(SpaceTransfer::Error) { transfer_into(@team_root).copy_document(contacts) }

    assert_equal SpaceTransfer::LINKED_COLLECTION, error.message
    assert_equal 0, @team.documents.count
  end

  test "copying a Collection keeps field formats, choices, formulas, auto-numbers and the people who can open the new Space" do
    teammate = User.create!(name: "Grace", email: "transfer-grace@example.com", password: "password123")
    stranger = User.create!(name: "Alan", email: "transfer-alan@example.com", password: "password123")
    other = Workspace.create!(name: "Other", user: @user)
    [ @team, other ].each { |space| space.memberships.create!(user: teammate, role: :member) }
    @team.memberships.create!(user: stranger, role: :member)
    table = table_in(@team.folders.create!(name: "Orders"), "Orders")
    price = table.table_fields.create!(name: "Price", data_type: "money", display_format: "gbp")
    stage = table.table_fields.create!(name: "Stage", data_type: "single_select", options: %w[Open Done])
    table.table_fields.create!(name: "Double", data_type: "formula", formula: "{Price} * 2")
    table.table_fields.create!(name: "Weight", data_type: "number", unit: "kg")
    number = table.table_fields.create!(name: "No.", data_type: "auto_number")
    owner = table.table_fields.create!(name: "Owner", data_type: "person")
    first = table.table_records.create!
    second = table.table_records.create!
    first.table_cells.create!(table_field: price, value: 12.5)
    first.table_cells.create!(table_field: stage, value: "Done")
    first.table_cells.create!(table_field: owner, value: teammate.id)
    second.table_cells.create!(table_field: owner, value: stranger.id)
    first.table_cells.find_by!(table_field: number).update_columns(value: 7)
    number.update_columns(next_number: 9)

    copy = SpaceTransfer.new(user: @user, target_folder: other.root_folder).copy_document(table)

    fields = copy.table_fields.index_by(&:name)
    assert_equal "gbp", fields["Price"].display_format
    assert_equal %w[Open Done], fields["Stage"].options
    assert_equal "{Price} * 2", fields["Double"].formula
    assert_equal "kg", fields["Weight"].unit
    assert_equal 9, fields["No."].next_number
    first_copy = copy.table_records.order(:id).first
    assert_equal 7, first_copy.table_cells.find_by!(table_field: fields["No."]).value
    assert_equal 2, TableCell.where(table_field: fields["No."]).count
    assert_equal 12.5, first_copy.table_cells.find_by!(table_field: fields["Price"]).value
    assert_equal [ teammate.id ], TableCell.where(table_field: fields["Owner"]).map(&:value)
  end

  test "a Collection link survives a copy inside the same Space" do
    _companies, contacts = linked_collections(@source_folder)
    other_folder = @source.folders.create!(name: "Elsewhere")

    copy = transfer_into(other_folder).copy_document(contacts)

    link = copy.table_fields.find_by!(name: "Company")
    assert_equal contacts.table_fields.find_by!(name: "Company").relation_table_id, link.relation_table_id
    assert_equal 1, TableCell.where(table_field: link).count
  end

  test "copying a folder copies subfolders, documents and re-points links between its Collections" do
    companies, contacts = linked_collections(@source_folder)
    nested = @source.folders.create!(name: "Nested", kind: :project, parent: @source_folder)
    nested.documents.create!(title: "Deep", created_by: @user)

    copy = transfer_into(@team_root).copy_folder(@source_folder)

    assert_equal @team, copy.workspace
    assert_equal @team_root, copy.parent
    assert_equal "project", copy.children.find_by!(name: "Nested").kind
    assert_equal [ "Deep" ], copy.children.find_by!(name: "Nested").documents.map(&:title)
    new_companies = copy.documents.find_by!(title: "Companies")
    new_contacts = copy.documents.find_by!(title: "Contacts")
    link = new_contacts.table_fields.find_by!(name: "Company")
    assert_equal new_companies.id, link.relation_table_id
    assert_equal new_companies.table_records.first, TableCell.find_by!(table_field: link).related_record
    assert_equal [ companies.id, contacts.id ].sort, @source_folder.documents.map(&:id).sort
    assert_equal @source, @source_folder.reload.workspace
  end

  test "the Root folder can't be copied or moved" do
    root = @source.root_folder

    assert_raises(SpaceTransfer::Error) { transfer_into(@team_root).copy_folder(root) }
    assert_raises(SpaceTransfer::Error) { transfer_into(@team_root).move_folder(root) }
  end

  test "an archived folder is not a destination" do
    archived = @team.folders.create!(name: "Old")
    archived.archive!

    assert_raises(SpaceTransfer::Error) { transfer_into(archived) }
  end

  test "moving a document moves its tasks and drops what only works in the old Space" do
    document = @source_folder.documents.create!(title: "Plan", created_by: @user)
    stranger = User.create!(name: "Alan", email: "transfer-mover@example.com", password: "password123")
    epic = @source.epics.create!(title: "Epic")
    first = @source.tasks.create!(title: "A", document: document, epic: epic, assignee: stranger)
    second = @source.tasks.create!(title: "B", document: document, assignee: @user, parent: first)
    outsider = @source.tasks.create!(title: "Elsewhere")
    straggler = @source.tasks.create!(title: "Straggler", parent: first)
    @source.task_dependencies.create!(predecessor: first, successor: outsider)
    event = @source.events.create!(title: "Launch", date: Date.new(2026, 12, 1))
    event.event_tasks.create!(task: first)
    worker = @source.ai_workers.create!(name: "Writer")
    @source.ai_runs.create!(ai_worker: worker, task: first)
    share = document.shares.create!(created_by: @user)

    moved = transfer_into(@team_root).move_document(document)

    assert_equal document, moved
    assert_equal @team_root, document.reload.folder
    assert_equal [ @team.id, @team.id ], [ first, second ].map { |task| task.reload.workspace_id }
    assert_nil first.epic_id
    assert_nil first.assignee_id
    assert_equal @user.id, second.assignee_id
    assert_equal first.id, second.parent_id
    assert_nil straggler.reload.parent_id
    assert_equal @source.id, outsider.reload.workspace_id
    assert_not TaskDependency.exists?(predecessor_id: first.id)
    assert_not EventTask.exists?(task_id: first.id)
    assert_not AiRun.exists?(task_id: first.id)
    assert_equal document, share.reload.shareable
  end

  test "a document can't be moved into the Space it is already in" do
    document = @source_folder.documents.create!(title: "Plan", created_by: @user)

    assert_raises(SpaceTransfer::Error) { transfer_into(@source.root_folder).move_document(document) }
    assert_equal @source_folder, document.reload.folder
  end

  test "a Collection moves only together with the Collections it links to" do
    companies, contacts = linked_collections(@source_folder)

    assert_raises(SpaceTransfer::Error) { transfer_into(@team_root).move_document(contacts) }
    assert_raises(SpaceTransfer::Error) { transfer_into(@team_root).move_document(companies) }
    assert_equal [ @source_folder, @source_folder ], [ companies, contacts ].map { |table| table.reload.folder }
  end

  test "moving a folder takes its subfolders, documents and Collection links along" do
    companies, contacts = linked_collections(@source_folder)
    nested = @source.folders.create!(name: "Nested", parent: @source_folder)
    deep = nested.documents.create!(title: "Deep", created_by: @user)
    task = @source.tasks.create!(title: "Deep task", document: deep)

    moved = transfer_into(@team_root).move_folder(@source_folder)

    assert_equal @source_folder, moved
    assert_equal [ @team, @team_root ], [ moved.workspace, moved.parent ]
    assert_equal @team, nested.reload.workspace
    assert_equal nested, deep.reload.folder
    assert_equal @team.id, task.reload.workspace_id
    assert_equal @team.id, contacts.reload.folder.workspace_id
    assert_equal companies.id, contacts.table_fields.first.relation_table_id
    assert_not_includes @source.folders.reload.to_a, @source_folder
  end

  test "a folder with tasks, events, epics or milestones attached to it directly is not moved" do
    @source.tasks.create!(title: "Loose", folder: @source_folder)
    @source.events.create!(title: "Launch", date: Date.new(2026, 12, 1), folder: @source_folder)

    error = assert_raises(SpaceTransfer::Error) { transfer_into(@team_root).move_folder(@source_folder) }

    assert_match(/tasks and events/, error.message)
    assert_equal @source, @source_folder.reload.workspace
  end

  test "a failed move leaves both Spaces as they were" do
    document = @source_folder.documents.create!(title: "Plan", created_by: @user)
    task = @source.tasks.create!(title: "Keep", document: document)
    @source.tasks.create!(title: "Loose", folder: @source_folder)

    assert_raises(SpaceTransfer::Error) { transfer_into(@team_root).move_folder(@source_folder) }

    assert_equal @source.id, task.reload.workspace_id
    assert_equal @source_folder, document.reload.folder
  end

  def file_in(folder, name)
    document = Document.new(title: name, doc_type: :file, folder: folder, created_by: @user)
    document.file.attach(io: StringIO.new("data"), filename: name, content_type: "application/pdf")
    document.save!
    document
  end

  test "moving a document cuts the attached files that stay behind" do
    document = @source_folder.documents.create!(title: "Plan", created_by: @user)
    task = @source.tasks.create!(title: "Ship", document: document)
    staying = file_in(@source.root_folder, "stays.pdf")
    task.task_files.create!(file: staying)

    transfer_into(@team_root).move_document(document)

    assert_equal @team.id, task.reload.workspace_id
    assert_empty task.task_files
    assert staying.reload.persisted?
  end

  test "moving a file cuts its links to tasks that stay behind" do
    task = @source.tasks.create!(title: "Stays")
    file = file_in(@source_folder, "moves.pdf")
    task.task_files.create!(file: file)

    transfer_into(@team_root).move_document(file)

    assert_equal @team, file.reload.folder.workspace
    assert_empty task.reload.task_files
  end

  test "moving a folder keeps a file attached to a task that moves with it" do
    document = @source_folder.documents.create!(title: "Plan", created_by: @user)
    task = @source.tasks.create!(title: "Ship", document: document)
    file = file_in(@source_folder, "with.pdf")
    task.task_files.create!(file: file)

    transfer_into(@team_root).move_folder(@source_folder)

    assert_equal [ file ], task.reload.files.to_a
    assert_equal @team.id, task.workspace_id
  end

  test "a copied task does not take attached files along" do
    document = @source_folder.documents.create!(title: "Plan", created_by: @user)
    task = @source.tasks.create!(title: "Ship", document: document)
    task.task_files.create!(file: file_in(@source_folder, "orig.pdf"))

    copy = transfer_into(@team_root).copy_document(document)

    assert_equal 1, task.reload.task_files.count
    assert_empty @team.tasks.where(document: copy).flat_map(&:task_files)
  end

  test "a feature's requirements document cannot move to another Space" do
    epic = @source.epics.create!(title: "Launch", creator: @user)

    error = assert_raises(SpaceTransfer::Error) { transfer_into(@team_root).move_document(epic.document) }

    assert_equal SpaceTransfer::FEATURE_DOCUMENT, error.message
    assert_equal @source.personal_project, epic.document.reload.folder
  end

  test "moving a folder that holds a feature's requirements document is refused too" do
    folder = @source.folders.create!(name: "Specs")
    epic = @source.epics.create!(title: "Launch", creator: @user, document: folder.documents.create!(title: "Launch", created_by: @user))

    assert_raises(SpaceTransfer::Error) { transfer_into(@team_root).move_folder(folder) }
    assert_equal folder, epic.document.reload.folder
  end

  test "a copy of a requirements document is an ordinary document" do
    epic = @source.epics.create!(title: "Launch", creator: @user)

    copy = transfer_into(@team_root).copy_document(epic.document)

    assert_nil copy.feature_epic
    assert_equal epic.document, epic.reload.document
  end
end
