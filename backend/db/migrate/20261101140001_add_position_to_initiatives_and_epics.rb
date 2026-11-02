# Order among siblings on the Hierarchy page: initiatives under a milestone,
# epics under an initiative. Tasks already have a position (it is also their
# default order). Everything starts at 0, so existing rows tie and the
# Hierarchy page falls back to id until something is moved.
class AddPositionToInitiativesAndEpics < ActiveRecord::Migration[7.2]
  def change
    add_column :initiatives, :position, :integer, default: 0, null: false
    add_column :epics, :position, :integer, default: 0, null: false
  end
end
