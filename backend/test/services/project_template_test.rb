require "test_helper"

class ProjectTemplateTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "ptemplate-ada@example.com", password: "password123")
    @space = @user.workspace
    @project = @space.folders.create!(name: "Album", kind: :project)
  end

  def line(text, task_id: nil)
    { "type" => "workspaceTaskItem", "attrs" => { "taskId" => task_id }, "content" => [ { "type" => "paragraph", "content" => [ { "type" => "text", "text" => text } ] } ] }
  end

  def doc_with(*lines)
    { "type" => "doc", "content" => [ { "type" => "workspaceTaskList", "content" => lines } ] }
  end

  test "clean keeps only what a template holds and fills in the defaults" do
    template = ProjectTemplate.clean(
      "documents" => [ { title: " Plan ", content: doc_with(line("Mix")), extra: "dropped" } ],
      "collections" => [ { "title" => "Tracks", "fields" => [ { "name" => "Title", "data_type" => "text" } ] } ],
      "tasks" => [ { "title" => "Master", "status" => "done" } ],
      "other" => 1
    )

    assert_equal %w[collections documents tasks], template.keys.sort
    assert_equal [ { "title" => "Plan", "doc_type" => "document", "content" => doc_with(line("Mix")) } ], template["documents"]
    assert_equal [ { "title" => "Tracks", "fields" => [ { "name" => "Title", "data_type" => "text" } ] } ], template["collections"]
    assert_equal [ { "title" => "Master" } ], template["tasks"]
    assert_equal({ "documents" => [], "collections" => [], "tasks" => [] }, ProjectTemplate.clean(nil))
  end

  test "clean unlinks checklist lines from the tasks they made elsewhere" do
    template = ProjectTemplate.clean("documents" => [ { "title" => "Plan", "content" => doc_with(line("Mix", task_id: 42)) } ])
    assert_nil template["documents"].first["content"]["content"].first["content"].first["attrs"]["taskId"]
  end

  test "clean rejects a template that is not one, with a reason" do
    {
      "a string" => "oops",
      "documents that are not a list" => { "documents" => "oops" },
      "a document without a title" => { "documents" => [ { "title" => " " } ] },
      "a document of another type" => { "documents" => [ { "title" => "Report", "doc_type" => "table" } ] },
      "document content that is not an object" => { "documents" => [ { "title" => "Plan", "content" => [ 1 ] } ] },
      "a task without a title" => { "tasks" => [ { "title" => "" } ] },
      "a task that is not an object" => { "tasks" => [ "Mix" ] },
      "a field of an unknown type" => { "collections" => [ { "title" => "T", "fields" => [ { "name" => "Link", "data_type" => "relation" } ] } ] },
      "a field without a name" => { "collections" => [ { "title" => "T", "fields" => [ { "data_type" => "text" } ] } ] },
      "two fields with one name" => { "collections" => [ { "title" => "T", "fields" => [ { "name" => "A", "data_type" => "text" }, { "name" => "A", "data_type" => "number" } ] } ] }
    }.each do |what, raw|
      assert_raises(ProjectTemplate::Invalid, what) { ProjectTemplate.clean(raw) }
    end
  end

  test "clean limits the size of a template" do
    assert_raises(ProjectTemplate::Invalid) { ProjectTemplate.clean("tasks" => Array.new(ProjectTemplate::MAX_TASKS + 1) { { "title" => "x" } }) }
    assert_raises(ProjectTemplate::Invalid) { ProjectTemplate.clean("documents" => Array.new(ProjectTemplate::MAX_DOCUMENTS + 1) { { "title" => "x" } }) }
    assert_raises(ProjectTemplate::Invalid) { ProjectTemplate.clean("tasks" => [ { "title" => "x" * (ProjectTemplate::MAX_TITLE + 1) } ]) }
    assert_raises(ProjectTemplate::Invalid) { ProjectTemplate.clean("documents" => [ { "title" => "Big", "content" => { "text" => "x" * (ProjectTemplate::MAX_BYTES + 1) } } ]) }
  end

  test "the field types a template carries are Collection field types" do
    assert_empty ProjectTemplate::FIELD_TYPES - TableField::DATA_TYPES
    assert_empty ProjectTemplate::DOCUMENT_TYPES - Document.doc_types.keys
  end

  test "apply creates the documents, Collections and tasks in the project" do
    ProjectTemplate.apply(
      {
        "documents" => [ { "title" => "Song", "content" => doc_with(line("Write")) }, { "title" => "Budget", "doc_type" => "spreadsheet" } ],
        "collections" => [ { "title" => "Tracks", "fields" => [ { "name" => "Title", "data_type" => "text" }, { "name" => "Length", "data_type" => "number" } ] } ],
        "tasks" => [ { "title" => "Record" }, { "title" => "Master" } ]
      },
      folder: @project, user: @user
    )

    documents = @project.documents.order(:id)
    assert_equal %w[Song Budget Tracks], documents.map(&:title)
    assert_equal %w[document spreadsheet table], documents.map(&:doc_type)
    assert_equal @user, documents.first.created_by
    assert_equal doc_with(line("Write")), documents.first.content
    assert_equal [ [ "Title", "text" ], [ "Length", "number" ] ], documents.last.table_fields.order(:id).pluck(:name, :data_type)
    assert_equal [ "Record", "Master" ], @space.tasks.where(folder_id: @project.id).pluck(:title)
    assert_equal [ 0, 1 ], @space.tasks.where(folder_id: @project.id).pluck(:position)
  end

  test "snapshot takes the documents, Collection fields and top-level project tasks, flattening subfolders" do
    nested = @space.folders.create!(name: "Artwork", parent: @project)
    song = @project.documents.create!(title: "Song", created_by: @user, content: doc_with(line("Write", task_id: 7)))
    nested.documents.create!(title: "Cover brief", created_by: @user)
    @project.documents.create!(title: "Budget", doc_type: :spreadsheet, created_by: @user)
    tracks = @project.documents.create!(title: "Tracks", doc_type: :table, created_by: @user)
    tracks.table_fields.create!(name: "Title", data_type: "text")
    tracks.table_fields.create!(name: "Doc", data_type: "file")
    tracks.table_records.create!
    @space.tasks.create!(title: "Record", folder: @project, position: 1)
    parent_task = @space.tasks.create!(title: "Mix", folder: nested, position: 0)
    @space.tasks.create!(title: "A subtask", folder: nested, parent: parent_task)
    @space.tasks.create!(title: "From the song", document: song)
    @space.tasks.create!(title: "Elsewhere")

    template = ProjectTemplate.snapshot(@project)

    assert_equal [ "Song", "Cover brief", "Budget" ], template["documents"].map { |d| d["title"] }
    assert_equal [ "document", "document", "spreadsheet" ], template["documents"].map { |d| d["doc_type"] }
    assert_nil template["documents"].first["content"]["content"].first["content"].first["attrs"]["taskId"]
    assert_equal [ { "title" => "Tracks", "fields" => [ { "name" => "Title", "data_type" => "text" } ] } ], template["collections"]
    assert_equal [ "Mix", "Record" ], template["tasks"].map { |t| t["title"] }
  end

  test "snapshot refuses a project with more than a template can hold" do
    (ProjectTemplate::MAX_DOCUMENTS + 1).times { |i| @project.documents.create!(title: "Doc #{i}", created_by: @user) }
    assert_raises(ProjectTemplate::Invalid) { ProjectTemplate.snapshot(@project) }
  end
end
