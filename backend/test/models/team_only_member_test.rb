require "test_helper"

class TeamOnlyMemberTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(name: "Owner", email: "tom-owner@example.com", password: "password123")
    @ada = User.create!(name: "ada", email: "tom-ada@example.com", password: "password123")
    @bo = User.create!(name: "Bo", email: "tom-bo@example.com", password: "password123")
    @space = Workspace.create!(name: "Space", user: @owner)
    @other = Workspace.create!(name: "Other", user: @owner)
    @design = @space.teams.create!(name: "Design", role: :member)
    @writers = @space.teams.create!(name: "writers", role: :viewer)
  end

  test "lists people who are on a team but have no membership, by name, with every team" do
    @design.memberships.create!(user: @bo)
    @writers.memberships.create!(user: @bo)
    @writers.memberships.create!(user: @ada)

    people = TeamOnlyMember.in(@space)
    assert_equal %w[ada Bo], people.map { |p| p.user.name }
    assert_equal [ "writers" ], people.first.teams.map(&:name)
    assert_equal %w[Design writers], people.last.teams.map(&:name)
  end

  test "the role is the highest of their teams" do
    @design.memberships.create!(user: @bo)
    @writers.memberships.create!(user: @bo)
    @writers.memberships.create!(user: @ada)

    roles = TeamOnlyMember.in(@space).to_h { |p| [ p.user.name, p.role ] }
    assert_equal({ "ada" => "viewer", "Bo" => "member" }, roles)
  end

  test "leaves out owners and members, and people on teams of other spaces" do
    @design.memberships.create!(user: @owner)
    @space.memberships.create!(user: @ada, role: :viewer)
    @writers.memberships.create!(user: @ada)
    @other.teams.create!(name: "Elsewhere").memberships.create!(user: @bo)

    assert_empty TeamOnlyMember.in(@space)
  end

  test "a person is listed once their own membership is gone" do
    membership = @space.memberships.create!(user: @ada, role: :admin)
    @writers.memberships.create!(user: @ada)
    assert_empty TeamOnlyMember.in(@space)

    membership.destroy!
    person = TeamOnlyMember.in(@space).sole
    assert_equal [ "viewer", @ada ], [ person.role, person.user ]
  end
end
