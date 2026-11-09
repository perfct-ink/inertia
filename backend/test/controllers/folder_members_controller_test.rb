require "test_helper"
require_relative "../support/folder_sharing_setup"

# Who may invite people to a folder, change their roles and remove them.
class FolderMembersControllerTest < ActionDispatch::IntegrationTest
  include FolderSharingSetup

  def members_path(folder = @launch, *rest)
    "/api/v1/folders/#{folder.id}/members#{rest.map { |r| "/#{r}" }.join}"
  end

  test "admins and owners of the Space invite an existing user by email, as a viewer unless told otherwise" do
    post members_path, params: { email: "Guest-Folder-Sharing@Example.com" }, headers: headers_for(@admin), as: :json
    assert_response :created
    body = response.parsed_body
    assert_equal [ "viewer", @guest.id, false ], body.values_at("role", "user_id", "inherited")
    assert_equal "Admin", body["invited_by"]

    post members_path, params: { email: @stranger.email, role: "editor" }, headers: headers_for(@owner), as: :json
    assert_response :created
    assert @launch.folder_memberships.find_by!(user: @stranger).editor?
  end

  test "an unknown email, an invalid role, a Space member or a duplicate is rejected" do
    post members_path, params: { email: "nobody@example.com" }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity

    post members_path, params: { email: @guest.email, role: "emperor" }, headers: headers_for(@admin), as: :json
    assert_response :created
    assert @launch.folder_memberships.find_by!(user: @guest).viewer?, "an unknown role falls back to the least privileged one"

    post members_path, params: { email: @guest.email }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity

    post members_path, params: { email: @member.email }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_match(/already in this Space/, response.parsed_body["errors"].join)
  end

  test "plain Space members and viewers cannot see or change who is invited" do
    invite(@guest, :viewer)
    get members_path, headers: headers_for(@member)
    assert_response :forbidden
    post members_path, params: { email: @stranger.email }, headers: headers_for(@member), as: :json
    assert_response :forbidden
  end

  test "someone with no access to the folder gets not found" do
    get members_path, headers: headers_for(@stranger)
    assert_response :not_found
    post members_path, params: { email: @guest.email }, headers: headers_for(@stranger), as: :json
    assert_response :not_found
  end

  test "the Root and folders in a personal Space cannot be shared" do
    post members_path(@team.root_folder), params: { email: @guest.email }, headers: headers_for(@admin), as: :json
    assert_response :forbidden

    mine = @owner.workspace.folders.create!(name: "Mine")
    post members_path(mine), params: { email: @guest.email }, headers: headers_for(@owner), as: :json
    assert_response :forbidden
  end

  test "the list shows direct and inherited invitations" do
    invite(@guest, :viewer)
    other = make_user("Other")
    invite(other, :editor, @plans)

    get members_path(@plans), headers: headers_for(@admin)
    assert_response :success
    rows = response.parsed_body.to_h { |m| [ m["user"]["name"], [ m["role"], m["folder_name"], m["inherited"] ] ] }
    assert_equal({ "Guest" => [ "viewer", "Launch", true ], "Other" => [ "editor", "Plans", false ] }, rows)
  end

  test "an invited owner manages the folder but sees nothing above their invitation" do
    owner_guest = make_user("Boss")
    invite(owner_guest, :owner, @plans)
    invite(@guest, :viewer)

    get members_path(@plans), headers: headers_for(owner_guest)
    assert_response :success
    assert_equal [ "Boss" ], response.parsed_body.map { |m| m["user"]["name"] }

    post members_path(@plans), params: { email: @stranger.email, role: "viewer" }, headers: headers_for(owner_guest), as: :json
    assert_response :created

    get members_path(@launch), headers: headers_for(owner_guest)
    assert_response :not_found
  end

  test "invited editors, commenters and viewers cannot manage" do
    %i[viewer commenter editor].each do |role|
      user = make_user("Role#{role}")
      invite(user, role)
      get members_path, headers: headers_for(user)
      assert_response :forbidden, "#{role} must not list the people"
      post members_path, params: { email: @stranger.email }, headers: headers_for(user), as: :json
      assert_response :forbidden, "#{role} must not invite"
    end
    assert_empty @launch.folder_memberships.where(user: @stranger)
  end

  test "a manager changes a role, but nobody changes their own" do
    membership = invite(@guest, :viewer)
    patch members_path(@launch, membership.id), params: { role: "editor" }, headers: headers_for(@admin), as: :json
    assert_response :success
    assert membership.reload.editor?

    patch members_path(@launch, membership.id), params: { role: "boss" }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity

    boss = make_user("Boss")
    own = invite(boss, :owner)
    patch members_path(@launch, own.id), params: { role: "viewer" }, headers: headers_for(boss), as: :json
    assert_response :unprocessable_entity
    assert own.reload.owner?
  end

  test "an inherited invitation is changed on the folder it was made on, not below it" do
    membership = invite(@guest, :viewer)
    patch members_path(@plans, membership.id), params: { role: "editor" }, headers: headers_for(@admin), as: :json
    assert_response :not_found
    assert membership.reload.viewer?
  end

  test "a manager removes someone and anyone invited can leave" do
    membership = invite(@guest, :viewer)
    delete members_path(@launch, membership.id), headers: headers_for(@stranger)
    assert_response :not_found

    delete members_path(@launch, membership.id), headers: headers_for(@member)
    assert_response :forbidden

    delete members_path(@launch, membership.id), headers: headers_for(@guest)
    assert_response :no_content

    again = invite(@guest, :viewer)
    delete members_path(@launch, again.id), headers: headers_for(@admin)
    assert_response :no_content
    assert_empty FolderMembership.where(folder_id: @launch.id)
  end

  test "an invited viewer cannot remove another invited person" do
    invite(@guest, :viewer)
    other = make_user("Other")
    theirs = invite(other, :viewer)
    delete members_path(@launch, theirs.id), headers: headers_for(@guest)
    assert_response :forbidden
    assert FolderMembership.exists?(theirs.id)
  end
end
