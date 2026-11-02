# A shared Space with one folder tree and the people around it, for the
# folder collaboration tests:
#
#   Team Space (not personal)         owner (owner), admin (admin), member (member)
#     Root
#       Launch    <- @guest is invited here as an editor (the tests change the role)
#         Plans
#       Private   <- never shared
#
# `stranger` is in no Space and has no invitation. Include in a test class and
# call nothing: the setup and teardown are registered when it is included.
module FolderSharingSetup
  def self.included(base)
    base.setup { build_sharing_world }
    base.teardown { ENV["BYPASS_AUTH"] = @previous_bypass }
  end

  def build_sharing_world
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = make_user("Owner")
    @admin = make_user("Admin")
    @member = make_user("Member")
    @guest = make_user("Guest")
    @stranger = make_user("Stranger")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @admin, role: :admin)
    @team.memberships.create!(user: @member, role: :member)
    @launch = @team.folders.create!(name: "Launch")
    @plans = @team.folders.create!(name: "Plans", parent: @launch)
    @private = @team.folders.create!(name: "Private")
    @brief = @launch.documents.create!(title: "Brief", created_by: @owner)
    @plan_doc = @plans.documents.create!(title: "Plan", created_by: @owner)
    @secret = @private.documents.create!(title: "Secret", created_by: @owner)
    @brief_task = @team.tasks.create!(title: "Write brief", document: @brief)
    @folder_task = @team.tasks.create!(title: "Book venue", folder: @plans)
    @secret_task = @team.tasks.create!(title: "Hide it", document: @secret)
  end

  def make_user(name)
    User.create!(name: name, email: "#{name.downcase}-folder-sharing@example.com", password: "password123")
  end

  def invite(user, role, folder = @launch)
    folder.folder_memberships.create!(user: user, role: role, invited_by: @owner)
  end

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end
end
