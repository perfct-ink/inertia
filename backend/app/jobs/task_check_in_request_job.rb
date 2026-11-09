# Asks the assignees of ongoing tasks whose check-in is due (see
# TaskCheckIn.request_due!), for one person or, with no id, for everyone.
# Runs on the in-process queue, like AiWorkerRunJob. Nothing schedules it
# (the app has no cron, job runner or clock process), so it is enqueued when
# a person opens their inbox; `rails check_ins:request` asks everyone.
class TaskCheckInRequestJob < ApplicationJob
  queue_as :default

  def perform(user_id = nil)
    assignee = user_id && User.find_by(id: user_id)
    return if user_id && assignee.nil?
    TaskCheckIn.request_due!(assignee: assignee)
  end
end
