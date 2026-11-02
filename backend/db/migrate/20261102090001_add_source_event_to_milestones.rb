# Which calendar event a milestone was copied from (see MilestoneEventMigration
# and `rails milestones:from_events`). It makes copying safe to repeat: an event
# that already has a milestone is never copied again, even after someone renames
# the milestone or moves its target date. The unique index also stops a second
# milestone for one event if two runs overlap. Deleting the event leaves the
# milestone in place with the link cleared; the column only ever records where a
# milestone came from, so it is not editable through the API.
class AddSourceEventToMilestones < ActiveRecord::Migration[7.2]
  def change
    add_reference :milestones, :source_event,
                  foreign_key: { to_table: :events, on_delete: :nullify },
                  index: { unique: true }
  end
end
