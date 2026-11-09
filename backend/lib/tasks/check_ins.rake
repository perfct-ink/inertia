namespace :check_ins do
  desc "Ask the assignees of each ongoing task whose check-in is due (nothing schedules this yet; see docs/features/ongoing_tasks.md)"
  task request: :environment do
    puts "Asked about #{TaskCheckIn.request_due!} ongoing tasks"
  end
end
