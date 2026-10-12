class AddInitiativeToEpics < ActiveRecord::Migration[7.2]
  def change
    add_reference :epics, :initiative, null: true, foreign_key: true
  end
end
