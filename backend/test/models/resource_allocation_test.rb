require "test_helper"

class ResourceAllocationTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(name: "Pat", email: "pat-alloc@example.com", password: "password123")
    @teammate = User.create!(name: "Sam", email: "sam-alloc@example.com", password: "password123")
    @stranger = User.create!(name: "Stranger", email: "stranger-alloc@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @teammate, role: :member)
    @project = @team.folders.create!(name: "Messages", kind: :project)
  end

  def allocation(**attrs)
    @team.resource_allocations.new({ user: @teammate, folder: @project, hours_per_week: 12.5 }.merge(attrs))
  end

  test "a member can be allocated hours a week to a project, with or without dates" do
    record = allocation
    assert record.save
    assert_equal 12.5, record.reload.hours_per_week.to_f
    assert allocation(start_date: Date.new(2026, 11, 2), end_date: Date.new(2026, 12, 4)).valid?
  end

  test "hours a week must be above zero and no more than a week has" do
    assert_not allocation(hours_per_week: 0).valid?
    assert_not allocation(hours_per_week: -4).valid?
    assert_not allocation(hours_per_week: 169).valid?
    assert_not allocation(hours_per_week: nil).valid?
    assert allocation(hours_per_week: 168).valid?
  end

  test "the end date cannot be before the start date" do
    record = allocation(start_date: Date.new(2026, 12, 4), end_date: Date.new(2026, 11, 2))
    assert_not record.valid?
    assert_includes record.errors[:end_date], "can't be before the start date"
  end

  test "the person must be a member of the space" do
    record = allocation(user: @stranger)
    assert_not record.valid?
    assert_includes record.errors[:user], "must be a member of the space"
  end

  test "the project must be a project in the same space" do
    plain = @team.folders.create!(name: "Notes")
    record = allocation(folder: plain)
    assert_not record.valid?
    assert_includes record.errors[:folder], "must be a project"

    foreign = @owner.workspace.folders.create!(name: "Elsewhere", kind: :project)
    record = allocation(folder: foreign)
    assert_not record.valid?
    assert_includes record.errors[:folder], "must belong to the same workspace"
  end

  test "a project turned back into a folder keeps its allocations and they stay editable" do
    record = allocation
    record.save!
    @project.update!(kind: :folder)
    assert record.reload.update(hours_per_week: 8)
    assert_not allocation.valid?
  end

  test "deleting the project removes its allocations" do
    allocation.save!
    assert_difference -> { ResourceAllocation.count }, -1 do
      @project.destroy
    end
  end

  test "a person who leaves the space is no longer allocated, others stay" do
    allocation.save!
    allocation(user: @owner).save!
    @team.memberships.find_by!(user: @teammate).destroy
    assert_equal [ @owner.id ], @team.resource_allocations.pluck(:user_id)
  end

  test "weekly capacity defaults to a 40 hour week and stays within a week" do
    membership = @team.memberships.find_by!(user: @teammate)
    assert_equal 40, membership.weekly_capacity_hours
    assert membership.update(weekly_capacity_hours: 0)
    assert membership.update(weekly_capacity_hours: 22.5)
    assert_not membership.update(weekly_capacity_hours: -1)
    assert_not membership.update(weekly_capacity_hours: 169)
    assert_not membership.update(weekly_capacity_hours: nil)
  end
end
