require "test_helper"

class DocumentFeatureTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-docfeature@example.com", password: "password123")
    @workspace = @user.workspace
    @folder = @workspace.folders.create!(name: "Features", kind: :feature)
  end

  def doc(title, **attrs) = Document.create!({ title: title, folder: @folder, created_by: @user }.merge(attrs))

  test "a feature can nest under another, but not under itself or its own sub-feature" do
    parent = doc("Parent")
    child = doc("Child", parent_feature: parent)
    assert_equal [ child ], parent.sub_features.to_a

    parent.parent_feature = child
    assert_not parent.valid?
    parent.parent_feature = parent
    assert_not parent.valid?
  end

  test "the parent, epic, milestone and owner must be in this space" do
    other = User.create!(name: "O", email: "o-docfeature@example.com", password: "password123")
    foreign_doc = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    feature = doc("Feature")

    feature.parent_feature = foreign_doc
    assert_not feature.valid?
    feature.parent_feature = nil

    feature.epic = other.workspace.epics.create!(title: "E")
    assert_not feature.valid?
    feature.epic = nil
    feature.milestone = other.workspace.milestones.create!(title: "M")
    assert_not feature.valid?
    feature.milestone = nil
    feature.feature_owner = other
    assert_not feature.valid?
    feature.feature_owner = @user
    assert feature.valid?
  end

  test "deleting the parent feature keeps its sub-features as roots" do
    parent = doc("Parent")
    child = doc("Child", parent_feature: parent)
    parent.destroy
    assert_nil child.reload.parent_feature_id
  end

  test "features can belong to an epic and a milestone" do
    epic = @workspace.epics.create!(title: "Images")
    milestone = @workspace.milestones.create!(title: "Beta")
    feature = doc("Upload", epic: epic, milestone: milestone, feature_status: :done)
    assert_equal [ epic, milestone, "done" ], [ feature.reload.epic, feature.milestone, feature.feature_status ]
  end
end
