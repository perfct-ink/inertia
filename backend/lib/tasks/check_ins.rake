namespace :check_ins do
  desc "Ask the assignee of each ongoing task whose update is due (schedule this daily)"
  task request: :environment do
    puts "Asked #{TaskCheckIn.request_due!} people for an update"
  end
end
