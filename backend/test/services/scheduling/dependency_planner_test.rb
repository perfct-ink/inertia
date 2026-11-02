require "test_helper"

class SchedulingDependencyPlannerTest < ActiveSupport::TestCase
  Item = Struct.new(:id, :title, :start_date, :due_date)
  Link = Struct.new(:predecessor_id, :successor_id, :kind)

  def task(id, start, finish)
    Item.new(id, "T#{id}", Date.parse(start), Date.parse(finish))
  end

  def link(from, to, kind = "finish_to_start")
    Link.new(from, to, kind)
  end

  def updates(plan)
    plan.updates.map { |u| [ u.id, u.start_date.to_s, u.due_date.to_s ] }
  end

  def plan(tasks, links, id, start, finish, mode)
    Scheduling::DependencyPlanner.new(tasks, links).plan(id, Date.parse(start), Date.parse(finish), mode)
  end

  # 1 -> 2 -> 3, each finish to start, laid end to end.
  setup do
    @tasks = [ task(1, "2026-01-01", "2026-01-05"), task(2, "2026-01-05", "2026-01-08"), task(3, "2026-01-08", "2026-01-10") ]
    @chain = [ link(1, 2), link(2, 3) ]
  end

  test "link sides follow the kind name" do
    assert_equal [ :finish, :start ], Scheduling::DependencyPlanner.sides("finish_to_start")
    assert_equal [ :start, :finish ], Scheduling::DependencyPlanner.sides(:start_to_finish)
  end

  test "none moves only the task" do
    result = plan(@tasks, @chain, 1, "2026-01-10", "2026-01-15", "none")
    assert_nil result.error
    assert_equal [ [ 1, "2026-01-10", "2026-01-15" ] ], updates(result)
  end

  test "strict refuses a move that breaks a link, in either direction" do
    assert_match(/break the dependency of "T2" on "T1"/, plan(@tasks, @chain, 1, "2026-01-02", "2026-01-06", "strict").error)
    assert plan(@tasks, @chain, 2, "2026-01-03", "2026-01-06", "strict").error
    result = plan(@tasks, @chain, 1, "2025-12-30", "2026-01-04", "strict")
    assert_nil result.error
    assert_equal [ [ 1, "2025-12-30", "2026-01-04" ] ], updates(result)
  end

  test "flexible pushes dependants later by the shortfall, keeping their length" do
    result = plan(@tasks, @chain, 1, "2026-01-03", "2026-01-07", "flexible")
    assert_equal [
      [ 1, "2026-01-03", "2026-01-07" ],
      [ 2, "2026-01-07", "2026-01-10" ],
      [ 3, "2026-01-10", "2026-01-12" ]
    ], updates(result)
  end

  test "flexible pulls dependants that were on their link earlier with the task" do
    result = plan(@tasks, @chain, 1, "2025-12-28", "2026-01-02", "flexible")
    assert_equal [
      [ 1, "2025-12-28", "2026-01-02" ],
      [ 2, "2026-01-02", "2026-01-05" ],
      [ 3, "2026-01-05", "2026-01-07" ]
    ], updates(result)
  end

  test "flexible leaves a deliberate gap alone when the task moves earlier" do
    tasks = [ task(1, "2026-01-01", "2026-01-05"), task(2, "2026-01-07", "2026-01-09") ]
    result = plan(tasks, [ link(1, 2) ], 1, "2025-12-28", "2026-01-02", "flexible")
    assert_equal [ [ 1, "2025-12-28", "2026-01-02" ] ], updates(result)
  end

  test "flexible leaves dependants that still fit alone" do
    tasks = [ task(1, "2026-01-01", "2026-01-05"), task(2, "2026-01-07", "2026-01-09") ]
    result = plan(tasks, [ link(1, 2) ], 1, "2026-01-02", "2026-01-06", "flexible")
    assert_equal [ [ 1, "2026-01-02", "2026-01-06" ] ], updates(result)
  end

  test "flexible only pulls on the side the link uses" do
    # Finish to start follows the finish, so starting earlier alone moves nothing else.
    result = plan(@tasks, @chain, 1, "2025-12-28", "2026-01-05", "flexible")
    assert_equal [ [ 1, "2025-12-28", "2026-01-05" ] ], updates(result)
  end

  test "a pulled dependant stops where its other links allow" do
    # 3 sits on 1's finish and has a day to spare after 2's finish.
    tasks = [ task(1, "2026-01-01", "2026-01-05"), task(2, "2026-01-01", "2026-01-04"), task(3, "2026-01-05", "2026-01-08") ]
    result = plan(tasks, [ link(1, 3), link(2, 3) ], 1, "2025-12-28", "2026-01-02", "flexible")
    assert_equal [ [ 1, "2025-12-28", "2026-01-02" ], [ 3, "2026-01-04", "2026-01-07" ] ], updates(result)
  end

  test "start to start compares starts" do
    tasks = [ task(1, "2026-01-01", "2026-01-05"), task(2, "2026-01-01", "2026-01-03") ]
    result = plan(tasks, [ link(1, 2, "start_to_start") ], 1, "2026-01-04", "2026-01-08", "flexible")
    assert_equal [ [ 1, "2026-01-04", "2026-01-08" ], [ 2, "2026-01-04", "2026-01-06" ] ], updates(result)

    pulled = plan(tasks, [ link(1, 2, "start_to_start") ], 1, "2025-12-29", "2026-01-02", "flexible")
    assert_equal [ [ 1, "2025-12-29", "2026-01-02" ], [ 2, "2025-12-29", "2025-12-31" ] ], updates(pulled)
  end

  test "undated tasks are ignored and a task with only a due date starts that day" do
    tasks = [ task(1, "2026-01-01", "2026-01-05"), Item.new(2, "T2", nil, nil), Item.new(3, "T3", nil, Date.new(2026, 1, 6)) ]
    result = plan(tasks, [ link(1, 2), link(1, 3) ], 1, "2026-01-04", "2026-01-09", "flexible")
    assert_equal [ [ 1, "2026-01-04", "2026-01-09" ], [ 3, "2026-01-09", "2026-01-09" ] ], updates(result)
  end

  test "a loop that slipped in cannot hang the planner" do
    result = plan(@tasks, @chain + [ link(3, 1) ], 1, "2026-01-03", "2026-01-07", "flexible")
    assert_nil result.error
    assert_equal 3, updates(result).size
  end
end
