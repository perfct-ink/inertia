# Now / Next / Later placement on the roadmap board (PM-21). Nullable: an
# item with no horizon of its own is placed from its status and dates.
class AddHorizonToInitiativesAndEpics < ActiveRecord::Migration[7.2]
  def change
    add_column :initiatives, :horizon, :integer
    add_column :epics, :horizon, :integer
  end
end
