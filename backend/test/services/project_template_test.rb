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

    assert_equal %w[collections documents folders tasks], template.keys.sort
    assert_equal [ { "title" => "Plan", "doc_type" => "document", "content" => doc_with(line("Mix")), "folder" => nil } ], template["documents"]
    assert_equal [ { "title" => "Tracks", "fields" => [ { "name" => "Title", "data_type" => "text" } ], "folder" => nil } ], template["collections"]
    assert_equal [ { "title" => "Master", "folder" => nil } ], template["tasks"]
    assert_equal({ "folders" => [], "documents" => [], "collections" => [], "tasks" => [] }, ProjectTemplate.clean(nil))
  end

  test "clean keeps the folders and where things sit in them" do
    template = ProjectTemplate.clean(
      "folders" => [ { "name" => "Artwork" }, { "name" => " Drafts ", "parent" => 0 } ],
      "documents" => [ { "title" => "Brief", "folder" => 1 } ],
      "collections" => [ { "title" => "Tracks", "folder" => 0 } ],
      "tasks" => [ { "title" => "Sketch", "folder" => 1 }, { "title" => "Ship" } ]
    )

    assert_equal [ { "name" => "Artwork", "parent" => nil }, { "name" => "Drafts", "parent" => 0 } ], template["folders"]
    assert_equal [ 1 ], template["documents"].map { |d| d["folder"] }
    assert_equal [ 0 ], template["collections"].map { |c| c["folder"] }
    assert_equal [ 1, nil ], template["tasks"].map { |t| t["folder"] }
  end

  test "clean replaces embedded files and images with paragraphs, so a template carries no files" do
    content = {
      "type" => "doc",
      "content" => [
        { "type" => "paragraph", "content" => [ { "type" => "text", "text" => "Demo" } ] },
        { "type" => "audio", "attrs" => { "src" => "/uploads/demo.wav", "name" => "demo.wav" } },
        { "type" => "fileAttachment", "attrs" => { "src" => "/uploads/cover.pdf", "name" => " " } },
        { "type" => "blockquote", "content" => [ { "type" => "image", "attrs" => { "src" => "/uploads/cover.png" } } ] },
        { "type" => "video", "attrs" => { "src" => "/uploads/clip.mp4" } }
      ]
    }

    cleaned = ProjectTemplate.clean("documents" => [ { "title" => "Notes", "content" => content } ]).dig("documents", 0, "content", "content")

    assert_equal "Demo", cleaned[0].dig("content", 0, "text")
    assert_equal({ "type" => "paragraph", "content" => [ { "type" => "text", "text" => "demo.wav" } ] }, cleaned[1])
    assert_equal({ "type" => "paragraph" }, cleaned[2])
    assert_equal [ { "type" => "paragraph" } ], cleaned[3]["content"]
    assert_equal({ "type" => "paragraph" }, cleaned[4])
    assert_no_match(/uploads/, cleaned.to_json)
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
      "a folder without a name" => { "folders" => [ { "name" => " " } ] },
      "a folder whose parent is not a position" => { "folders" => [ { "name" => "A", "parent" => "x" } ] },
      "a folder that is its own parent" => { "folders" => [ { "name" => "A", "parent" => 0 } ] },
      "a folder whose parent comes after it" => { "folders" => [ { "name" => "A", "parent" => 1 }, { "name" => "B" } ] },
      "folders nested too deep" => { "folders" => (0...ProjectTemplate::MAX_DEPTH + 1).map { |i| { "name" => "L#{i}", "parent" => i.zero? ? nil : i - 1 } } },
      "a document in a folder that is not listed" => { "folders" => [ { "name" => "A" } ], "documents" => [ { "title" => "Doc", "folder" => 1 } ] },
      "a task in a folder with no folders listed" => { "tasks" => [ { "title" => "Mix", "folder" => 0 } ] },
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
    assert_raises(ProjectTemplate::Invalid) { ProjectTemplate.clean("folders" => Array.new(ProjectTemplate::MAX_FOLDERS + 1) { { "name" => "x" } }) }
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

  test "apply makes the subfolders and puts documents, Collections and tasks in them" do
    ProjectTemplate.apply(
      {
        "folders" => [ { "name" => "Artwork" }, { "name" => "Drafts", "parent" => 0 } ],
        "documents" => [ { "title" => "Song" }, { "title" => "Cover brief", "folder" => 1 } ],
        "collections" => [ { "title" => "Credits", "folder" => 0, "fields" => [ { "name" => "Who", "data_type" => "text" } ] } ],
        "tasks" => [ { "title" => "Ship" }, { "title" => "Sketch", "folder" => 1 } ]
      },
      folder: @project, user: @user
    )

    artwork = @project.children.find_by!(name: "Artwork")
    drafts = artwork.children.find_by!(name: "Drafts")
    assert_equal [ "Song" ], @project.documents.pluck(:title)
    assert_equal [ "Cover brief" ], drafts.documents.pluck(:title)
    assert_equal [ "Credits" ], artwork.documents.pluck(:title)
    assert_equal "table", artwork.documents.first.doc_type
    assert_equal [ [ "Ship", @project.id ], [ "Sketch", drafts.id ] ], @space.tasks.order(:position).pluck(:title, :folder_id)
    assert_equal [ "folder" ], [ artwork, drafts ].map(&:kind).uniq
  end

  test "snapshot takes the subfolders, documents, Collection fields and project tasks, each where it sits" do
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

    assert_equal [ { "name" => "Artwork", "parent" => nil } ], template["folders"]
    assert_equal [ "Song", "Cover brief", "Budget" ], template["documents"].map { |d| d["title"] }
    assert_equal [ nil, 0, nil ], template["documents"].map { |d| d["folder"] }
    assert_equal [ "document", "document", "spreadsheet" ], template["documents"].map { |d| d["doc_type"] }
    assert_nil template["documents"].first["content"]["content"].first["content"].first["attrs"]["taskId"]
    assert_equal [ { "title" => "Tracks", "fields" => [ { "name" => "Title", "data_type" => "text" } ], "folder" => nil } ], template["collections"]
    assert_equal [ [ "Mix", 0 ], [ "Record", nil ] ], template["tasks"].map { |t| [ t["title"], t["folder"] ] }
  end

  test "snapshot leaves out people, dates, statuses, records, files and archived subfolders" do
    ada = @user
    bob = User.create!(name: "Bob", email: "ptemplate-bob@example.com", password: "password123")
    @space.memberships.create!(user: bob, role: :member)
    @project.update!(owner: ada, start_date: Date.new(2026, 1, 1), target_date: Date.new(2026, 6, 1))
    @space.tasks.create!(title: "Record", folder: @project, assignee: bob, status: :done, due_date: Date.new(2026, 2, 1))
    tracks = @project.documents.create!(title: "Tracks", doc_type: :table, created_by: bob)
    field = tracks.table_fields.create!(name: "Title", data_type: "text")
    record = tracks.table_records.create!
    TableCell.create!(table_record_id: record.id, table_field_id: field.id, value: "Intro")
    @project.documents.create!(title: "Cover.png", doc_type: :file, created_by: bob)
    old = @space.folders.create!(name: "Old", parent: @project, archived_at: Time.current)
    old.documents.create!(title: "Old notes", created_by: ada)
    @space.tasks.create!(title: "Old task", folder: old)

    template = ProjectTemplate.snapshot(@project)

    assert_equal [], template["folders"]
    assert_equal [], template["documents"]
    assert_equal [ "Tracks" ], template["collections"].map { |c| c["title"] }
    assert_equal [ { "title" => "Record", "folder" => nil } ], template["tasks"]
    refute_match(/Intro|Bob|bob|2026|done/, template.to_json)
  end

  test "snapshot then apply makes a copy of the structure in another project" do
    nested = @space.folders.create!(name: "Artwork", parent: @project)
    nested.documents.create!(title: "Cover brief", created_by: @user)
    @space.tasks.create!(title: "Sketch", folder: nested)
    copy = @space.folders.create!(name: "Second album", kind: :project)

    ProjectTemplate.apply(ProjectTemplate.snapshot(@project), folder: copy, user: @user)

    again = copy.children.find_by!(name: "Artwork")
    assert_equal [ "Cover brief" ], again.documents.pluck(:title)
    assert_equal [ "Sketch" ], @space.tasks.where(folder_id: again.id).pluck(:title)
    assert_not_equal nested.id, again.id
  end

  test "snapshot refuses a project with more than a template can hold" do
    (ProjectTemplate::MAX_DOCUMENTS + 1).times { |i| @project.documents.create!(title: "Doc #{i}", created_by: @user) }
    assert_raises(ProjectTemplate::Invalid) { ProjectTemplate.snapshot(@project) }
  end
end
