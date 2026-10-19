require "test_helper"

class IoNodeTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-io@example.com", password: "password123")
    @workspace = @user.workspace
    @goal = @workspace.io_nodes.create!(kind: :goal, title: "Be the default tool")
  end

  test "the map is goal, then csf, then nc" do
    csf = @workspace.io_nodes.create!(kind: :csf, title: "Fast", parent: @goal)
    assert @workspace.io_nodes.create!(kind: :nc, title: "Quick load", parent: csf).persisted?
    assert_not @workspace.io_nodes.build(kind: :nc, title: "x", parent: @goal).valid?
    assert_not @workspace.io_nodes.build(kind: :csf, title: "x").valid?
    assert_not @workspace.io_nodes.build(kind: :goal, title: "x", parent: csf).valid?
  end

  test "only one goal per space" do
    assert_not @workspace.io_nodes.build(kind: :goal, title: "Another").valid?
  end

  test "a title is required, links must be in this space, children go with their parent" do
    assert_not @workspace.io_nodes.build(kind: :csf, title: "", parent: @goal).valid?
    other = User.create!(name: "O", email: "o-io@example.com", password: "password123")
    foreign = other.workspace.objectives.create!(title: "Theirs")
    assert_not @workspace.io_nodes.build(kind: :csf, title: "x", parent: @goal, objective: foreign).valid?

    csf = @workspace.io_nodes.create!(kind: :csf, title: "Fast", parent: @goal)
    @workspace.io_nodes.create!(kind: :nc, title: "Quick", parent: csf)
    assert_difference "IoNode.count", -2 do
      csf.destroy
    end
  end

  test "progress comes from a linked objective or initiative, else the average of what is below" do
    objective = @workspace.objectives.create!(title: "Grow")
    objective.key_results.create!(title: "Users", target_value: 100, current_value: 50)
    initiative = @workspace.initiatives.create!(title: "Launch")
    csf_a = @workspace.io_nodes.create!(kind: :csf, title: "A", parent: @goal, objective: objective)
    csf_b = @workspace.io_nodes.create!(kind: :csf, title: "B", parent: @goal, initiative: initiative)
    csf_c = @workspace.io_nodes.create!(kind: :csf, title: "C", parent: @goal)

    progress = IoMap.progress_by_id(@workspace)
    assert_equal 50, progress[csf_a.id]
    assert_equal 0, progress[csf_b.id]
    assert_nil progress[csf_c.id]
    assert_equal 25, progress[@goal.id]
  end
end
