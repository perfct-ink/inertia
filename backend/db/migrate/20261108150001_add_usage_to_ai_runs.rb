# Per-Space usage tracking: the tokens each AI run cost, summed per workspace
# through ai_runs.workspace_id. Nullable: a run that never reached the model
# (no client configured, queued) has no counts. Rollback just drops the columns.
class AddUsageToAiRuns < ActiveRecord::Migration[7.2]
  def change
    add_column :ai_runs, :input_tokens, :integer
    add_column :ai_runs, :output_tokens, :integer
  end
end
