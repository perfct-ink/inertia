# The getting-started checklist's progress, kept on the server so it follows a
# person to another device or the Mac app. NULL means they never started it.
class AddOnboardingToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :onboarding, :json
  end
end
