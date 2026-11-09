require "test_helper"
require_relative "../support/agent_access"

# The operations an agent can run (AgentTools), called the way the MCP server and
# the REST wrapper call them.
class AgentToolsTest < ActiveSupport::TestCase
  include AgentAccess

  setup do
    build_agent_space
    @token, = issue_agent_token
    @readonly, = issue_agent_token(permission: :read, name: "Reader")
    @folder_token, = issue_agent_token(folder: @plans, name: "Plans only")
  end

  def run_tool(token, name, **arguments)
    AgentTools.call(token, name, arguments.stringify_keys)
  end

  def refused(token, name, **arguments)
    assert_raises(AgentTools::Error) { run_tool(token, name, **arguments) }
  end

  # ---- which tools a token gets ---------------------------------------------

  test "a read-only token gets the read tools and cannot run a write tool" do
    read_names = AgentTools.for_token(@readonly).map(&:name)
    write_names = AgentTools.for_token(@token).map(&:name)
    assert_includes read_names, "read_document"
    assert_not_includes read_names, "edit_document"
    assert_includes write_names, "edit_document"
    assert_equal read_names - write_names, []

    document = make_document(@plans, "Plan", paragraph_node("Hello"))
    error = refused(@readonly, "edit_document", id: document.id, markdown: "# Plan\n\nChanged\n")
    assert_match(/read-only/, error.message)
    assert_equal "Hello", document.reload.content["content"].last.dig("content", 0, "text")
    assert_equal 0, AgentActivity.count
  end

  test "an unknown tool and bad arguments are errors the agent can read" do
    assert_match(/Unknown tool/, refused(@token, "drop_everything").message)
    assert_raises(AgentTools::Error) { AgentTools.call(@token, "list_documents", [ 1 ]) }
  end

  # ---- documents -------------------------------------------------------------

  test "documents are listed and read as Markdown with task ids" do
    task = @space.tasks.create!(title: "Write the spec", status: :done)
    document = make_document(@plans, "Plan", paragraph_node("Some text"), task_list_node([ task.id, "Write the spec" ], [ nil, "Review it" ]))
    task.update!(document: document)

    listed = run_tool(@token, "list_documents")
    assert_equal [ document.id ], listed.map { |d| d[:id] }
    assert_equal [ document.id ], run_tool(@token, "list_documents", query: "pla").map { |d| d[:id] }
    assert_empty run_tool(@token, "list_documents", query: "nothing like it")

    read = run_tool(@token, "read_document", id: document.id)
    assert_includes read[:markdown], "- [x] Write the spec <!-- task:#{task.id} -->"
    assert_includes read[:markdown], "- [ ] Review it"
    assert read[:can_edit_document]
    assert_equal AgentTools.timestamp(document.reload.updated_at), read[:updated_at]
  end

  test "a token reaches only its own space, and a folder token only its folder" do
    mine = make_document(@plans, "Mine")
    outside = make_document(@other_folder, "Outside")
    theirs = make_document(@elsewhere_folder, "Theirs", by: @stranger)

    assert_equal [ mine.id, outside.id ].sort, run_tool(@token, "list_documents").map { |d| d[:id] }.sort
    assert_equal [ mine.id ], run_tool(@folder_token, "list_documents").map { |d| d[:id] }

    refused(@folder_token, "read_document", id: outside.id)
    refused(@token, "read_document", id: theirs.id)
    refused(@token, "edit_document", id: theirs.id, markdown: "# Theirs\n\nOwned\n")
    refused(@token, "replace_text", id: theirs.id, find: "Theirs", replace: "Mine")
    refused(@folder_token, "list_documents", folder_id: @other_folder.id)
    refused(@token, "list_documents", folder_id: @elsewhere_folder.id)
    assert_equal "Theirs", theirs.reload.title

    folders = run_tool(@folder_token, "list_folders")
    assert_equal [ @plans.id, @drafts.id ], folders.map { |f| f[:id] }
    assert_nil folders.first[:parent_id], "the parent is above the token's reach"
  end

  test "the error for a document outside the token's reach is the same as for one that does not exist" do
    theirs = make_document(@elsewhere_folder, "Theirs", by: @stranger)
    missing = refused(@token, "read_document", id: 0).message.sub("0", "ID")
    foreign = refused(@token, "read_document", id: theirs.id).message.sub(theirs.id.to_s, "ID")
    assert_equal missing, foreign
  end

  test "a Collection is not a document and a document is not a Collection" do
    collection = make_collection(@plans, "People")
    document = make_document(@plans, "Plan")
    assert_match(/Collection, not a document/, refused(@token, "read_document", id: collection.id).message)
    assert_match(/document, not a Collection/, refused(@token, "read_collection", id: document.id).message)
  end

  test "editing a document changes a paragraph, keeps task ids, ticks a task and is logged to the agent" do
    task = @space.tasks.create!(title: "Write the spec", status: :todo)
    document = make_document(@plans, "Plan", paragraph_node("Old words"), task_list_node([ task.id, "Write the spec" ]))
    task.update!(document: document)
    markdown = run_tool(@token, "read_document", id: document.id)[:markdown]
    markdown = markdown.sub("Old words", "New words").sub("- [ ] Write the spec", "- [x] Write the spec")

    result = run_tool(@token, "edit_document", id: document.id, markdown: markdown)
    assert_equal 0, result[:tasks_created]
    assert_equal 1, result[:tasks_updated]

    document.reload
    assert_equal "New words", document.content["content"][1].dig("content", 0, "text")
    line = document.content["content"][2]["content"].first
    assert_equal task.id, line.dig("attrs", "taskId")
    assert_not line["attrs"].key?("checked"), "the tick belongs to the task, not the line"
    assert_equal "done", task.reload.status

    change = task.status_changes.last
    assert_equal @token, change.agent_token
    assert_nil change.changed_by
    assert_equal "Claude Code (agent)", TaskStatusChangeBlueprint.render_as_hash(change)[:changed_by_name]

    activity = AgentActivity.last
    assert_equal [ @token, "edited_document", document ], [ activity.agent_token, activity.action, activity.subject ]
    assert_equal @space.id, activity.workspace_id
  end

  test "a new task line becomes a task of the document, and a task id from another document is not trusted" do
    document = make_document(@plans, "Plan")
    other_document = make_document(@other_folder, "Other")
    foreign_task = @space.tasks.create!(title: "Not this document's", document: other_document, status: :todo)

    markdown = "# Plan\n\n- [ ] Brand new <!-- task:#{foreign_task.id} -->\n- [x] Also new\n"
    result = run_tool(@token, "edit_document", id: document.id, markdown: markdown)
    assert_equal 2, result[:tasks_created]

    assert_equal "Not this document's", foreign_task.reload.title
    assert_equal "todo", foreign_task.status
    assert_equal other_document.id, foreign_task.document_id

    created = @space.tasks.where(document_id: document.id).reorder(:id)
    assert_equal [ "Brand new", "Also new" ], created.map(&:title)
    assert_equal %w[backlog done], created.map(&:status)
    assert_equal [ @token ], created.flat_map { |t| t.status_changes.map(&:agent_token) }.uniq
    line_ids = document.reload.content["content"].last["content"].map { |l| l.dig("attrs", "taskId") }
    assert_equal created.map(&:id), line_ids
  end

  test "an edit is refused when the document changed since it was read" do
    document = make_document(@plans, "Plan", paragraph_node("Hello"))
    stale = run_tool(@token, "read_document", id: document.id)[:updated_at]
    document.update!(content: doc_content(heading_node("Plan"), paragraph_node("Someone else was here")), updated_at: 1.minute.from_now)

    error = refused(@token, "edit_document", id: document.id, markdown: "# Plan\n\nMine\n", base_updated_at: stale)
    assert_match(/changed since you read it/, error.message)
    assert_equal "Someone else was here", document.reload.content["content"].last.dig("content", 0, "text")
  end

  test "an edit keeps blocks Markdown cannot hold, and a document with unsupported content is refused for rewrites" do
    table = { "type" => "table", "content" => [ { "type" => "tableRow", "content" => [ { "type" => "tableCell", "content" => [ paragraph_node("cell") ] } ] } ] }
    document = make_document(@plans, "Plan", paragraph_node("Words"), table)
    markdown = run_tool(@token, "read_document", id: document.id)[:markdown]
    assert_includes markdown, "<!-- keep:"
    run_tool(@token, "edit_document", id: document.id, markdown: markdown.sub("Words", "More words"))
    assert_equal "table", document.reload.content["content"].last["type"]

    styled = { "type" => "paragraph", "content" => [ { "type" => "text", "text" => "Marked", "marks" => [ { "type" => "highlight" } ] } ] }
    risky = make_document(@plans, "Risky", styled)
    read = run_tool(@token, "read_document", id: risky.id)
    assert_not read[:can_edit_document]
    assert_match(/highlight/, refused(@token, "edit_document", id: risky.id, markdown: "# Risky\n\nGone\n").message)
    assert_equal 1, run_tool(@token, "replace_text", id: risky.id, find: "Marked", replace: "Changed")[:replaced]
    assert_equal [ { "type" => "highlight" } ], risky.reload.content["content"].last.dig("content", 0, "marks")
  end

  test "an edit refuses a huge body, and unsafe links do not get into the document" do
    document = make_document(@plans, "Plan")
    refused(@token, "edit_document", id: document.id, markdown: "x" * (DocumentMarkdown::MAX_LENGTH + 1))

    lines = Array.new(AgentTools::Documents::MAX_NEW_TASKS + 1) { |i| "- [ ] Task #{i}" }
    error = refused(@token, "edit_document", id: document.id, markdown: "# Plan\n\n#{lines.join("\n")}\n")
    assert_match(/at most #{AgentTools::Documents::MAX_NEW_TASKS} tasks/, error.message)
    assert_equal 0, @space.tasks.where(document_id: document.id).count
    run_tool(@token, "edit_document", id: document.id, markdown: "# Plan\n\n[click](javascript:alert(1))\n")
    link_marks = document.reload.content["content"].last["content"].flat_map { |n| Array(n["marks"]) }
    assert_empty link_marks
  end

  test "replace_text swaps text, updates the title when the heading changes and is logged" do
    document = make_document(@plans, "Plan", paragraph_node("Ship it on Friday"))
    result = run_tool(@token, "replace_text", id: document.id, find: "Friday", replace: "Monday")
    assert_equal 1, result[:replaced]
    assert_equal "Ship it on Monday", document.reload.content["content"].last.dig("content", 0, "text")

    run_tool(@token, "replace_text", id: document.id, find: "Plan", replace: "Roadmap")
    assert_equal "Roadmap", document.reload.title

    run_tool(@token, "replace_text", id: document.id, find: " on Monday", replace: "")
    assert_equal "Ship it", document.reload.content["content"].last.dig("content", 0, "text")
    assert_match(/not found/, refused(@token, "replace_text", id: document.id, find: "Nowhere", replace: "x").message)
    assert_equal 3, AgentActivity.where(subject: document).count
  end

  # ---- tasks -----------------------------------------------------------------

  test "tasks are listed, created and updated, and the agent is the author" do
    document = make_document(@plans, "Plan")
    created = run_tool(@token, "create_task", title: "Draft the brief", document_id: document.id, due_date: "2026-12-31")
    assert_equal "backlog", created[:status]
    assert_equal document.id, created[:document_id]
    task = @space.tasks.find(created[:id])
    assert_equal @token, task.status_changes.first.agent_token

    updated = run_tool(@token, "update_task", id: task.id, status: "done", title: "Draft the brief v2")
    assert_equal "done", updated[:status]
    assert_equal "Draft the brief v2", task.reload.title
    assert_equal [ nil, "backlog" ], task.status_changes.map(&:from_status)
    assert_equal [ @token, @token ], task.status_changes.map(&:agent_token)
    assert_equal [ nil, nil ], task.status_changes.map(&:changed_by)

    assert_equal [ task.id ], run_tool(@token, "list_tasks", document_id: document.id).map { |t| t[:id] }
    assert_equal [ task.id ], run_tool(@token, "list_tasks", status: "done").map { |t| t[:id] }
    assert_empty run_tool(@token, "list_tasks", status: "todo")
    assert_equal %w[created_task updated_task], AgentActivity.order(:id).map(&:action)
  end

  test "task input is checked" do
    task = @space.tasks.create!(title: "T")
    assert_match(/Status must be one of/, refused(@token, "update_task", id: task.id, status: "finished").message)
    assert_match(/date like/, refused(@token, "update_task", id: task.id, due_date: "next week").message)
    assert_match(/Nothing to change/, refused(@token, "update_task", id: task.id).message)
    assert_match(/needs a title/, refused(@token, "create_task", title: "  ").message)
    assert_match(/too long/, refused(@token, "create_task", title: "x" * 501).message)
    assert_match(/before/i, refused(@token, "update_task", id: task.id, start_date: "2026-05-02", due_date: "2026-05-01").message)
    assert_equal 0, AgentActivity.count
  end

  test "tasks in another space or outside a folder token are not found" do
    foreign = @elsewhere.tasks.create!(title: "Foreign")
    outside = @space.tasks.create!(title: "Outside", folder: @other_folder)
    inside = @space.tasks.create!(title: "Inside", folder: @drafts)

    refused(@token, "update_task", id: foreign.id, status: "done")
    refused(@folder_token, "update_task", id: outside.id, status: "done")
    assert_equal "done", run_tool(@folder_token, "update_task", id: inside.id, status: "done")[:status]
    assert_equal [ inside.id ], run_tool(@folder_token, "list_tasks").map { |t| t[:id] }
    assert_equal "backlog", foreign.reload.status
  end

  test "a folder token must put a new task inside its folder" do
    assert_match(/limited to a folder/, refused(@folder_token, "create_task", title: "Loose").message)
    refused(@folder_token, "create_task", title: "Elsewhere", folder_id: @other_folder.id)
    refused(@folder_token, "create_task", title: "Their doc", document_id: make_document(@elsewhere_folder, "Theirs", by: @stranger).id)
    assert_equal @drafts.id, run_tool(@folder_token, "create_task", title: "Fine", folder_id: @drafts.id)[:folder_id]
  end

  test "dates follow the folder's dependency mode, and never move tasks outside a folder token" do
    @plans.update!(dependency_mode: :flexible)
    first = @space.tasks.create!(title: "A", folder: @plans, start_date: "2026-01-01", due_date: "2026-01-05")
    later = @space.tasks.create!(title: "B", folder: @other_folder, start_date: "2026-01-05", due_date: "2026-01-08")
    TaskDependency.create!(predecessor: first, successor: later)

    error = refused(@folder_token, "update_task", id: first.id, start_date: "2026-01-03", due_date: "2026-01-07")
    assert_match(/outside the folder/, error.message)
    assert_equal "2026-01-01", first.reload.start_date.to_s
    assert_equal "2026-01-05", later.reload.start_date.to_s

    run_tool(@token, "update_task", id: first.id, start_date: "2026-01-03", due_date: "2026-01-07")
    assert_equal "2026-01-07", later.reload.start_date.to_s
    assert_match(/moved 1 dependent task/, AgentActivity.last.summary)
  end

  # ---- Collections -------------------------------------------------------------

  test "Collection records are read and written, with relation and formula fields read only" do
    people = make_collection(@plans, "People")
    people.table_fields.create!(name: "Name", data_type: "text")
    people.table_fields.create!(name: "Age", data_type: "integer")
    people.table_fields.create!(name: "Double", data_type: "formula", formula: "{Age} * 2")
    people.table_fields.create!(name: "Company", data_type: "relation", relation_table: make_collection(@plans, "Companies"))

    added = run_tool(@token, "write_collection_record", id: people.id, values: { "Name" => "Ada", "Age" => 36 })
    changed = run_tool(@token, "write_collection_record", id: people.id, record_id: added[:record_id], values: { "Age" => 37, "Name" => nil })

    read = run_tool(@token, "read_collection", id: people.id)
    assert_equal %w[Name Age Double Company], read[:fields].map { |f| f[:name] }
    assert_equal [ true, true, false, false ], read[:fields].map { |f| f[:writable] }
    assert_equal [ { id: added[:record_id], values: { "Age" => 37 } } ], read[:records]
    assert_equal added[:record_id], changed[:record_id]
    assert_not read[:truncated]

    assert_match(/cannot be written/, refused(@token, "write_collection_record", id: people.id, values: { "Double" => 1 }).message)
    assert_match(/cannot be written/, refused(@token, "write_collection_record", id: people.id, values: { "Company" => 1 }).message)
    assert_match(/No field named/, refused(@token, "write_collection_record", id: people.id, values: { "Nope" => 1 }).message)
    assert_match(/Age/, refused(@token, "write_collection_record", id: people.id, values: { "Age" => "old" }).message)
    assert_equal 1, people.table_records.count
    assert_equal [ [ "wrote_record", people ] ] * 2, AgentActivity.order(:id).map { |a| [ a.action, a.subject ] }
  end

  test "Collections are scoped like documents" do
    theirs = make_collection(@elsewhere_folder, "Theirs", by: @stranger)
    outside = make_collection(@other_folder, "Outside")
    [ theirs, outside ].each do |table|
      table.table_fields.create!(name: "Name", data_type: "text")
      refused(@folder_token, "read_collection", id: table.id)
      refused(@folder_token, "write_collection_record", id: table.id, values: { "Name" => "x" })
    end
    refused(@token, "read_collection", id: theirs.id)
    refused(@token, "write_collection_record", id: theirs.id, values: { "Name" => "x" })
    assert_equal 0, TableRecord.count
    assert_equal "Name", run_tool(@token, "read_collection", id: outside.id)[:fields].first[:name]
  end

  test "a read-only token cannot write a record" do
    people = make_collection(@plans, "People")
    people.table_fields.create!(name: "Name", data_type: "text")
    refused(@readonly, "write_collection_record", id: people.id, values: { "Name" => "x" })
    assert_equal 0, TableRecord.count
    assert_equal [], run_tool(@readonly, "read_collection", id: people.id)[:records]
  end

  test "a failed write leaves nothing behind" do
    people = make_collection(@plans, "People")
    people.table_fields.create!(name: "Name", data_type: "text")
    people.table_fields.create!(name: "Age", data_type: "integer")
    refused(@token, "write_collection_record", id: people.id, values: { "Name" => "Ada", "Age" => "not a number" })
    assert_equal 0, TableRecord.count
    assert_equal 0, TableCell.count
    assert_equal 0, AgentActivity.count
  end
end
