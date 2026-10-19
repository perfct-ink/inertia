# Per-Space usage tracking: tokens spent by each run, summed per workspace.
class AddUsageToAiRuns < ActiveRecord::Migration[7.2]
  def change
    add_column :ai_runs, :input_tokens, :integer
    add_column :ai_runs, :output_tokens, :integer
  end
end
