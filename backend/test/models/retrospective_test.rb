require "test_helper"

class RetrospectiveTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-retro@example.com", password: "password123")
    @workspace = @user.workspace
    @retro = @workspace.retrospectives.create!(title: "Sprint 1 retro")
  end

  test "starts on the went well template with its three columns" do
    assert_equal "went_well", @retro.template
    assert_equal %w[went_well to_improve action_items], @retro.columns
  end

  test "every template ends with the action items column" do
    Retrospective::TEMPLATES.each do |name, columns|
      assert_equal Retrospective::ACTION_COLUMN, columns.last, "#{name} has no action items column"
      assert_equal columns.uniq, columns
    end
  end

  test "needs a title and a known template" do
    assert_not @workspace.retrospectives.build(title: "").valid?
    assert_not @workspace.retrospectives.build(title: "x", template: "nope").valid?
    assert @workspace.retrospectives.build(title: "x", template: "four_ls").valid?
  end

  test "the template cannot change after the board is created" do
    assert_not @retro.update(template: "mad_sad_glad")
    assert_includes @retro.errors.full_messages.join, "Template"
    assert @retro.reload.update(title: "Renamed")
    assert_equal "went_well", @retro.template
  end

  test "the sprint must belong to the same workspace" do
    other = User.create!(name: "O", email: "o-retro@example.com", password: "password123")
    foreign = other.workspace.sprints.create!(title: "Theirs")
    assert_not @workspace.retrospectives.build(title: "x", sprint: foreign).valid?
    assert @workspace.retrospectives.build(title: "x", sprint: @workspace.sprints.create!(title: "Mine")).valid?
  end

  test "a card must sit in one of the template's columns and have text" do
    assert @retro.cards.build(column_key: "went_well", body: "Shipped on time").valid?
    assert_not @retro.cards.build(column_key: "start", body: "Wrong template").valid?
    assert_not @retro.cards.build(column_key: "went_well", body: " ").valid?
    assert_not @retro.cards.build(column_key: "went_well", body: "x" * (RetroCard::MAX_BODY_LENGTH + 1)).valid?
  end

  test "counts cards and the ones already turned into tasks" do
    @retro.cards.create!(column_key: "went_well", body: "a")
    action = @retro.cards.create!(column_key: "action_items", body: "b")
    action.create_task(@workspace)
    @retro.reload
    assert_equal 2, @retro.cards_count
    assert_equal 1, @retro.tasks_count
  end

  test "only an action item becomes a task, and only once" do
    plain = @retro.cards.create!(column_key: "went_well", body: "Nice")
    assert_nil plain.create_task(@workspace)
    assert_includes plain.errors.full_messages, "Only action items can become tasks"

    action = @retro.cards.create!(column_key: "action_items", body: "  Write the\nrunbook  ")
    task = action.create_task(@workspace)
    assert_equal "Write the runbook", task.title
    assert_equal "  Write the\nrunbook  ", task.description
    assert task.backlog?
    assert_equal task, action.reload.task

    assert_nil action.create_task(@workspace)
    assert_includes action.errors.full_messages, "This action item already has a task"
    assert_equal 1, @workspace.tasks.where(title: "Write the runbook").count
  end

  test "a short one-line action item has no separate description" do
    card = @retro.cards.create!(column_key: "action_items", body: "Fix flaky test")
    task = card.create_task(@workspace)
    assert_nil task.description
  end

  test "deleting the task frees the card to make another" do
    card = @retro.cards.create!(column_key: "action_items", body: "Fix flaky test")
    card.create_task(@workspace).destroy
    assert_nil card.reload.task_id
    assert card.create_task(@workspace)
  end

  test "deleting the board deletes its cards and votes" do
    card = @retro.cards.create!(column_key: "went_well", body: "a")
    card.votes.create!(user: @user)
    assert_difference [ "RetroCard.count", "RetroVote.count" ], -1 do
      @retro.destroy
    end
  end

  test "one vote per person per card" do
    card = @retro.cards.create!(column_key: "went_well", body: "a")
    card.votes.create!(user: @user)
    assert_not card.votes.build(user: @user).valid?
    assert card.reload.voted_by?(@user.id)
    assert_equal 1, card.votes_count
  end

  test "deleting the sprint keeps the board" do
    sprint = @workspace.sprints.create!(title: "S")
    retro = @workspace.retrospectives.create!(title: "R", sprint: sprint)
    sprint.destroy
    assert_nil retro.reload.sprint_id
  end

  test "a board can be filed in a project of its own space only" do
    other = User.create!(name: "O2", email: "o2-retro@example.com", password: "password123")
    foreign = other.workspace.folders.create!(name: "Theirs", kind: :project)
    project = @workspace.folders.create!(name: "Mine", kind: :project)
    assert_not @workspace.retrospectives.build(title: "x", folder: foreign).valid?
    assert @workspace.retrospectives.build(title: "x", folder: project).valid?
  end

  test "deleting the project keeps the board, which becomes Space-wide" do
    project = @workspace.folders.create!(name: "Mine", kind: :project)
    retro = @workspace.retrospectives.create!(title: "R", folder: project)
    project.destroy
    assert_nil retro.reload.folder_id
  end

  test "the task is filed in the board's project and records who made it" do
    project = @workspace.folders.create!(name: "Mine", kind: :project)
    card = @workspace.retrospectives.create!(title: "R", folder: project).cards.create!(column_key: "action_items", body: "Fix flaky test")
    task = card.create_task(@workspace, @user)
    assert_equal project.id, task.folder_id
    assert_equal @user, task.status_changes.first.changed_by
  end
end
