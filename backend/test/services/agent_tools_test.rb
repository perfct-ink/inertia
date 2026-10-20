require "test_helper"

class AgentToolsTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-tools@example.com", password: "password123")
    @workspace = @user.workspace
    @folder = @workspace.folders.create!(name: "Plans")
    @doc = Document.create!(title: "Launch plan", folder: @folder, created_by: @user, content: DocumentMarkdown.parse("# Launch plan\n\nShip it.\n\n- [ ] Write spec\n- [ ] Review", title: "Launch plan"))
    @read, = AgentToken.issue!(workspace: @workspace, name: "Reader")
    @write, = AgentToken.issue!(workspace: @workspace, name: "Writer", permission: :write)
  end

  def call(token, name, **args) = AgentTools.call(token, name, args)

  test "list and read documents as Markdown with task ids" do
    task = @workspace.tasks.create!(title: "Write spec", document: @doc, status: :done)
    listed = call(@read, "list_documents")
    assert_equal [ "Launch plan" ], listed.map { |d| d[:title] }
    md = call(@read, "read_document", id: @doc.id)[:markdown]
    assert_includes md, "# Launch plan"
    assert_includes md, "Ship it."
    assert_includes md, "Write spec"
    assert task.persisted?
  end

  test "read-only tokens cannot use write tools, and do not see them" do
    assert_raises(AgentTools::Error) { call(@read, "edit_document", id: @doc.id, markdown: "# x") }
    assert_not_includes AgentTools.for_token(@read).map(&:name), "edit_document"
    assert_includes AgentTools.for_token(@write).map(&:name), "edit_document"
  end

  test "editing a document keeps task ids, creates tasks for new lines, ticks and renames tasks, and logs the agent" do
    spec = @workspace.tasks.create!(title: "Write spec", document: @doc, status: :todo)
    review = @workspace.tasks.create!(title: "Review", document: @doc, status: :done)
    markdown = "# Launch plan\n\nSketch.\n\n- [x] Write the spec <!-- task:#{spec.id} -->\n- [ ] Review <!-- task:#{review.id} -->\n- [ ] Announce"

    result = call(@write, "edit_document", id: @doc.id, markdown: markdown)

    assert_equal 1, result[:tasks_created]
    assert_equal [ "Write the spec", "done" ], [ spec.reload.title, spec.status ]
    assert_equal "todo", review.reload.status
    announce = @workspace.tasks.find_by!(title: "Announce")
    assert_equal @doc, announce.document
    ids = @doc.reload.content["content"].find { |n| n["type"] == "workspaceTaskList" }["content"].map { |i| i["attrs"] }
    assert_equal [ { "taskId" => spec.id }, { "taskId" => review.id }, { "taskId" => announce.id } ], ids
    activity = @write.activities.sole
    assert_equal [ "edited_document", @doc ], [ activity.action, activity.subject ]
  end

  test "a task id from another document is not trusted" do
    other = @workspace.tasks.create!(title: "Elsewhere")
    call(@write, "edit_document", id: @doc.id, markdown: "# Launch plan\n\n- [ ] Mine <!-- task:#{other.id} -->")
    assert_equal "Elsewhere", other.reload.title
    assert @workspace.tasks.exists?(title: "Mine", document_id: @doc.id)
  end

  test "documents with tables are refused for whole-document edits but replace_text still works" do
    @doc.update!(content: { "type" => "doc", "content" => [
      { "type" => "heading", "attrs" => { "level" => 1 }, "content" => [ { "type" => "text", "text" => "Plan" } ] },
      { "type" => "paragraph", "content" => [ { "type" => "text", "text" => "Ship on Friday" } ] },
      { "type" => "table", "content" => [] }
    ] })
    error = assert_raises(AgentTools::Error) { call(@write, "edit_document", id: @doc.id, markdown: "# x") }
    assert_match(/table/, error.message)

    assert_equal 1, call(@write, "replace_text", id: @doc.id, find: "Friday", replace: "Monday")[:replaced]
    assert_includes @doc.reload.content["content"][1]["content"][0]["text"], "Monday"
    assert_equal "table", @doc.content["content"][2]["type"]
    assert_raises(AgentTools::Error) { call(@write, "replace_text", id: @doc.id, find: "nowhere", replace: "x") }
  end

  test "task tools create, list, filter and update, and reject a bad status" do
    created = call(@write, "create_task", title: "Draft", document_id: @doc.id, status: "todo", due_date: "2026-12-01")
    assert_equal [ "Draft", "todo" ], [ created[:title], created[:status] ]
    assert_equal [ created[:id] ], call(@read, "list_tasks", document_id: @doc.id).map { |t| t[:id] }

    call(@write, "update_task", id: created[:id], status: "done")
    assert_equal "done", @workspace.tasks.find(created[:id]).status
    assert_equal [], call(@read, "list_tasks", status: "todo")

    assert_raises(AgentTools::Error) { call(@write, "update_task", id: created[:id], status: "someday") }
    assert_equal 2, @write.activities.count
  end

  test "a folder-scoped token cannot see or touch anything outside its folder" do
    other_folder = @workspace.folders.create!(name: "Private")
    secret = Document.create!(title: "Secret", folder: other_folder, created_by: @user)
    outside_task = @workspace.tasks.create!(title: "Outside")
    scoped, = AgentToken.issue!(workspace: @workspace, name: "Scoped", permission: :write, folder: @folder)

    assert_equal [ "Launch plan" ], call(scoped, "list_documents").map { |d| d[:title] }
    assert_raises(AgentTools::Error) { call(scoped, "read_document", id: secret.id) }
    assert_raises(AgentTools::Error) { call(scoped, "update_task", id: outside_task.id, status: "done") }
    assert_raises(AgentTools::Error) { call(scoped, "create_task", title: "Loose") }
    assert_equal [], call(scoped, "list_tasks")
  end

  test "another space's documents are never reachable" do
    other = User.create!(name: "O", email: "o-tools@example.com", password: "password123")
    theirs = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    assert_raises(AgentTools::Error) { call(@write, "read_document", id: theirs.id) }
    assert_raises(AgentTools::Error) { call(@write, "replace_text", id: theirs.id, find: "a", replace: "b") }
  end

  test "collections can be read and written by field name" do
    table = Document.create!(title: "People", doc_type: :table, folder: @folder, created_by: @user)
    table.table_fields.create!(name: "Name", data_type: "text")
    table.table_fields.create!(name: "Age", data_type: "integer")

    created = call(@write, "write_collection_record", id: table.id, values: { "Name" => "Ada", "Age" => 36 })
    call(@write, "write_collection_record", id: table.id, record_id: created[:record_id], values: { "Age" => 37, "Name" => nil })

    read = call(@read, "read_collection", id: table.id)
    assert_equal [ "Name", "Age" ], read[:fields].map { |f| f[:name] }
    assert_equal [ { "Age" => 37 } ], read[:records].map { |r| r[:values].compact }
    assert_raises(AgentTools::Error) { call(@write, "write_collection_record", id: table.id, values: { "Nope" => 1 }) }
    assert_raises(AgentTools::Error) { call(@write, "write_collection_record", id: table.id, values: { "Age" => "old" }) }
  end

  test "an unknown tool is an error" do
    assert_raises(AgentTools::Error) { call(@read, "delete_everything") }
  end
end
