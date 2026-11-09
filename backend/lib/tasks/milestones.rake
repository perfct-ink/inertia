namespace :milestones do
  desc "Copy milestone-type calendar events into milestones. Dry run unless APPLY=1; WORKSPACE_ID=n limits it to one Space"
  task from_events: :environment do
    # Name the database first, so a run against the wrong one is obvious before
    # anything is written (the password is never printed).
    db = ActiveRecord::Base.connection_db_config.configuration_hash
    puts "Database: #{db[:database]} on #{db[:host] || 'a local socket'} (Rails #{Rails.env})"

    result = MilestoneEventMigration.run(
      workspace_id: ENV["WORKSPACE_ID"].presence,
      apply: ENV["APPLY"] == "1"
    )
    puts result.report
    puts "Dry run: run again with APPLY=1 to create these milestones." if !result.applied && result.plan.creates.any?
    abort "Some events could not be copied; see FAILED above." if result.failed.any?
  end
end
