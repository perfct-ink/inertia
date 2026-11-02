require "test_helper"

class TeamTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(name: "Owner", email: "team-owner@example.com", password: "password123")
    @ada = User.create!(name: "Ada", email: "team-ada@example.com", password: "password123")
    @bo = User.create!(name: "Bo", email: "team-bo@example.com", password: "password123")
    @space = Workspace.create!(name: "Space", user: @owner)
    @other_space = Workspace.create!(name: "Other", user: @owner)
  end

  def team_with(user, role:, workspace: @space, name: "Design")
    workspace.teams.create!(name: name, role: role).tap { |team| team.memberships.create!(user: user) }
  end

  test "a team needs a name that is unique in its space, ignoring case and spacing" do
    @space.teams.create!(name: "Design")
    assert_not @space.teams.new(name: "").valid?
    duplicate = @space.teams.new(name: "  design ")
    assert_not duplicate.valid?
    assert_equal "design", duplicate.name
    assert @other_space.teams.new(name: "Design").valid?
  end

  test "a team can be a viewer, member or admin but never an owner" do
    assert_equal %w[viewer member admin], Team::ROLES
    assert @space.teams.new(name: "A", role: :admin).valid?
    assert_not @space.teams.new(name: "B", role: "owner").valid?
    assert @space.teams.create!(name: "C").member?
  end

  test "a personal space cannot have teams" do
    team = @owner.workspace.teams.new(name: "Solo")
    assert_not team.valid?
    assert_includes team.errors.full_messages, "A personal space cannot have teams"
  end

  test "a person is on a team once" do
    team = team_with(@ada, role: :member)
    assert_not team.memberships.new(user: @ada).valid?
  end

  test "deleting a team removes its memberships and deleting a space removes its teams" do
    team = team_with(@ada, role: :member)
    assert_difference -> { TeamMembership.count }, -1 do
      team.destroy!
    end

    team_with(@bo, role: :viewer, workspace: @other_space)
    assert_difference [ -> { Team.count }, -> { TeamMembership.count } ], -1 do
      @other_space.destroy!
    end
  end

  test "a team gives its people access to the space without a membership" do
    assert_not_includes @ada.accessible_workspaces, @space
    assert_not @space.accessible_by?(@ada.id)

    team_with(@ada, role: :viewer)
    assert_includes @ada.accessible_workspaces, @space
    assert @space.accessible_by?(@ada.id)
    assert_not @space.accessible_by?(@bo.id)
    assert_not_includes @ada.accessible_workspaces, @other_space
  end

  test "access takes the highest role from the person's membership and every team" do
    @space.memberships.create!(user: @ada, role: :viewer)
    team_with(@ada, role: :member)
    @space.teams.create!(name: "Leads", role: :admin).memberships.create!(user: @ada)
    team_with(@bo, role: :member, workspace: @other_space)

    access = WorkspaceAccess.for(@ada)
    assert_equal [ @space.id, @ada.workspace.id ].sort, access.keys.sort
    assert access[@space.id].admin?
    assert access[@space.id].can_manage?
    assert access[@ada.workspace.id].owner?

    assert_equal "member", WorkspaceAccess.for(@bo)[@other_space.id].role
  end

  test "a stronger membership is not lowered by a weaker team" do
    @space.memberships.create!(user: @ada, role: :admin)
    team_with(@ada, role: :viewer)
    assert WorkspaceAccess.for(@ada)[@space.id].can_manage?
  end

  test "leaving every team takes the access away" do
    team = team_with(@ada, role: :member)
    assert WorkspaceAccess.for(@ada)[@space.id].can_write?

    team.memberships.destroy_all
    assert_nil WorkspaceAccess.for(@ada)[@space.id]
  end

  test "a viewer team can read but not write" do
    team_with(@ada, role: :viewer)
    access = WorkspaceAccess.for(@ada)[@space.id]
    assert access.viewer?
    assert_not access.can_write?
    assert_not access.can_manage?
  end

  test "an initiative can be owned by someone who is only on a team" do
    assert_not @space.initiatives.new(title: "Launch", owner: @ada).valid?

    team_with(@ada, role: :member)
    assert @space.initiatives.new(title: "Launch", owner: @ada).valid?
  end
end
