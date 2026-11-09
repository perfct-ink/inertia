require "test_helper"

class WorkspaceFeaturesTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-features@example.com", password: "password123")
    @workspace = @user.workspace
  end

  test "a Space that never chose shows every feature" do
    assert_nil @workspace.features
    assert_equal Workspace::FEATURES, @workspace.enabled_features
    assert @workspace.feature_enabled?(:sprints)
  end

  test "the keys are the ones the rail uses, in its order" do
    assert_equal %w[
      events roadmap timeline milestones initiatives epics sprints hierarchy
      okrs objectives_map ideas resources workload
    ], Workspace::FEATURES
  end

  test "choosing features turns the others off, and the order stays the canonical one" do
    @workspace.update!(features: %w[roadmap events])
    assert_equal %w[events roadmap], @workspace.enabled_features
    assert @workspace.feature_enabled?("roadmap")
    assert_not @workspace.feature_enabled?("sprints")
  end

  test "an empty list turns every optional page off" do
    @workspace.update!(features: [])
    assert_empty @workspace.enabled_features
    assert_not @workspace.feature_enabled?(:events)
  end

  test "choosing every feature is stored as the default, so a page added later still shows" do
    @workspace.update!(features: Workspace::FEATURES.reverse)
    assert_nil @workspace.reload.features
  end

  test "unknown features and non-lists are rejected" do
    @workspace.features = %w[sprints teleporters]
    assert_not @workspace.valid?
    assert @workspace.errors[:features].any?

    @workspace.features = "sprints"
    assert_not @workspace.valid?
  end

  test "turning a feature off deletes nothing" do
    sprint = @workspace.sprints.create!(title: "S1")
    @workspace.update!(features: %w[events])
    assert_equal sprint, @workspace.sprints.first
    @workspace.update!(features: nil)
    assert_equal sprint, @workspace.sprints.first
  end
end
