# Copies the calendar events whose type is "milestone" into the milestones
# table, so they get progress, health and a place on the Roadmap and Gantt.
# Run it with `rails milestones:from_events` (a dry run unless APPLY=1); the
# decision behind it is in docs/features/milestones_and_rollups.md.
#
# It only ever adds milestones. The Event rows, their linked tasks and every
# existing Milestone are left exactly as they are, and it is safe to run again:
# an event is skipped when
#   - a milestone already points at it (`source_event_id`, set by an earlier
#     run, so renaming or re-dating that milestone does not cause a second copy),
#   - a milestone in the same Space has the same title and target date as the
#     event (case and surrounding spaces ignored), for example one made by hand, or
#   - an earlier event in the same run has the same Space, title and date, so
#     two identical events share one milestone.
#
# `plan` is plain Ruby over objects that respond to the attributes read below
# (an Event / Milestone record, or a Struct in a test), so the matching can be
# exercised without a database. `run` is the thin ActiveRecord layer around it.
class MilestoneEventMigration
  # An event is left alone for one of these reasons.
  ALREADY_COPIED = :already_copied     # a milestone has source_event_id == the event
  MATCHING_MILESTONE = :matching_milestone # a milestone has the same Space, title and date
  DUPLICATE_EVENT = :duplicate_event   # an earlier event in this run has the same key
  BLANK_TITLE = :blank_title           # a milestone needs a title

  Skip = Struct.new(:event_id, :reason, :milestone_id, :other_event_id, keyword_init: true)
  Plan = Struct.new(:creates, :skips, keyword_init: true)
  # `created` are new milestone ids, `failed` are { event_id:, errors: } for
  # events whose milestone did not validate, and `raced` are events another run
  # copied while this one was working.
  Result = Struct.new(:plan, :applied, :created, :failed, :raced, keyword_init: true) do
    def report
      creates = plan.creates
      lines = [ "Milestone-type events: #{creates.size + plan.skips.size}" ]
      lines << "  already have a milestone: #{plan.skips.count { |s| s.reason != BLANK_TITLE }}"
      blank = plan.skips.count { |s| s.reason == BLANK_TITLE }
      lines << "  skipped, no title: #{blank}" if blank.positive?
      lines << (applied ? "  milestones created: #{created.size}" : "  milestones to create (dry run, nothing written): #{creates.size}")
      creates.each do |attrs|
        lines << "    event #{attrs[:source_event_id]} #{attrs[:title].inspect} (#{attrs[:target_date]}) -> #{attrs[:status]}"
      end
      lines << "  copied by another run meanwhile: #{raced.size}" if raced.any?
      failed.each { |f| lines << "  FAILED event #{f[:event_id]}: #{f[:errors].join(', ')}" }
      lines.join("\n")
    end
  end

  # What the same title in two places means: case and surrounding spaces ignored.
  def self.key(workspace_id, title, date)
    [ workspace_id, title.to_s.strip.downcase, date ]
  end

  # Decides, for every event, whether it needs a milestone. `events` are the
  # milestone-type events, `milestones` every existing milestone of the same
  # Spaces. A past-dated event becomes a done milestone, so the Milestones page
  # does not show years of history as "Off track"; the rest start as planned.
  def self.plan(events, milestones, today: Date.current)
    copied = milestones.select(&:source_event_id).to_h { |m| [ m.source_event_id, m.id ] }
    taken = {}
    milestones.each { |m| taken[key(m.workspace_id, m.title, m.target_date)] ||= [ :milestone, m.id ] }

    plan = Plan.new(creates: [], skips: [])
    events.sort_by(&:id).each do |event|
      if copied.key?(event.id)
        plan.skips << Skip.new(event_id: event.id, reason: ALREADY_COPIED, milestone_id: copied[event.id])
      elsif event.title.to_s.strip.empty?
        plan.skips << Skip.new(event_id: event.id, reason: BLANK_TITLE)
      elsif (owner = taken[key(event.workspace_id, event.title, event.date)])
        plan.skips << skip_for(event.id, owner)
      else
        taken[key(event.workspace_id, event.title, event.date)] = [ :event, event.id ]
        plan.creates << attributes_for(event, today)
      end
    end
    plan
  end

  # Reads the milestone-type events (all, or one Space's) and plans the copy.
  # With `apply: true` it saves each new milestone on its own, so one that
  # fails validation is reported and the rest still go in.
  def self.run(workspace_id: nil, apply: false, today: Date.current)
    scope = workspace_id ? { workspace_id: workspace_id } : {}
    events = Event.milestone.where(scope).select(:id, :workspace_id, :folder_id, :title, :description, :date).to_a
    milestones = Milestone.where(scope).select(:id, :workspace_id, :title, :target_date, :source_event_id).to_a
    result = Result.new(plan: plan(events, milestones, today: today), applied: apply, created: [], failed: [], raced: [])
    return result unless apply

    result.plan.creates.each { |attributes| save(attributes, result) }
    result
  end

  def self.attributes_for(event, today)
    {
      workspace_id: event.workspace_id,
      folder_id: event.folder_id,
      title: event.title,
      description: event.description,
      target_date: event.date,
      status: event.date < today ? "done" : "planned",
      source_event_id: event.id
    }
  end
  private_class_method :attributes_for

  def self.skip_for(event_id, (kind, id))
    if kind == :event
      Skip.new(event_id: event_id, reason: DUPLICATE_EVENT, other_event_id: id)
    else
      Skip.new(event_id: event_id, reason: MATCHING_MILESTONE, milestone_id: id)
    end
  end
  private_class_method :skip_for

  def self.save(attributes, result)
    milestone = Milestone.new(attributes)
    # A savepoint, so a unique-index race with another run does not abort the
    # surrounding transaction.
    saved = Milestone.transaction(requires_new: true) { milestone.save }
    if saved
      result.created << milestone.id
    else
      result.failed << { event_id: attributes[:source_event_id], errors: milestone.errors.full_messages }
    end
  rescue ActiveRecord::RecordNotUnique
    result.raced << attributes[:source_event_id]
  end
  private_class_method :save
end
