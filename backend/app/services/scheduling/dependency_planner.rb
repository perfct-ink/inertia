module Scheduling
  # What moving one task's dates does to the rest of its dependency chain,
  # under a folder's dependency mode (PM-14). Plain Ruby over anything that
  # responds to the few readers below, so it needs no database to run. The
  # same rules as `planReschedule` in frontend/src/data/dependency.ts: change
  # both together.
  #
  # none     - just the moved task.
  # strict   - refuse when any link touching it would end up broken.
  # flexible - the moved task goes where it was put, and what waits on it
  #            (transitively) follows: pushed later, keeping its length, only
  #            as far as needed to satisfy its link; or pulled earlier by the
  #            same amount, but only when it was sitting exactly on its link
  #            before the move (a deliberate gap is left alone) and never past
  #            what its other links allow.
  #
  # A link is satisfied when the successor's linked side is on or after the
  # predecessor's (finish to start allows the same day). Undated tasks are
  # ignored; a task with only a due date counts as starting that day.
  #
  # tasks:        #id, #title, #start_date, #due_date (Date or nil)
  # dependencies: #predecessor_id, #successor_id, #kind (finish_to_start, ...)
  class DependencyPlanner
    Span = Struct.new(:start, :finish)
    Update = Struct.new(:id, :start_date, :due_date)
    Plan = Struct.new(:updates, :error, keyword_init: true)

    # Which end of each bar a link connects: finish_to_start runs from the
    # predecessor's finish to the successor's start, and so on.
    def self.sides(kind)
      from, to = kind.to_s.split("_to_")
      [ from == "start" ? :start : :finish, to == "start" ? :start : :finish ]
    end

    def initialize(tasks, dependencies)
      @titles = tasks.to_h { |t| [ t.id, t.title || "##{t.id}" ] }
      @dependencies = dependencies.to_a
      @was = tasks.select(&:due_date).to_h { |t| [ t.id, Span.new(t.start_date || t.due_date, t.due_date) ] }
    end

    def plan(task_id, start_date, due_date, mode)
      @now = @was.dup
      @now[task_id] = Span.new(start_date, due_date)
      moved = { task_id => @now[task_id] }

      case mode.to_s
      when "strict"
        broken = @dependencies.find { |d| (d.predecessor_id == task_id || d.successor_id == task_id) && days_late(d).to_i > 0 }
        return Plan.new(updates: [], error: broken_message(broken)) if broken
      when "flexible"
        cascade(task_id, moved)
      end

      Plan.new(updates: moved.map { |id, span| Update.new(id, span.start, span.finish) })
    end

    private

    def cascade(task_id, moved)
      queue = [ task_id ]
      guard = @dependencies.size * @was.size + 1
      until queue.empty? || guard <= 0
        guard -= 1
        current = queue.shift
        @dependencies.select { |d| d.predecessor_id == current }.each do |dep|
          span = @now[dep.successor_id]
          late = days_late(dep).to_i
          shift = late > 0 ? late : days_to_pull(dep)
          next if span.nil? || shift.zero?

          shifted = Span.new(span.start + shift, span.finish + shift)
          @now[dep.successor_id] = moved[dep.successor_id] = shifted
          queue << dep.successor_id
        end
      end
    end

    # Days the successor must move later for this link to hold (negative: it
    # already has that many days to spare). nil when either task is undated.
    def days_late(dep)
      pred = @now[dep.predecessor_id]
      succ = @now[dep.successor_id]
      return unless pred && succ
      from, to = self.class.sides(dep.kind)
      (pred[from] - succ[to]).to_i
    end

    # Days (negative) the successor follows its predecessor earlier. Only a
    # link that was exactly tight before the move, whose predecessor side has
    # now moved earlier, pulls; and not further than the successor's other
    # links allow. 0 when the successor should stay where it is.
    def days_to_pull(dep)
      pred_was = @was[dep.predecessor_id]
      succ_was = @was[dep.successor_id]
      pred_now = @now[dep.predecessor_id]
      return 0 unless pred_was && succ_was && pred_now
      from, to = self.class.sides(dep.kind)
      return 0 unless succ_was[to] == pred_was[from] && pred_now[from] < pred_was[from]

      floor = @dependencies.select { |d| d.successor_id == dep.successor_id }.filter_map { |d| days_late(d) }.max
      floor < 0 ? floor : 0
    end

    def broken_message(dep)
      %(That would break the dependency of "#{@titles[dep.successor_id]}" on "#{@titles[dep.predecessor_id]}".)
    end
  end
end
