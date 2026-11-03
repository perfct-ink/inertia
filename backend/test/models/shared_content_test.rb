require "test_helper"

class SharedContentTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada Lovelace", email: "ada-shared-content@example.com", password: "password123")
    @space = @user.workspace
    @folder = @space.folders.create!(name: "Plans", icon: "P")
  end

  def task_line_content
    {
      "type" => "doc",
      "content" => [
        { "type" => "heading", "attrs" => { "level" => 1 }, "content" => [ { "type" => "text", "text" => "Launch" } ] },
        { "type" => "workspaceTaskList", "content" => [
          { "type" => "workspaceTaskItem", "attrs" => { "taskId" => 42 }, "content" => [ { "type" => "paragraph" } ] }
        ] }
      ]
    }
  end

  test "task lines lose their task ids and everything else is kept" do
    content = SharedContent.public_content(task_line_content)

    item = content["content"][1]["content"][0]
    assert_equal({}, item["attrs"])
    assert_equal({ "level" => 1 }, content["content"][0]["attrs"])
    assert_equal "Launch", content["content"][0]["content"][0]["text"]
    assert_equal 42, task_line_content["content"][1]["content"][0]["attrs"]["taskId"], "the original isn't changed"
  end

  test "content that is not a document passes through" do
    assert_nil SharedContent.public_content(nil)
    assert_equal({}, SharedContent.public_content({}))
  end

  test "a document link shows the title and text, always view only, and nothing about people" do
    document = @folder.documents.create!(title: "Launch plan", content: task_line_content, created_by: @user)
    share = document.shares.create!(created_by: @user)

    payload = SharedContent.for(share)

    assert_equal "document", payload[:kind]
    assert_equal "view", payload[:access]
    assert_equal "Launch plan", payload[:resource][:document][:title]
    assert_equal [ :title, :doc_type, :content, :updated_at ], payload[:resource][:document].keys
    json = payload.to_json
    assert_not_includes json, "Ada"
    assert_not_includes json, "ada-shared-content"
    assert_not_includes json, "created_by"
    assert_not_includes json, "taskId"
  end

  test "an old edit link is still served view only" do
    document = @folder.documents.create!(title: "Old", created_by: @user)
    share = document.shares.create!(created_by: @user)
    share.update_column(:permission, Share.permissions[:edit])

    assert_equal "view", SharedContent.for(share.reload)[:access]
  end

  test "a folder link lists its documents and folders at any depth, but not archived or other kinds" do
    sub = @space.folders.create!(name: "Sub", parent: @folder)
    deeper = @space.folders.create!(name: "Deeper", parent: sub)
    gone = @space.folders.create!(name: "Gone", parent: @folder)
    @space.folders.create!(name: "Under gone", parent: gone)
    gone.archive!
    @space.folders.create!(name: "Elsewhere")
    top = @folder.documents.create!(title: "A top doc", created_by: @user)
    nested = deeper.documents.create!(title: "B nested doc", created_by: @user)
    @folder.documents.create!(title: "Sheet", doc_type: :spreadsheet, created_by: @user)
    gone.documents.create!(title: "Hidden", created_by: @user)
    share = @folder.shares.create!(created_by: @user)

    resource = SharedContent.for(share)[:resource]

    assert_equal({ id: @folder.id, name: "Plans", icon: "P" }, resource[:folder])
    assert_equal %w[Deeper Sub], resource[:folders].map { |f| f[:name] }.sort
    assert_equal [ top.id, nested.id ], resource[:documents].map { |d| d[:id] }
    assert_equal [ :id, :title, :folder_id, :updated_at ], resource[:documents].first.keys
    assert_equal false, resource[:truncated]
  end

  test "a document inside a folder link comes with its id and its text" do
    document = @folder.documents.create!(title: "Inside", content: task_line_content, created_by: @user)
    share = @folder.shares.create!(created_by: @user)

    payload = SharedContent.document(share, document)

    assert_equal "document", payload[:kind]
    assert_equal document.id, payload[:resource][:document][:id]
    assert_not_includes payload.to_json, "taskId"
  end

  test "a roadmap link is the roadmap" do
    share = @space.shares.create!(permission: :view, created_by: @user)

    payload = SharedContent.for(share)

    assert_equal "roadmap", payload[:kind]
    assert_equal @space.name, payload[:resource][:roadmap][:name]
  end
end
