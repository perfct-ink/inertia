require "test_helper"

class PathResolverTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Resolver", email: "path-resolver@example.com", password: "password123")
    @mine = @user.workspace
    @studio = Workspace.create!(name: "Studio", user: @user)
    @agency = Workspace.create!(name: "Agency", user: @user)
    @stranger_space = Workspace.create!(name: "Private", user: User.create!(name: "Else", email: "path-resolver-else@example.com", password: "password123"))
    [ @mine, @studio, @agency, @stranger_space ].each { |space| space.folders.create!(name: "Product") }
    @studio.folders.create!(name: "Studio only")
  end

  def product_in(space)
    space.folders.find_by!(slug: "product")
  end

  test "finds the item in the preferred Space first" do
    match = PathResolver.find_across([ @mine, @studio, @agency ], %w[product], preferred: @agency)

    assert_equal @agency, match.workspace
    assert_equal product_in(@agency), match.item
  end

  test "without a preferred Space the lowest id wins, whatever order they are given in" do
    match = PathResolver.find_across([ @agency, @studio, @mine ], %w[product])

    assert_equal [ @mine, @studio, @agency ].min_by(&:id), match.workspace
  end

  test "falls through to the other Spaces, lowest id first, when the preferred one does not hold the path" do
    match = PathResolver.find_across([ @agency, @mine, @studio ], %w[studio-only], preferred: @agency)

    assert_equal @studio, match.workspace
  end

  test "an old path counts as a hit in its own Space before the next Space is tried" do
    renamed = product_in(@studio)
    renamed.update!(name: "Goods")

    match = PathResolver.find_across([ @mine, @studio ], %w[product], preferred: @studio)

    assert_equal @studio, match.workspace
    assert_equal renamed, match.item
  end

  test "looks only in the Spaces it is given" do
    secret = @stranger_space.folders.create!(name: "Secret")

    assert_nil PathResolver.find_across([ @mine, @studio, @agency ], %w[secret], preferred: @mine)
    assert_equal secret, PathResolver.find_across([ @stranger_space ], %w[secret]).item
  end

  test "nothing found is nil, also for an empty path or no Spaces" do
    assert_nil PathResolver.find_across([ @mine, @studio ], %w[nope])
    assert_nil PathResolver.find_across([ @mine, @studio ], [])
    assert_nil PathResolver.find_across([], %w[product])
  end
end
