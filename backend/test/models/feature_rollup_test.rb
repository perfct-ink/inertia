require "test_helper"

class FeatureRollupTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-features-rollup@example.com", password: "password123")
    @workspace = @user.workspace
    @project = @workspace.folders.create!(name: "Messages", kind: :project)
    @features = @workspace.folders.create!(name: "Features", kind: :feature, parent: @project)
    @plain = @workspace.folders.create!(name: "Notes", parent: @project)
  end

  def feature(title, parent: nil, folder: @features, **attrs)
    Document.create!({ title: title, folder: folder, created_by: @user, parent_feature: parent }.merge(attrs))
  end

  def task(document, status = :todo)
    @workspace.tasks.create!(title: "t", document: document, status: status)
  end

  test "lists the documents of feature folders nested by parent, with sub-feature tasks included" do
    images = feature("Background images")
    upload = feature("Upload", parent: images)
    crop = feature("Crop", parent: upload)
    other = feature("Search")
    task(images, :done)
    task(upload, :done); task(upload)
    task(crop, :done)

    rows = FeatureRollup.for(@project)
    assert_equal [ "Background images", "Upload", "Crop", "Search" ], rows.map { |r| r.document.title }
    assert_equal [ 0, 1, 2, 0 ], rows.map(&:depth)
    by_title = rows.index_by { |r| r.document.title }
    assert_equal [ 4, 3, 75 ], [ by_title["Background images"].tasks_count, by_title["Background images"].done_tasks_count, by_title["Background images"].percent ]
    assert_equal [ 3, 2 ], [ by_title["Upload"].tasks_count, by_title["Upload"].done_tasks_count ]
    assert_equal [ 1, 1 ], [ by_title["Crop"].tasks_count, by_title["Crop"].done_tasks_count ]
    assert_equal 0, by_title["Search"].tasks_count
    assert other.persisted?
  end

  test "documents outside feature folders, and spreadsheets, are not features" do
    feature("Meeting notes", folder: @plain)
    Document.create!(title: "Budget", doc_type: :spreadsheet, folder: @features, created_by: @user)
    assert_empty FeatureRollup.for(@project)
  end

  test "status is derived from tasks unless set by hand" do
    planned = feature("A")
    started = feature("B"); task(started, :done); task(started)
    finished = feature("C"); task(finished, :done)
    manual = feature("D", feature_status: :active)

    status = FeatureRollup.for(@project).to_h { |r| [ r.document.title, [ r.status, r.status_derived ] ] }
    assert_equal [ "planned", true ], status["A"]
    assert_equal [ "active", true ], status["B"]
    assert_equal [ "done", true ], status["C"]
    assert_equal [ "active", false ], status["D"]
    assert planned.persisted? && manual.persisted?
  end

  test "a feature whose parent is outside the set is a root" do
    outside = feature("Elsewhere", folder: @plain)
    child = feature("Child", parent: outside)
    rows = FeatureRollup.for(@project)
    assert_equal [ [ "Child", 0 ] ], rows.map { |r| [ r.document.title, r.depth ] }
    assert child.persisted?
  end
end
