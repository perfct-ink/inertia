# Tasks made by a release plan belong to the release directly, and remember how
# many days before (negative) or after the release date they are due, so moving
# the release date moves them.
class AddReleasePlanToTasks < ActiveRecord::Migration[7.2]
  def change
    add_reference :tasks, :release, foreign_key: { on_delete: :nullify }
    add_column :tasks, :release_offset_days, :integer
  end
end
