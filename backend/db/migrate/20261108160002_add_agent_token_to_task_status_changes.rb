# A status change made by an agent is recorded against its token, not a person
# (changed_by stays empty). The row survives the token, with no author.
class AddAgentTokenToTaskStatusChanges < ActiveRecord::Migration[7.2]
  def change
    add_reference :task_status_changes, :agent_token, foreign_key: { on_delete: :nullify }
  end
end
