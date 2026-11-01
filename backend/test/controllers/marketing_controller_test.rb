require "test_helper"

class MarketingControllerTest < ActionDispatch::IntegrationTest
  test "the home page sends a signed-in visitor to the app at /space" do
    get "/"

    assert_response :success
    assert_includes response.body, "window.location.replace('/space')"
  end

  test "the home page forwards a pre-clean-URL /#/route link to its path" do
    get "/"

    assert_includes response.body, "window.location.replace(hash.slice(1))"
  end

  test "the other marketing pages carry no app redirect" do
    get "/features"

    assert_response :success
    assert_not_includes response.body, "inertia-auth"
  end

  test "robots.txt keeps crawlers out of the app paths" do
    get "/robots.txt"

    assert_response :success
    assert_includes response.body, "Disallow: /space"
    assert_includes response.body, "Disallow: /shared"
  end
end
