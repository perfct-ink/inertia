require "test_helper"

class ProjectTypeTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "ptype-model-ada@example.com", password: "password123")
    @space = @user.workspace
  end

  test "a name is required, trimmed and unique in the Space ignoring case" do
    assert_not @space.project_types.build(name: " ").valid?

    type = @space.project_types.create!(name: "  Podcast season ")
    assert_equal "Podcast season", type.name
    assert_not @space.project_types.build(name: "podcast SEASON").valid?
    assert Workspace.create!(name: "Team", user: @user).project_types.build(name: "Podcast season").valid?
  end

  test "the key is custom_ and the id" do
    type = @space.project_types.create!(name: "Podcast season")
    assert_equal "custom_#{type.id}", type.key
  end

  test "built-in keys and the Space's saved types are known; anything else is not" do
    type = @space.project_types.create!(name: "Podcast season")
    other = Workspace.create!(name: "Team", user: @user)

    ProjectType::BUILT_IN.each { |key| assert ProjectType.known_key?(key, @space), key }
    assert ProjectType.known_key?(type.key, @space)
    assert_not ProjectType.known_key?(type.key, other)
    assert_not ProjectType.known_key?("custom_0", @space)
    assert_not ProjectType.known_key?("custom_", @space)
    assert_not ProjectType.known_key?("Software", @space)
    assert_not ProjectType.known_key?(nil, @space)

    assert_equal type, ProjectType.for_key(type.key, @space)
    assert_nil ProjectType.for_key("software", @space)
    assert_nil ProjectType.for_key(type.key, other)

    assert_equal "software", ProjectType.key_for("software", other)
    assert_equal type.key, ProjectType.key_for(type.key, @space)
    assert_equal "blank", ProjectType.key_for(type.key, other)
  end

  test "the template must be one a project can start from" do
    type = @space.project_types.build(name: "Odd", template: { "tasks" => [ { "title" => "" } ] })
    assert_not type.valid?
    assert_match(/needs a title/, type.errors[:template].join)

    assert @space.project_types.build(name: "Fine", template: { "tasks" => [ { "title" => "Mix" } ] }).valid?
    assert @space.project_types.build(name: "Empty").valid?
  end

  test "deleting a type returns the projects started from it to blank and leaves other projects alone" do
    type = @space.project_types.create!(name: "Podcast season")
    mine = @space.folders.create!(name: "Season 1", kind: :project, project_type: type.key)
    other = @space.folders.create!(name: "Album", kind: :project, project_type: "music_release")

    type.destroy

    assert_equal "blank", mine.reload.project_type
    assert_equal "music_release", other.reload.project_type
  end
end
